import { join } from 'path'
import { checkRules } from './rules'
import { downloadFile, runPool, summarizeFailures } from './downloader'
import type { Platform, RawLibrary, ResolvedLibrary } from './types'

/**
 * Modern LWJGL 3.3+ version JSONs (MC 1.19+) list a separate native-classifier
 * library per architecture (e.g. "natives-windows", "natives-windows-x86",
 * "natives-windows-arm64") as sibling entries — but their `rules` arrays only
 * ever gate on OS name, never on `os.arch`. So every arch-variant entry for
 * the current OS survives `checkRules` and would otherwise all get downloaded
 * and extracted into the same natives folder, silently overwriting each other
 * (whichever is processed last wins). This maps a classifier's arch suffix
 * (or lack thereof, meaning the x64 default) to bucket it against the current
 * platform's actual CPU architecture.
 */
function classifierArchBucket(classifier: string): 'x64' | 'arm64' | 'x86' | 'arm' {
  if (classifier.endsWith('-arm64')) return 'arm64'
  if (classifier.endsWith('-x86')) return 'x86'
  if (classifier.endsWith('-arm32') || classifier.endsWith('-arm')) return 'arm'
  return 'x64'
}

function platformArchBucket(platform: Platform): 'x64' | 'arm64' | 'x86' | 'arm' {
  if (platform.arch === 'arm64') return 'arm64'
  if (platform.arch === 'ia32' || platform.arch === 'x86') return 'x86'
  if (platform.arch === 'arm') return 'arm'
  return 'x64'
}

/** Converts a Maven coordinate ("group:artifact:version[:classifier][@ext]") to a relative jar path. */
function mavenNameToPath(name: string): string {
  let ext = 'jar'
  let rest = name
  const atIdx = name.indexOf('@')
  if (atIdx !== -1) {
    ext = name.slice(atIdx + 1)
    rest = name.slice(0, atIdx)
  }
  const [group, artifact, version, classifier] = rest.split(':')
  const groupPath = group.replace(/\./g, '/')
  const fileName = classifier ? `${artifact}-${version}-${classifier}.${ext}` : `${artifact}-${version}.${ext}`
  return `${groupPath}/${artifact}/${version}/${fileName}`
}

export function resolveLibraries(rawLibraries: RawLibrary[], platform: Platform): ResolvedLibrary[] {
  const result: ResolvedLibrary[] = []

  for (const lib of rawLibraries) {
    if (!checkRules(lib.rules, platform)) continue

    // Legacy format (pre-~1.19): one library entry carries a `natives` OS->classifier
    // map plus a `downloads.classifiers` bag holding every platform's jar.
    const legacyNativeClassifier = lib.natives?.[platform.name]
    if (legacyNativeClassifier) {
      const artifact = lib.downloads?.classifiers?.[legacyNativeClassifier]
      const path = artifact?.path ?? mavenNameToPath(`${lib.name}:${legacyNativeClassifier}`)
      const url = artifact?.url ?? (lib.url ? `${lib.url.replace(/\/$/, '')}/${path}` : '')
      if (!url) continue
      result.push({
        name: lib.name,
        path,
        url,
        sha1: artifact?.sha1,
        size: artifact?.size,
        isNative: true,
        nativeClassifier: legacyNativeClassifier,
        extractExclude: lib.extract?.exclude,
      })
      continue
    }

    // Modern format (LWJGL 3.x+): the classifier is baked into the Maven name itself
    // ("group:artifact:version:natives-<os>"), gated by that entry's own `rules`
    // (already filtered above), with a single `downloads.artifact` — no `natives` map.
    const embeddedClassifier = lib.name.match(/:(natives-[\w-]+)$/)?.[1]
    if (embeddedClassifier && lib.downloads?.artifact) {
      if (classifierArchBucket(embeddedClassifier) !== platformArchBucket(platform)) continue
      const art = lib.downloads.artifact
      result.push({
        name: lib.name,
        path: art.path ?? mavenNameToPath(lib.name),
        url: art.url,
        sha1: art.sha1,
        size: art.size,
        isNative: true,
        nativeClassifier: embeddedClassifier,
        extractExclude: lib.extract?.exclude,
      })
      continue
    }

    if (lib.downloads?.artifact) {
      const art = lib.downloads.artifact
      result.push({
        name: lib.name,
        path: art.path ?? mavenNameToPath(lib.name),
        url: art.url,
        sha1: art.sha1,
        size: art.size,
        isNative: false,
      })
    } else if (lib.url) {
      const path = mavenNameToPath(lib.name)
      result.push({
        name: lib.name,
        path,
        url: `${lib.url.replace(/\/$/, '')}/${path}`,
        isNative: false,
      })
    }
  }

  return result
}

export function buildClasspath(libraries: ResolvedLibrary[], versionJarPath: string, librariesDir: string): string {
  const separator = process.platform === 'win32' ? ';' : ':'
  const jarPaths = libraries
    .filter(lib => !lib.isNative)
    .map(lib => join(librariesDir, ...lib.path.split('/')))
  return [...jarPaths, versionJarPath].join(separator)
}

export async function downloadLibraries(
  libraries: ResolvedLibrary[],
  librariesDir: string,
  concurrency: number,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  let done = 0
  const failures = await runPool(libraries, concurrency, async lib => {
    const dest = join(librariesDir, ...lib.path.split('/'))
    await downloadFile(lib.url, dest, { sha1: lib.sha1 })
    done++
    onProgress?.(done, libraries.length)
  })
  const summary = summarizeFailures(failures, 'libraries')
  if (summary) throw summary
}
