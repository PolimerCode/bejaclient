import { ChildProcess } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

class Log4jParser {
  private buf = ''

  feed(chunk: string, onLine: (l: string) => void): void {
    this.buf += chunk
    let safety = 0
    while (safety++ < 500) {
      const xs = this.buf.indexOf('<log4j:Event')
      if (xs === -1) {
        const nl = this.buf.lastIndexOf('\n')
        if (nl >= 0) { this.buf.slice(0, nl).split('\n').filter(Boolean).forEach(onLine); this.buf = this.buf.slice(nl + 1) }
        break
      }
      if (xs > 0) { this.buf.slice(0, xs).split('\n').filter(Boolean).forEach(onLine); this.buf = this.buf.slice(xs) }
      const xe = this.buf.indexOf('</log4j:Event>')
      if (xe === -1) break
      const xml = this.buf.slice(0, xe + 14)
      this.buf = this.buf.slice(xe + 14)
      const lvl    = xml.match(/level="([^"]+)"/)?.[1] ?? 'INFO'
      const thread = xml.match(/thread="([^"]+)"/)?.[1] ?? 'main'
      const logger = (xml.match(/logger="([^"]+)"/)?.[1] ?? '').split('.').pop() ?? 'MC'
      const msg    = xml.match(/<log4j:Message><!\[CDATA\[([\s\S]*?)\]\]><\/log4j:Message>/)?.[1]?.trim()
      const trace  = xml.match(/<log4j:Throwable><!\[CDATA\[([\s\S]*?)\]\]><\/log4j:Throwable>/)?.[1]
      if (msg) onLine(`[${thread}/${lvl}] (${logger}) ${msg}`)
      if (trace) trace.split('\n').filter(Boolean).forEach(l => onLine(`  ${l.trim()}`))
    }
  }

  reset(): void { this.buf = '' }
}
import { getSettings } from './settingsService'
import { getProfile, updateProfile, type LaunchProfile } from './profileService'
import { getSelectedAccount, refreshAccount } from './authService'
import { checkAndUpdateClientJar, resolveAdapterJar, resolveBootstrapJar } from './clientUpdateService'

function removeBejaModJars(gameDir: string, onLog: (line: string) => void): void {
  const modsDir = join(gameDir, 'mods')
  if (!existsSync(modsDir)) return
  // Remove legacy bejaclient-*.jar dropped in mods/ (BejaClient runs as agent, not a mod)
  const stale = readdirSync(modsDir).filter(
    f => f.startsWith('bejaclient-') && f.endsWith('.jar')
  )
  for (const f of stale) {
    try {
      unlinkSync(join(modsDir, f))
      onLog(`[BejaClient] Removed stale mod JAR: ${f}`)
    } catch { /* ignore */ }
  }
}

