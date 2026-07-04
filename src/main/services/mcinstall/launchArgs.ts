import { join } from 'path'
import { checkRules } from './rules'
import { getCurrentPlatform } from './platform'
import type { ArgumentEntry, ResolvedVersion } from './types'

export interface ArgContext {
  version: ResolvedVersion
  gameDir: string
  resourceDir: string
  nativesDir: string
  classpath: string
  javaPath: string
  auth: { uuid: string; username: string; accessToken: string; userType: 'msa' }
  resolution: { width: number; height: number; fullscreen: boolean }
  minMemory?: number
  maxMemory?: number
  launcherVersion: string
}

const SUBSTITUTIONS: Record<string, (ctx: ArgContext) => string> = {
  auth_player_name: ctx => ctx.auth.username,
  version_name: ctx => ctx.version.id,
  game_directory: ctx => ctx.gameDir,
  assets_root: ctx => join(ctx.resourceDir, 'assets'),
  game_assets: ctx => join(ctx.resourceDir, 'assets', 'virtual', 'legacy'),
  assets_index_name: ctx => ctx.version.assets,
  auth_uuid: ctx => ctx.auth.uuid,
  auth_access_token: ctx => ctx.auth.accessToken,
  auth_session: ctx => ctx.auth.accessToken,
  user_type: ctx => ctx.auth.userType,
  version_type: ctx => ctx.version.type,
  natives_directory: ctx => ctx.nativesDir,
  classpath: ctx => ctx.classpath,
  launcher_name: () => 'BejaClient',
  launcher_version: ctx => ctx.launcherVersion,
  resolution_width: ctx => String(ctx.resolution.width),
  resolution_height: ctx => String(ctx.resolution.height),
  user_properties: () => '{}',
}

function substitute(token: string, ctx: ArgContext): string {
  return token.replace(/\$\{([a-zA-Z_]+)\}/g, (whole, key: string) => {
    const resolver = SUBSTITUTIONS[key]
    return resolver ? resolver(ctx) : whole
  })
}

function currentFeatures(ctx: ArgContext): Record<string, boolean> {
  return {
    has_custom_resolution: true,
    has_quick_plays_support: false,
    is_demo_user: false,
    is_quick_play_singleplayer: false,
    is_quick_play_multiplayer: false,
    is_quick_play_realms: false,
    fullscreen: ctx.resolution.fullscreen,
  }
}

function flattenStructuredArgs(entries: ArgumentEntry[], ctx: ArgContext): string[] {
  const platform = getCurrentPlatform()
  const features = currentFeatures(ctx)
  const out: string[] = []
  for (const entry of entries) {
    if (typeof entry === 'string') {
      out.push(substitute(entry, ctx))
      continue
    }
    if (!checkRules(entry.rules, platform, features)) continue
    const values = Array.isArray(entry.value) ? entry.value : [entry.value]
    for (const v of values) out.push(substitute(v, ctx))
  }
  return out
}

/** Standard JVM args for pre-1.13 versions, which have no `arguments.jvm` template at all. */
function legacyJvmArgs(ctx: ArgContext): string[] {
  const args = [`-Djava.library.path=${ctx.nativesDir}`, '-cp', ctx.classpath]
  if (getCurrentPlatform().name === 'osx') args.push('-XstartOnFirstThread')
  return args
}

export function buildJvmArgs(ctx: ArgContext, extraJVMArgs: string[]): string[] {
  const memArgs = [
    ...(ctx.minMemory ? [`-Xms${ctx.minMemory}M`] : []),
    ...(ctx.maxMemory ? [`-Xmx${ctx.maxMemory}M`] : []),
  ]

  const versionJvmArgs = ctx.version.arguments?.jvm
    ? flattenStructuredArgs(ctx.version.arguments.jvm, ctx)
    : legacyJvmArgs(ctx)

  return [...memArgs, ...versionJvmArgs, ...extraJVMArgs]
}

export function buildGameArgs(ctx: ArgContext, extraMCArgs: string[]): string[] {
  let versionGameArgs: string[]

  if (ctx.version.arguments?.game) {
    versionGameArgs = flattenStructuredArgs(ctx.version.arguments.game, ctx)
  } else if (ctx.version.minecraftArguments) {
    // Flat pre-1.13 string: split first, substitute second — substituting before
    // splitting risks breaking on values (e.g. game_directory) that contain spaces.
    versionGameArgs = ctx.version.minecraftArguments.split(/\s+/).filter(Boolean).map(tok => substitute(tok, ctx))
  } else {
    versionGameArgs = []
  }

  return [...versionGameArgs, ...extraMCArgs]
}

export function assembleCommand(ctx: ArgContext, extraJVMArgs: string[], extraMCArgs: string[]): string[] {
  return [...buildJvmArgs(ctx, extraJVMArgs), ctx.version.mainClass, ...buildGameArgs(ctx, extraMCArgs)]
}
