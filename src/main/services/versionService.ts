import * as https from 'https'
import { getSettings } from './settingsService'
import { existsSync, readdirSync } from 'fs'
import { rm } from 'fs/promises'
import { join } from 'path'
import {
  downloadVersionJsonAndJar,
  resolveVersion,
  getCurrentPlatform,
  resolveLibraries,
  downloadLibraries,
  downloadAssetIndex,
  downloadAssets,
  linkLegacyAssets,
  fetchFabricLoaderArtifact,
  installFabricVersionJson,
  fetchQuiltLoaderArtifact,
  installQuiltVersionJson,
  installForge,
  installNeoForge,
} from './mcinstall'

export interface RemoteVersion {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
  url: string
  time: string
  releaseTime: string
}

export interface VersionManifest {
  latest: { release: string; snapshot: string }
  versions: RemoteVersion[]
}

export interface FabricLoaderVersion {
  loader: { version: string; stable: boolean }
  intermediary: { version: string }
  launcherMeta: { version: number }
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let data = ''
        res.on('data', c => (data += c))
        res.on('end', () => resolve(data))
      })
      .on('error', reject)
  })
}

// Fabric/Mojang APIs return plain-text error bodies (e.g. "no loader version X for
// game version Y") instead of JSON when a version/loader combo is invalid. JSON.parse
// on that text throws a cryptic "Unexpected token" SyntaxError — surface the actual
// response body instead so the failure is readable in the launch error dialog.
function safeJsonParse<T>(raw: string, context: string): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`${context}: ${raw.slice(0, 200).trim() || '(empty response)'}`)
  }
}

export async function fetchVersionManifest(): Promise<VersionManifest> {
  const raw = await httpsGet(
    'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json',
  )
  return safeJsonParse<VersionManifest>(raw, 'Failed to fetch Minecraft version list')
}

export async function listFabricVersions(mcVersion: string): Promise<FabricLoaderVersion[]> {
  const raw = await httpsGet(
    `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`,
  )
  return safeJsonParse<FabricLoaderVersion[]>(raw, `No Fabric loader available for Minecraft ${mcVersion}`)
}

export async function listForgeVersions(mcVersion: string): Promise<string[]> {
  try {
    const raw = await httpsGet(
      'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json',
    )
    const data = JSON.parse(raw)
    const promos: Record<string, string> = data.promos ?? {}
    const versions: string[] = []
    for (const [key, value] of Object.entries(promos)) {
      if (key.startsWith(`${mcVersion}-`)) {
        versions.push(String(value))
      }
    }
    return versions
  } catch {
    return []
  }
}

export function getInstalledVersions(): string[] {
  const settings = getSettings()
  const versionsDir = join(settings.game.defaultGameDir, 'versions')
  if (!existsSync(versionsDir)) return []
  try {
    return readdirSync(versionsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  } catch {
    return []
  }
}

export async function installVersion(
  versionId: string,
  loaderType: string,
  loaderVersion: string | undefined,
  onProgress: (task: string, progress: number, total: number) => void,
  javaPath = 'java',
): Promise<void> {
  const settings = getSettings()
  const gameDir = settings.game.defaultGameDir
  const concurrency = settings.launcher.concurrentDownloads

  onProgress(`Installing Minecraft ${versionId}...`, 0, 100)

  const manifest = await fetchVersionManifest()
  const versionEntry = manifest.versions.find(v => v.id === versionId)
  if (!versionEntry) throw new Error(`Version ${versionId} not found in manifest`)

  await downloadVersionJsonAndJar(versionEntry, gameDir)
  const resolved = resolveVersion(gameDir, versionId)

  onProgress('Installing assets and libraries...', 50, 100)
  const platform = getCurrentPlatform()
  const libraries = resolveLibraries(resolved.libraries, platform)
  await downloadLibraries(libraries, join(gameDir, 'libraries'), concurrency)

  const assetIndex = await downloadAssetIndex(resolved, gameDir)
  await downloadAssets(assetIndex, gameDir, concurrency)
  await linkLegacyAssets(assetIndex, resolved, gameDir)

  if (loaderType === 'fabric' && loaderVersion) {
    onProgress(`Installing Fabric ${loaderVersion}...`, 80, 100)
    const artifact = await fetchFabricLoaderArtifact(versionId, loaderVersion)
    await installFabricVersionJson(artifact, versionId, gameDir)
  } else if (loaderType === 'quilt' && loaderVersion) {
    onProgress(`Installing Quilt ${loaderVersion}...`, 80, 100)
    const artifact = await fetchQuiltLoaderArtifact(versionId, loaderVersion)
    await installQuiltVersionJson(artifact, versionId, gameDir)
  } else if (loaderType === 'forge' && loaderVersion) {
    onProgress(`Installing Forge ${loaderVersion}...`, 80, 100)
    await installForge(versionId, loaderVersion, gameDir, javaPath, line => onProgress(line, 85, 100))
  } else if (loaderType === 'neoforge' && loaderVersion) {
    onProgress(`Installing NeoForge ${loaderVersion}...`, 80, 100)
    await installNeoForge(versionId, loaderVersion, gameDir, javaPath, line => onProgress(line, 85, 100))
  }

  onProgress('Done', 100, 100)
}

export async function deleteVersion(versionId: string): Promise<void> {
  const settings = getSettings()
  const versionDir = join(settings.game.defaultGameDir, 'versions', versionId)
  if (existsSync(versionDir)) {
    await rm(versionDir, { recursive: true, force: true })
  }
}
