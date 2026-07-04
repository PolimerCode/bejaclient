import { ChildProcess } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import {
  resolveVersion,
  readVersionJsonChain,
  getCurrentPlatform,
  resolveLibraries,
  downloadLibraries,
  extractNatives,
  buildClasspath,
  assembleCommand,
  spawnGame,
  listQuiltVersions,
  listNeoForgeVersions,
  type ArgContext,
} from './mcinstall'

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
import { checkAndUpdateClientJar, resolveAdapterJar, resolveBootstrapJar, hasValidZipEnd } from './clientUpdateService'
import { ensureCoreMods } from './coreModsService'
import { patchOptionsFile } from './optionsService'
import { installVersion, listFabricVersions, listForgeVersions } from './versionService'
import { analyzeCrashLog } from './crashAnalyzer'
import { enforceModCompatibility } from './modCompatibilityChecker'

const CORE_MOD_SLUGS = ['sodium', 'lithium', 'ferritecore']

// Staged names use beja-core- prefix so removeBejaModJars never touches them
function coreModStagedName(slug: string): string {
  return `beja-core-${slug}.jar`
}

function removeBejaModJars(gameDir: string, onLog: (line: string) => void): void {
  const modsDir = join(gameDir, 'mods')
  if (!existsSync(modsDir)) return
  // Remove legacy bejaclient-*.jar and any old slug-prefixed optimization mod JARs.
  // beja-core-*.jar (staged by us) are intentionally excluded.
  const stale = readdirSync(modsDir).filter(f => {
    if (!f.endsWith('.jar')) return false
    if (f.startsWith('beja-core-')) return false   // our staged core mods — keep
    if (f.startsWith('bejaclient-')) return true
    return CORE_MOD_SLUGS.some(s => f.startsWith(s + '-'))
  })
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

function mcMinorVersion(version: string): number {
  return parseInt(version.split('.')[1] ?? '0', 10)
}

const G1GC_FLAGS = [
  '-XX:+UseG1GC',
  '-XX:+ParallelRefProcEnabled',
  '-XX:MaxGCPauseMillis=200',
  '-XX:+UnlockExperimentalVMOptions',
  '-XX:+DisableExplicitGC',
  '-XX:+AlwaysPreTouch',
  '-XX:G1NewSizePercent=30',
  '-XX:G1MaxNewSizePercent=40',
  '-XX:G1HeapRegionSize=8M',
  '-XX:G1ReservePercent=20',
  '-XX:G1HeapWastePercent=5',
  '-XX:G1MixedGCCountTarget=4',
  '-XX:InitiatingHeapOccupancyPercent=15',
  '-XX:G1MixedGCLiveThresholdPercent=90',
  '-XX:G1RSetUpdatingPauseTimePercent=5',
  '-XX:SurvivorRatio=32',
  '-XX:+PerfDisableSharedMem',
  '-XX:MaxTenuringThreshold=1',
] as const

const ZGC_FLAGS = [
  '-XX:+UseZGC',
  '-XX:+DisableExplicitGC',
  '-XX:+AlwaysPreTouch',
  '-XX:+UnlockExperimentalVMOptions',
] as const

const COMMON_FLAGS = [
  '-XX:+OptimizeStringConcat',
  '-XX:+UseStringDeduplication',
  '-Xshare:off',                  // suppress OpenJDK CDS bootstrap warning
  '-Djava.rmi.server.useCodebaseOnly=true',
] as const

function hasGcFlag(args: string[]): boolean {
  return args.some(a => /Use(ZGC|G1GC|ShenandoahGC|SerialGC|ParallelGC|CMS)/.test(a))
}

function buildJvmArgs(profile: LaunchProfile): string[] {
  const userArgs = profile.jvmArgs?.split(' ').filter(Boolean) ?? []
  const mcMinor  = mcMinorVersion(profile.version)

  const gcFlags = hasGcFlag(userArgs)
    ? []
    : mcMinor >= 17
      ? [...ZGC_FLAGS]
      : [...G1GC_FLAGS]

  const javaagent: string[] = []
  if (profile.useBejaClient) {
    const jar = resolveBootstrapJar()
    if (jar) {
      javaagent.push(`-javaagent:${jar}=${profile.version}`)
      console.log(`[BejaBootstrap] Injecting: ${jar} (MC ${profile.version})`)
    } else {
      console.warn('[BejaBootstrap] Bootstrap JAR not found — client will launch without BejaClient.')
    }
  }

  // Order: agent → GC → common → user (user args can override anything)
  return [...javaagent, ...gcFlags, ...COMMON_FLAGS, ...userArgs]
}

function buildGameEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env }
  if (process.platform === 'linux') {
    // Force dedicated GPU on Linux (NVIDIA PRIME / AMD DRI_PRIME)
    env['__NV_PRIME_RENDER_OFFLOAD']    = '1'
    env['__GLX_VENDOR_LIBRARY_NAME']    = 'nvidia'
    env['__VK_LAYER_NV_optimus']        = 'NVIDIA_only'
    env['DRI_PRIME']                    = '1'
  }
  // Disable GPU driver's VSync/frame limiter from the driver side
  env['__GL_SYNC_TO_VBLANK'] = '0'
  env['vblank_mode']         = '0'          // Mesa/AMD
  return env
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
    try {
      const refreshed = await refreshAccount(account.id)
      if (refreshed) account = refreshed
    } catch (e) {
      throw new Error(`Token refresh failed — please log out and sign in again. (${e instanceof Error ? e.message : String(e)})`)
    }
  }

  const settings = getSettings()
  const javaPath = profile.javaPath || settings.game.defaultJavaPath || 'java'
  const gameDir = profile.gameDir || settings.game.defaultGameDir
  const modsDir = join(gameDir, 'mods')

  onLog(`[Launcher] Profile: ${profile.name} | ${profile.version} | ${profile.loader} | BejaClient: ${profile.useBejaClient}`)
  onLog(`[Launcher] Java: ${javaPath} | Game dir: ${gameDir}`)

  // Auto-install version + loader if not present (deferred from profile creation)
  const baseVersionDir = join(gameDir, 'versions', profile.version)
  const tentativeVersionId = resolveVersionId(profile.version, profile.loader, gameDir)
  const loaderAlreadyInstalled = profile.loader === 'vanilla' || tentativeVersionId !== profile.version
  if (!existsSync(baseVersionDir) || !loaderAlreadyInstalled) {
    onLog(`[Launcher] Version not installed — downloading ${profile.version}${profile.loader !== 'vanilla' ? ` + ${profile.loader}` : ''}…`)
    let loaderVer = profile.loaderVersion || undefined
    if (!loaderVer) {
      try {
        if (profile.loader === 'fabric') {
          const versions = await listFabricVersions(profile.version)
          loaderVer = (versions.find(v => v.loader.stable) ?? versions[0])?.loader.version
        } else if (profile.loader === 'quilt') {
          const versions = await listQuiltVersions(profile.version)
          loaderVer = versions[0]?.loader.version
        } else if (profile.loader === 'forge') {
          const versions = await listForgeVersions(profile.version)
          loaderVer = versions[0]
        } else if (profile.loader === 'neoforge') {
          const versions = await listNeoForgeVersions(profile.version)
          loaderVer = versions[versions.length - 1]
        }
      } catch { /* use undefined — installVersion will skip the loader step */ }
    }
    await installVersion(profile.version, profile.loader, loaderVer, (task, progress, total) => {
      const pct = total > 0 ? Math.round((progress / total) * 100) : 0
      onLog(`[Download] ${task} (${pct}%)`)
    }, javaPath)
    onLog('[Launcher] Download complete.')
  }

  await checkAndUpdateClientJar(onLog, onStatus)

  // Download Sodium/Lithium/FerriteCore to .bejaclient/bin/ if not present
  const binDir = join(gameDir, '.bejaclient', 'bin')
  const coreModPaths = (profile.useBejaClient && profile.loader === 'fabric')
    ? await ensureCoreMods(binDir, profile.version, onLog)
    : []

  // Force unlimited FPS, disable VSync, apply optimized defaults in options.txt
  patchOptionsFile(gameDir)

  // Remove conflicting mods before launching
  enforceModCompatibility(modsDir, onLog)

  onStatus('starting')

  const versionId = resolveVersionId(profile.version, profile.loader, gameDir)
  onLog(`[Launcher] Version ID: ${versionId}`)

  // Always purge any leftover bejaclient mod JARs — BejaClient runs as a Java agent, not a mod
  removeBejaModJars(gameDir, onLog)

  // Stage adapter JAR + core mods into mods/ — fabric.addMods is unreliable in 0.18.6+.
  // beja-core-*.jar names are excluded from removeBejaModJars so they survive the sweep.
  if (!existsSync(modsDir)) mkdirSync(modsDir, { recursive: true })
  const adapterTempPath = join(modsDir, 'beja-adapter-loader.jar')
  if (existsSync(adapterTempPath)) {
    try { unlinkSync(adapterTempPath) } catch { /* ignore */ }
  }
  let adapterWasStaged = false
  if (profile.useBejaClient) {
    const adapterJar = resolveAdapterJar(profile.version)
    if (adapterJar) {
      if (!hasValidZipEnd(adapterJar)) {
        try { unlinkSync(adapterJar) } catch { /* ignore */ }
        throw new Error(
          `Adapter JAR at ${adapterJar} is corrupted (truncated download). ` +
          `It has been removed — relaunch to trigger a fresh download.`
        )
      }
      try {
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

  // Stage Sodium / Lithium / FerriteCore into mods/ so Fabric scans them reliably.
  // ModFilterHook in the bootstrap hides them from Mod Menu at runtime.
  const stagedCorePaths: string[] = []
  if (coreModPaths.length > 0) {
    for (const srcPath of coreModPaths) {
      const slug = CORE_MOD_SLUGS.find(s => srcPath.toLowerCase().includes(s)) ?? 'unknown'
      const dest = join(modsDir, coreModStagedName(slug))
      try {
        copyFileSync(srcPath, dest)
        stagedCorePaths.push(dest)
        onLog(`[BejaClient] Staged core mod → mods/${coreModStagedName(slug)}`)
      } catch (err) {
        onLog(`[BejaClient] WARN: Failed to stage ${slug}: ${String(err)}`)
      }
    }
  }

  // Re-resolve/download libraries+natives at launch time too — normally a fast
  // no-op since install already fetched everything, but native extraction and the
  // classpath string aren't persisted between launches, so this must still run.
  const resolvedVersion = resolveVersion(gameDir, versionId)
  const chain = readVersionJsonChain(gameDir, versionId)
  const baseVersionId = chain[0].id
  const versionJarPath = join(gameDir, 'versions', baseVersionId, `${baseVersionId}.jar`)
  const librariesDir = join(gameDir, 'libraries')
  const nativesDir = join(gameDir, 'versions', versionId, `${versionId}-natives`)

  const platform = getCurrentPlatform()
  const libraries = resolveLibraries(resolvedVersion.libraries, platform)
  await downloadLibraries(libraries, librariesDir, settings.launcher.concurrentDownloads)
  await extractNatives(libraries.filter(lib => lib.isNative), librariesDir, nativesDir)
  const classpath = buildClasspath(libraries, versionJarPath, librariesDir)

  const argContext: ArgContext = {
    version: resolvedVersion,
    gameDir,
    resourceDir: gameDir,
    nativesDir,
    classpath,
    javaPath,
    auth: {
      uuid: account.uuid.replace(/-/g, ''),
      username: account.username,
      accessToken: account.accessToken,
      userType: 'msa',
    },
    resolution: {
      width: profile.resolution.width,
      height: profile.resolution.height,
      fullscreen: false,
    },
    minMemory: profile.minRam,
    maxMemory: profile.maxRam,
    launcherVersion: app.getVersion(),
  }

  const args = assembleCommand(argContext, buildJvmArgs(profile), extraMCArgs ?? [])
  const proc = spawnGame(javaPath, args, gameDir, { env: buildGameEnv() })

  activeProcess = proc
  sessionStartTime = Date.now()
  onStatus('running')

  const log4j = new Log4jParser()
  proc.stdout?.setEncoding('utf-8')
  proc.stderr?.setEncoding('utf-8')
  proc.stdout?.on('data', (data: string) => {
    log4j.feed(data, line => {
      onLog(line)
      for (const f of analyzeCrashLog(line)) {
        onLog(`[CRASH] [${f.severity.toUpperCase()}] ${f.category}: ${f.humanReadable}`)
        onLog(`[CRASH] Suggestion: ${f.suggestion}`)
      }
    })
  })
  proc.stderr?.on('data', (data: string) => {
    data.split('\n').filter(Boolean).forEach(line => onLog(`[ERR] ${line}`))
  })

  let exitCode: number | null = null
  proc.on('exit', code => { exitCode = code ?? 0 })
  proc.on('close', () => {
    if (adapterWasStaged && existsSync(adapterTempPath)) {
      try { unlinkSync(adapterTempPath) } catch { /* ignore */ }
    }
    for (const p of stagedCorePaths) {
      if (existsSync(p)) try { unlinkSync(p) } catch { /* ignore */ }
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
