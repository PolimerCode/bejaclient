import * as https from 'https'
import { writeVersionJson } from './versionResolve'
import type { RawVersionJson } from './types'

const FABRIC_META = 'https://meta.fabricmc.net'

export interface FabricLoaderArtifact {
  loader: { maven: string; version: string; stable: boolean; build: number }
  intermediary: { maven: string; version: string }
  launcherMeta: {
    libraries: { client: { name: string; url: string }[]; common: { name: string; url: string }[] }
    mainClass: { client: string; server: string }
  }
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

/** Fabric's meta API returns plain-text error bodies for invalid mc/loader combos instead of JSON. */
function safeJsonParse<T>(raw: string, context: string): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`${context}: ${raw.slice(0, 200).trim() || '(empty response)'}`)
  }
}

export async function fetchFabricLoaderArtifact(mcVersion: string, loaderVersion: string): Promise<FabricLoaderArtifact> {
  const raw = await httpsGetText(`${FABRIC_META}/v2/versions/loader/${mcVersion}/${loaderVersion}`)
  return safeJsonParse<FabricLoaderArtifact>(raw, `Fabric loader ${loaderVersion} is not available for Minecraft ${mcVersion}`)
}

export function generateFabricVersionJson(artifact: FabricLoaderArtifact, mcVersion: string): RawVersionJson {
  return {
    id: `${mcVersion}-fabric${artifact.loader.version}`,
    inheritsFrom: mcVersion,
    type: 'release',
    mainClass: artifact.launcherMeta.mainClass.client,
    libraries: [
      { name: artifact.loader.maven, url: 'https://maven.fabricmc.net/' },
      { name: artifact.intermediary.maven, url: 'https://maven.fabricmc.net/' },
      ...artifact.launcherMeta.libraries.client.map(l => ({ name: l.name, url: l.url })),
      ...artifact.launcherMeta.libraries.common.map(l => ({ name: l.name, url: l.url })),
      // launcherMeta.libraries.development (e.g. mixinextras-fabric) is intentionally
      // excluded — it's for Fabric Loom's dev/test environment; mods that need it
      // shade it into their own jar for real launches.
    ],
    arguments: { game: [], jvm: [] },
    releaseTime: new Date().toISOString(),
    time: new Date().toISOString(),
  }
}

/** Pure local write — no network call beyond the metadata fetch already performed. */
export async function installFabricVersionJson(artifact: FabricLoaderArtifact, mcVersion: string, gameDir: string): Promise<string> {
  const json = generateFabricVersionJson(artifact, mcVersion)
  writeVersionJson(gameDir, json)
  return json.id
}
