import AdmZip from 'adm-zip'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { ResolvedLibrary } from './types'

interface NativesManifest {
  extractorVersion: number
  jars: string[]
  files: string[]
}

/**
 * Bump this whenever a change to native-library *selection* or *extraction*
 * logic could change what ends up on disk for an unchanged-looking resolved
 * library set (e.g. fixing which architecture's classifier gets picked). This
 * invalidates every existing user's cached manifest on their very next launch
 * after updating, so a bugfix here self-heals already-affected installs
 * instead of requiring them to manually delete their natives folder.
 *
 * v2 (this bump): fixed resolveLibraries() including all of a modern LWJGL
 * library's per-arch native classifiers (e.g. natives-windows-x86 alongside
 * natives-windows) instead of just the one matching the host CPU — the
 * wrong-arch jar, extracted after the correct one, was silently overwriting
 * files like lwjgl.dll with a 32-bit build on 64-bit machines.
 */
const EXTRACTOR_VERSION = 2

function manifestPath(nativesDir: string): string {
  return join(nativesDir, '.natives-manifest.json')
}

function readManifest(nativesDir: string): NativesManifest | null {
  const path = manifestPath(nativesDir)
  if (!existsSync(path)) return null
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'))
    // Pre-fix manifests were a bare string[] of jar paths — treat as absent so we
    // fall through to a full re-extraction instead of throwing on `.jars`/`.files`.
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return null
    const { extractorVersion, jars, files } = parsed as Partial<NativesManifest>
    if (extractorVersion !== EXTRACTOR_VERSION) return null
    if (!Array.isArray(jars) || !Array.isArray(files)) return null
    return { extractorVersion, jars, files }
  } catch {
    return null
  }
}

const DEFAULT_EXCLUDE = ['META-INF/']

function isExcluded(entryName: string, excludes: string[]): boolean {
  return excludes.some(pattern => entryName.startsWith(pattern))
}

/**
 * Extracts native-classifier library jars into `nativesDir`. Skips re-extraction
 * if the resolved native library set is unchanged AND every previously-extracted
 * file is still present on disk (tracked via a small manifest file). The file-
 * presence check matters: antivirus quarantine or a user clearing out stray DLLs
 * can silently remove extracted natives while the resolved library set (and thus
 * a jar-list-only cache key) stays identical, which would otherwise wedge the
 * cache into skipping extraction forever and crash the game with
 * UnsatisfiedLinkError on next launch.
 */
export async function extractNatives(nativeLibraries: ResolvedLibrary[], librariesDir: string, nativesDir: string): Promise<void> {
  const currentSet = nativeLibraries.map(lib => lib.path).sort()
  const previous = readManifest(nativesDir)
  const jarsUnchanged = !!previous && previous.jars.length === currentSet.length && previous.jars.every((p, i) => p === currentSet[i])
  const filesIntact = !!previous && previous.files.length > 0 && previous.files.every(f => existsSync(join(nativesDir, f)))
  if (jarsUnchanged && filesIntact) {
    return
  }

  if (!existsSync(nativesDir)) mkdirSync(nativesDir, { recursive: true })

  const extractedFiles: string[] = []
  for (const lib of nativeLibraries) {
    const jarPath = join(librariesDir, ...lib.path.split('/'))
    if (!existsSync(jarPath)) continue

    const zip = new AdmZip(jarPath)
    const excludes = [...DEFAULT_EXCLUDE, ...(lib.extractExclude ?? [])]
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue
      if (isExcluded(entry.entryName, excludes)) continue
      zip.extractEntryTo(entry, nativesDir, false, true)
      extractedFiles.push(entry.entryName)
    }
  }

  writeFileSync(manifestPath(nativesDir), JSON.stringify({ extractorVersion: EXTRACTOR_VERSION, jars: currentSet, files: extractedFiles }))
}
