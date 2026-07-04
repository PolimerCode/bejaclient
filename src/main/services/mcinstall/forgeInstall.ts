import { spawn } from 'child_process'
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync, openSync, readSync, closeSync } from 'fs'
import { join } from 'path'
import * as https from 'https'
import { downloadFile } from './downloader'

// Reimplemented locally (mirrors clientUpdateService.ts's hasValidZipEnd) — mcinstall
// must not depend on the launcher's top-level services, only the other direction.
function hasValidZipEnd(filePath: string): boolean {
  try {
    const stat = statSync(filePath)
    if (stat.size < 22) return false
    const bufSize = Math.min(stat.size, 4096)
    const buf = Buffer.alloc(bufSize)
    const fd = openSync(filePath, 'r')
    try {
      readSync(fd, buf, 0, bufSize, stat.size - bufSize)
    } finally {
      closeSync(fd)
    }
    for (let i = buf.length - 22; i >= 0; i--) {
      if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) return true
    }
    return false
  } catch {
    return false
  }
}

function installerCacheDir(gameDir: string): string {
  const dir = join(gameDir, '.bejaclient', 'installers')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function listVersionDirs(gameDir: string): Set<string> {
  const versionsDir = join(gameDir, 'versions')
  if (!existsSync(versionsDir)) return new Set()
  return new Set(readdirSync(versionsDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name))
}

async function runInstallerJar(
  installerJarPath: string,
  gameDir: string,
  javaPath: string,
  onLog: (line: string) => void,
): Promise<string> {
  if (!hasValidZipEnd(installerJarPath)) {
    try { unlinkSync(installerJarPath) } catch { /* ignore */ }
    throw new Error('Downloaded installer jar is corrupted (truncated download) — retry the install.')
  }

  const before = listVersionDirs(gameDir)

  const exitCode = await new Promise<number>((resolve, reject) => {
    const proc = spawn(javaPath, ['-jar', installerJarPath, '--installClient', gameDir], { cwd: gameDir })
    let tail = ''
    const capture = (chunk: Buffer) => {
      const text = chunk.toString('utf-8')
      tail = (tail + text).slice(-4000)
      text.split('\n').filter(Boolean).forEach(line => onLog(line.trimEnd()))
    }
    proc.stdout.on('data', capture)
    proc.stderr.on('data', capture)
    proc.on('error', reject)
    proc.on('close', code => resolve(code ?? 1))
  })

  const after = listVersionDirs(gameDir)
  const newVersions = [...after].filter(id => !before.has(id))

  if (exitCode !== 0 || newVersions.length === 0) {
    throw new Error(
      `Installer exited with code ${exitCode} and produced ${newVersions.length} new version folder(s). ` +
      `Check the log above for the underlying Java error.`,
    )
  }

  return newVersions[0]
}

export async function installForge(
  mcVersion: string,
  forgeVersion: string,
  gameDir: string,
  javaPath: string,
  onLog: (line: string) => void,
): Promise<string> {
  const url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVersion}-${forgeVersion}/forge-${mcVersion}-${forgeVersion}-installer.jar`
  const dest = join(installerCacheDir(gameDir), `forge-${mcVersion}-${forgeVersion}-installer.jar`)
  await downloadFile(url, dest)
  return runInstallerJar(dest, gameDir, javaPath, onLog)
}

export async function installNeoForge(
  mcVersion: string,
  neoforgeVersion: string,
  gameDir: string,
  javaPath: string,
  onLog: (line: string) => void,
): Promise<string> {
  const url = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoforgeVersion}/neoforge-${neoforgeVersion}-installer.jar`
  const dest = join(installerCacheDir(gameDir), `neoforge-${neoforgeVersion}-installer.jar`)
  await downloadFile(url, dest)
  return runInstallerJar(dest, gameDir, javaPath, onLog)
}

function httpsGetText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { timeout: 15000 }, res => {
        let data = ''
        res.on('data', (c: string) => (data += c))
        res.on('end', () => resolve(data))
        res.on('error', reject)
      })
      .on('error', reject)
      .on('timeout', () => reject(new Error(`Timed out fetching ${url}`)))
  })
}

/**
 * NeoForge versions are bare (e.g. "21.1.235"), not MC-prefixed like Forge's
 * promotions_slim.json. Convention (NeoForge project, not derivable generically):
 * version "X.Y.*" supports MC "1.X.Y" (e.g. 21.1.* <-> 1.21.1). Empty result for
 * an unsupported MC version is a legitimate case, not an error.
 */
export async function listNeoForgeVersions(mcVersion: string): Promise<string[]> {
  const match = mcVersion.match(/^1\.(\d+)(?:\.(\d+))?$/)
  if (!match) return []
  const major = match[1]
  const minor = match[2] ?? '0'
  const prefix = `${major}.${minor}.`

  const xml = await httpsGetText('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml')
  const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map(m => m[1])
  return versions.filter(v => v.startsWith(prefix))
}
