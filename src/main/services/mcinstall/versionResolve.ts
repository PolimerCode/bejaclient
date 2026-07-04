import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import * as https from 'https'
import { downloadFile } from './downloader'
import type { ArgumentEntry, RawLibrary, RawVersionJson, ResolvedVersion } from './types'

function httpsGetJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { timeout: 15000 }, res => {
        let data = ''
        res.on('data', (c: string) => (data += c))
        res.on('end', () => {
          try { resolve(JSON.parse(data) as T) } catch (e) { reject(e) }
        })
        res.on('error', reject)
      })
      .on('error', reject)
      .on('timeout', () => reject(new Error(`Timed out fetching ${url}`)))
  })
}

function versionJsonPath(gameDir: string, versionId: string): string {
  return join(gameDir, 'versions', versionId, `${versionId}.json`)
}

function versionJarPath(gameDir: string, versionId: string): string {
  return join(gameDir, 'versions', versionId, `${versionId}.jar`)
}

/** Downloads the version JSON + client jar for a base (vanilla) version manifest entry. */
export async function downloadVersionJsonAndJar(
  versionEntry: { id: string; url: string },
  gameDir: string,
): Promise<RawVersionJson> {
  const jsonPath = versionJsonPath(gameDir, versionEntry.id)
  mkdirSync(join(gameDir, 'versions', versionEntry.id), { recursive: true })

  const json = await httpsGetJson<RawVersionJson>(versionEntry.url)
  writeFileSync(jsonPath, JSON.stringify(json))

  const client = json.downloads?.client
  if (client) {
    await downloadFile(client.url, versionJarPath(gameDir, versionEntry.id), { sha1: client.sha1 })
  }

  return json
}

/** Writes an already-fetched/generated version JSON to disk under versions/<id>/<id>.json. */
export function writeVersionJson(gameDir: string, json: RawVersionJson): void {
  mkdirSync(join(gameDir, 'versions', json.id), { recursive: true })
  writeFileSync(versionJsonPath(gameDir, json.id), JSON.stringify(json))
}

/** Walks the inheritsFrom chain starting at versionId, returns [root, ..., mostDerived]. */
export function readVersionJsonChain(gameDir: string, versionId: string): RawVersionJson[] {
  const chain: RawVersionJson[] = []
  let currentId: string | undefined = versionId
  const seen = new Set<string>()

  while (currentId) {
    if (seen.has(currentId)) throw new Error(`Circular inheritsFrom chain detected at ${currentId}`)
    seen.add(currentId)

    const path = versionJsonPath(gameDir, currentId)
    if (!existsSync(path)) {
      throw new Error(
        `Version JSON missing for "${currentId}" (needed by ${versionId}'s inheritsFrom chain). ` +
        `Install ${currentId} before launching ${versionId}.`,
      )
    }
    const json = JSON.parse(readFileSync(path, 'utf-8')) as RawVersionJson
    chain.unshift(json)
    currentId = json.inheritsFrom
  }

  return chain
}

/**
 * Includes the classifier (4th Maven coordinate segment) in the key — modern LWJGL
 * libraries ship their native variants as sibling entries with the same group:artifact
 * but a "natives-<os>" classifier suffix (e.g. "org.lwjgl:lwjgl:3.3.3:natives-windows"
 * alongside plain "org.lwjgl:lwjgl:3.3.3"). Keying on group:artifact alone would treat
 * those as the same library and silently drop the native one during merging.
 */
function libraryKey(lib: RawLibrary): string {
  const parts = lib.name.split(':')
  return `${parts[0]}:${parts[1]}:${parts[3] ?? ''}`
}

/**
 * Merges a version JSON inheritance chain (root/vanilla first, most-derived last)
 * into one fully-resolved version. Libraries concat child-first, de-duped by
 * group:artifact keeping the most-derived occurrence (so a loader's pinned library
 * version wins over vanilla's). Arguments concat child-then-parent. Scalar fields
 * take the most-derived value that defines them.
 */
export function resolveVersion(gameDir: string, versionId: string): ResolvedVersion {
  const chain = readVersionJsonChain(gameDir, versionId)
  const mostDerivedFirst = [...chain].reverse()

  let mainClass = ''
  let assetIndex: RawVersionJson['assetIndex']
  let assets = ''
  let type = 'release'
  let javaVersion: RawVersionJson['javaVersion']
  let minecraftArguments: string | undefined
  const seenArgForm = { structured: false, flat: false }

  const libraries: RawLibrary[] = []
  const seenLibKeys = new Set<string>()
  const gameArgs: ArgumentEntry[] = []
  const jvmArgs: ArgumentEntry[] = []

  for (let i = 0; i < mostDerivedFirst.length; i++) {
    const version = mostDerivedFirst[i]
    if (!mainClass && version.mainClass) mainClass = version.mainClass
    if (!assetIndex && version.assetIndex) assetIndex = version.assetIndex
    if (!assets && version.assets) assets = version.assets
    if (!javaVersion && version.javaVersion) javaVersion = version.javaVersion
    if (i === 0) type = version.type ?? type

    if (version.arguments) {
      seenArgForm.structured = true
      gameArgs.push(...(version.arguments.game ?? []))
      jvmArgs.push(...(version.arguments.jvm ?? []))
    } else if (version.minecraftArguments && !minecraftArguments) {
      seenArgForm.flat = true
      minecraftArguments = version.minecraftArguments
    }

    for (const lib of version.libraries) {
      const key = libraryKey(lib)
      if (seenLibKeys.has(key)) continue
      seenLibKeys.add(key)
      libraries.push(lib)
    }
  }

  if (!mainClass) throw new Error(`No mainClass resolved for version ${versionId}`)
  if (!assetIndex || !assets) throw new Error(`No assetIndex resolved for version ${versionId}`)

  const resolved: ResolvedVersion = {
    id: versionId,
    type,
    mainClass,
    libraries,
    assetIndex,
    assets,
    javaVersion,
  }

  // Structured (1.13+) and flat (pre-1.13) argument forms are never mixed —
  // prefer structured if any link in the chain defined it.
  if (seenArgForm.structured) {
    resolved.arguments = { game: gameArgs, jvm: jvmArgs }
  } else if (seenArgForm.flat) {
    resolved.minecraftArguments = minecraftArguments
  }

  return resolved
}