function resolveVersionId(mcVersion: string, loader: string, gameDir: string): string {
  if (loader === 'vanilla') return mcVersion
  const versionsDir = join(gameDir, 'versions')
  if (!existsSync(versionsDir)) return mcVersion
  const dirs = readdirSync(versionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
  const loaderKey = loader === 'neoforge' ? 'neoforge' : loader
  const match = dirs.find(id =>
    id.includes(mcVersion) && id.toLowerCase().includes(loaderKey.toLowerCase())
  )
  return match ?? mcVersion
}

function buildJvmArgs(profile: LaunchProfile): string[] {
  const args: string[] = profile.jvmArgs ? profile.jvmArgs.split(' ').filter(Boolean) : []

  if (profile.useBejaClient) {
    const bootstrapJar = resolveBootstrapJar()
    if (bootstrapJar) {
      args.unshift(`-javaagent:${bootstrapJar}=${profile.version}`)
      console.log(`[BejaBootstrap] Injecting: ${bootstrapJar} (MC ${profile.version})`)
    } else {
      console.warn('[BejaBootstrap] Bootstrap JAR not found — client will launch without BejaClient.')
    }
  }

  return args
}

let activeProcess: ChildProcess | null = null
let sessionStartTime: number | null = null

export function isRunning(): boolean {
  return activeProcess !== null && !activeProcess.killed
}

export async function launchGame(
  profileId: string,
  onLog: (line: string) => void,
  onStatus: (status: string) => void,
  extraMCArgs?: string[],
): Promise<void> {
  if (isRunning()) throw new Error('Game is already running')

  const profile = getProfile(profileId)
  if (!profile) throw new Error(`Profile ${profileId} not found`)

  let account = getSelectedAccount()
  if (!account) throw new Error('No account selected. Please log in first.')

  if (account.tokenExpiry < Date.now() + 60000) {
    onStatus('Refreshing authentication...')
    const refreshed = await refreshAccount(account.id)
    if (!refreshed) throw new Error('Failed to refresh account. Please log in again.')
    account = refreshed
  }

  const settings = getSettings()
  const javaPath = profile.javaPath || settings.game.defaultJavaPath || 'java'
  const gameDir = profile.gameDir || settings.game.defaultGameDir

  onLog(`[Launcher] Profile: ${profile.name} | ${profile.version} | ${profile.loader} | BejaClient: ${profile.useBejaClient}`)
  onLog(`[Launcher] Java: ${javaPath} | Game dir: ${gameDir}`)

  await checkAndUpdateClientJar(onLog, onStatus)

  const { launch } = await import('@xmcl/core')

  onStatus('starting')

  const versionId = resolveVersionId(profile.version, profile.loader, gameDir)
  onLog(`[Launcher] Version ID: ${versionId}`)

  // Always purge any leftover bejaclient mod JARs — BejaClient runs as a Java agent, not a mod
  removeBejaModJars(gameDir, onLog)

  // Stage adapter JAR into mods/ so Fabric Loader always picks it up on its classpath.
  // fabric.addMods is unreliable in Fabric Loader 0.18.6+; mods/ is always scanned.
  const modsDir = join(gameDir, 'mods')
  const adapterTempPath = join(modsDir, 'beja-adapter-loader.jar')
  if (existsSync(adapterTempPath)) {
    try { unlinkSync(adapterTempPath) } catch { /* ignore */ }
  }
  let adapterWasStaged = false
  if (profile.useBejaClient) {
    const adapterJar = resolveAdapterJar(profile.version)
    if (adapterJar) {
      try {
        if (!existsSync(modsDir)) mkdirSync(modsDir, { recursive: true })
        copyFileSync(adapterJar, adapterTempPath)
        adapterWasStaged = true
        onLog(`[BejaClient] Staged adapter JAR → mods/beja-adapter-loader.jar`)
      } catch (err) {
        throw new Error(`Failed to stage adapter JAR: ${String(err)}`)
      }
    } else {
      onLog('[BejaClient] Adapter JAR not found — BejaHooks calls may fail.')
    }
  }

  const proc = await launch({
    gamePath: gameDir,
    resourcePath: gameDir,
    javaPath,
    version: versionId,
    accessToken: account.accessToken,
    gameProfile: {
      id: account.uuid.replace(/-/g, ''),
      name: account.username,
    },
    minMemory: profile.minRam,
    maxMemory: profile.maxRam,
    extraJVMArgs: buildJvmArgs(profile),
    extraMCArgs,
    resolution: {
      width: profile.resolution.width,
      height: profile.resolution.height,
      fullscreen: false,
    },
  })

  activeProcess = proc
  sessionStartTime = Date.now()
  onStatus('running')

  const log4j = new Log4jParser()
  proc.stdout?.setEncoding('utf-8')
  proc.stderr?.setEncoding('utf-8')
  proc.stdout?.on('data', (data: string) => log4j.feed(data, onLog))
  proc.stderr?.on('data', (data: string) => {
    data.split('\n').filter(Boolean).forEach(line => onLog(`[ERR] ${line}`))
  })

  let exitCode: number | null = null
  proc.on('exit', code => { exitCode = code ?? 0 })
  proc.on('close', () => {
    if (adapterWasStaged && existsSync(adapterTempPath)) {
      try { unlinkSync(adapterTempPath) } catch { /* ignore */ }
    }
    // Track playtime and update lastPlayed
    const sessionMs = sessionStartTime ? Date.now() - sessionStartTime : 0
    sessionStartTime = null
    try {
      const p = getProfile(profileId)
      if (p) {
        updateProfile(profileId, {
          lastPlayed: new Date().toISOString(),
          playtimeMs: (p.playtimeMs ?? 0) + sessionMs,
        })
      }
    } catch { /* non-fatal */ }
    activeProcess = null
    onStatus(`stopped:${exitCode ?? 0}`)
  })
}

export function killGame(): void {
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill()
    activeProcess = null
  }
}
