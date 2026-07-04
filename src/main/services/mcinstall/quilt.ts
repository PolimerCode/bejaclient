import * as https from 'https'
import { writeVersionJson } from './versionResolve'
import type { RawVersionJson } from './types'

const QUILT_META = 'https://meta.quiltmc.org'

export interface QuiltLoaderArtifact {
  loader: { maven: string; version: string; build: number }
  hashed: { maven: string; version: string }
  intermediary: { maven: string; version: string }
  launcherMeta: {
    libraries: {
      client: { name: string; url: string }[]
      common: { name: string; url: string }[]
      development?: { name: string; url: string }[]
    }
    mainClass: { client: string; server: string; serverLauncher?: string }
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

function safeJsonParse<T>(raw: string, context: string): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`${context}: ${raw.slice(0, 200).trim() || '(empty response)'}`)
  }
}

export async function fetchQuiltLoaderArtifact(mcVersion: string, loaderVersion: string): Promise<QuiltLoaderArtifact> {
  const raw = await httpsGetText(`${QUILT_META}/v3/versions/loader/${mcVersion}/${loaderVersion}`)
  return safeJsonParse<QuiltLoaderArtifact>(raw, `Quilt loader ${loaderVersion} is not available for Minecraft ${mcVersion}`)
}

export async function listQuiltVersions(mcVersion: string): Promise<{ loader: { version: string } }[]> {
  const raw = await httpsGetText(`${QUILT_META}/v3/versions/loader/${mcVersion}`)
  return safeJsonParse(raw, `No Quilt loader available for Minecraft ${mcVersion}`)
}

export function generateQuiltVersionJson(artifact: QuiltLoaderArtifact, mcVersion: string): RawVersionJson {
  return {
    id: `${mcVersion}-quilt${artifact.loader.version}`,
    inheritsFrom: mcVersion,
    type: 'release',
    mainClass: artifact.launcherMeta.mainClass.client,
    libraries: [
      { name: artifact.loader.maven, url: 'https://maven.quiltmc.org/repository/release/' },
      { name: artifact.hashed.maven, url: 'https://maven.quiltmc.org/repository/release/' },
      { name: artifact.intermediary.maven, url: 'https://maven.fabricmc.net/' },
      ...artifact.launcherMeta.libraries.client.map(l => ({ name: l.name, url: l.url })),
      ...artifact.launcherMeta.libraries.common.map(l => ({ name: l.name, url: l.url })),
      // NOTE: launcherMeta.libraries.development is intentionally excluded — it's
      // Quilt's own dev-environment tooling, not needed (or wanted) on a real launch.
    ],
    arguments: { game: [], jvm: [] },
    releaseTime: new Date().toISOString(),
    time: new Date().toISOString(),
  }
}

export async function installQuiltVersionJson(artifact: QuiltLoaderArtifact, mcVersion: string, gameDir: string): Promise<string> {
  const json = generateQuiltVersionJson(artifact, mcVersion)
  writeVersionJson(gameDir, json)
  return json.id
}
