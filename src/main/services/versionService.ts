import * as https from 'https'
import { getSettings } from './settingsService'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

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

export async function fetchVersionManifest(): Promise<VersionManifest> {
  const raw = await httpsGet(
    'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json',
  )
  return JSON.parse(raw)
}

export async function listFabricVersions(mcVersion: string): Promise<FabricLoaderVersion[]> {
  const raw = await httpsGet(
    `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`,
  )
  return JSON.parse(raw)
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
): Promise<void> {
  const { installVersion: xmclInstall, installFabric, getFabricLoaderArtifact, installDependencies } = await import('@xmcl/installer')
  const settings = getSettings()
  const gameDir = settings.game.defaultGameDir

  onProgress(`Installing Minecraft ${versionId}...`, 0, 100)

  const manifest = await fetchVersionManifest()
  const versionEntry = manifest.versions.find(v => v.id === versionId)
  if (!versionEntry) throw new Error(`Version ${versionId} not found in manifest`)

  const resolved = await xmclInstall(versionEntry, gameDir)

  onProgress('Installing assets and libraries...', 50, 100)
  await installDependencies(resolved)

  if (loaderType === 'fabric' && loaderVersion) {
    onProgress(`Installing Fabric ${loaderVersion}...`, 80, 100)
    const artifact = await getFabricLoaderArtifact(versionId, loaderVersion)
    await installFabric(artifact, gameDir)
  }

  onProgress('Done', 100, 100)
}

export async function deleteVersion(versionId: string): Promise<void> {
  const { rm } = await import('fs/promises')
  const settings = getSettings()
  const versionDir = join(settings.game.defaultGameDir, 'versions', versionId)
  if (existsSync(versionDir)) {
    await rm(versionDir, { recursive: true, force: true })
  }
}
