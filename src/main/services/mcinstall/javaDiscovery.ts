import { execFile } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface JavaInfo {
  path: string
  version: string
  majorVersion: number
  arch?: string
}

function globJavaBin(baseDirs: string[], binRelative: string): string[] {
  const found: string[] = []
  for (const base of baseDirs) {
    if (!existsSync(base)) continue
    try {
      for (const entry of readdirSync(base, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const candidate = join(base, entry.name, binRelative)
        if (existsSync(candidate)) found.push(candidate)
      }
    } catch { /* ignore unreadable dirs */ }
  }
  return found
}

async function queryWindowsRegistry(): Promise<string[]> {
  const keys = [
    'HKLM\\SOFTWARE\\JavaSoft\\JDK',
    'HKLM\\SOFTWARE\\JavaSoft\\Java Development Kit',
    'HKLM\\SOFTWARE\\WOW6432Node\\JavaSoft\\JDK',
    'HKLM\\SOFTWARE\\WOW6432Node\\JavaSoft\\Java Development Kit',
    'HKCU\\SOFTWARE\\JavaSoft\\JDK',
  ]
  const found: string[] = []
  for (const key of keys) {
    try {
      const { stdout } = await execFileAsync('reg', ['query', key, '/s', '/v', 'JavaHome'], { timeout: 5000 })
      for (const match of stdout.matchAll(/JavaHome\s+REG_SZ\s+(.+)/g)) {
        const home = match[1].trim()
        const candidate = join(home, 'bin', 'java.exe')
        if (existsSync(candidate)) found.push(candidate)
      }
    } catch { /* key not present — normal, not every JDK registers here */ }
  }
  return found
}

async function getWindowsCandidates(): Promise<string[]> {
  const candidates: string[] = []

  try {
    const { stdout } = await execFileAsync('where', ['java'], { timeout: 5000 })
    candidates.push(...stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean))
  } catch { /* java not on PATH — fine */ }

  candidates.push(...await queryWindowsRegistry())

  candidates.push(...globJavaBin([
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Zulu',
    'C:\\Program Files (x86)\\Java',
  ], join('bin', 'java.exe')))

  if (process.env.JAVA_HOME) {
    const candidate = join(process.env.JAVA_HOME, 'bin', 'java.exe')
    if (existsSync(candidate)) candidates.push(candidate)
  }

  return candidates
}

async function getLinuxCandidates(): Promise<string[]> {
  const candidates: string[] = []

  try {
    const { stdout } = await execFileAsync('which', ['java'], { timeout: 5000 })
    candidates.push(stdout.trim())
  } catch { /* not on PATH */ }

  try {
    const { stdout } = await execFileAsync('update-alternatives', ['--list', 'java'], { timeout: 5000 })
    candidates.push(...stdout.split('\n').map(l => l.trim()).filter(Boolean))
  } catch { /* update-alternatives not present/no entries — fine */ }

  candidates.push(...globJavaBin(['/usr/lib/jvm'], join('bin', 'java')))

  if (process.env.JAVA_HOME) {
    const candidate = join(process.env.JAVA_HOME, 'bin', 'java')
    if (existsSync(candidate)) candidates.push(candidate)
  }

  return candidates
}

async function getMacCandidates(): Promise<string[]> {
  const candidates: string[] = []
  try {
    const { stdout } = await execFileAsync('/usr/libexec/java_home', ['-V'], { timeout: 5000 })
    for (const match of stdout.matchAll(/(\/Library\/Java\/JavaVirtualMachines\/\S+\/Contents\/Home)/g)) {
      const candidate = join(match[1], 'bin', 'java')
      if (existsSync(candidate)) candidates.push(candidate)
    }
  } catch { /* java_home not present */ }
  candidates.push(...globJavaBin(['/Library/Java/JavaVirtualMachines'], join('Contents', 'Home', 'bin', 'java')))
  return candidates
}

function parseJavaVersionOutput(path: string, output: string): JavaInfo | null {
  const versionMatch = output.match(/version "([^"]+)"/)
  if (!versionMatch) return null
  const version = versionMatch[1]

  let majorVersion: number
  if (version.startsWith('1.')) {
    // Legacy Java 8 and earlier report "1.8.0_392" — major version is the 2nd component.
    majorVersion = parseInt(version.split('.')[1] ?? '0', 10)
  } else {
    majorVersion = parseInt(version.split('.')[0] ?? '0', 10)
  }
  if (!majorVersion) return null

  const archMatch = output.match(/(64|32)-Bit/)
  return { path, version, majorVersion, arch: archMatch ? `${archMatch[1]}-bit` : undefined }
}

async function probeJava(path: string): Promise<JavaInfo | null> {
  try {
    // Java prints version info to stderr, not stdout.
    const { stderr, stdout } = await execFileAsync(path, ['-version'], { timeout: 5000 })
    return parseJavaVersionOutput(path, stderr || stdout)
  } catch {
    return null
  }
}

/** Enumerates local Java installations. Zero-arg — does its own candidate discovery. */
export async function scanLocalJava(): Promise<JavaInfo[]> {
  const platform = process.platform
  const candidates = platform === 'win32'
    ? await getWindowsCandidates()
    : platform === 'darwin'
      ? await getMacCandidates()
      : await getLinuxCandidates()

  const uniquePaths = [...new Set(candidates.map(p => p.trim()).filter(Boolean))]
  const results = await Promise.all(uniquePaths.map(probeJava))
  return results.filter((r): r is JavaInfo => r !== null)
}
