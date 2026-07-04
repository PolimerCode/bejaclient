import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { downloadFile, runPool, summarizeFailures } from './downloader'
import type { AssetIndex, ResolvedVersion } from './types'

const RESOURCES_BASE_URL = 'https://resources.download.minecraft.net'

export async function downloadAssetIndex(resolvedVersion: ResolvedVersion, gameDir: string): Promise<AssetIndex> {
  const dest = join(gameDir, 'assets', 'indexes', `${resolvedVersion.assetIndex.id}.json`)
  await downloadFile(resolvedVersion.assetIndex.url, dest, { sha1: resolvedVersion.assetIndex.sha1 })
  return JSON.parse(readFileSync(dest, 'utf-8')) as AssetIndex
}

export async function downloadAssets(
  assetIndex: AssetIndex,
  gameDir: string,
  concurrency: number,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const entries = Object.entries(assetIndex.objects)
  let done = 0
  const failures = await runPool(entries, concurrency, async ([, obj]) => {
    const prefix = obj.hash.slice(0, 2)
    const dest = join(gameDir, 'assets', 'objects', prefix, obj.hash)
    const url = `${RESOURCES_BASE_URL}/${prefix}/${obj.hash}`
    await downloadFile(url, dest, { sha1: obj.hash })
    done++
    onProgress?.(done, entries.length)
  })
  const summary = summarizeFailures(failures, 'assets')
  if (summary) throw summary
}

/**
 * Pre-1.7.10 clients ("legacy"/"pre-1.6" asset index formats) read assets by their
 * logical filename under assets/virtual/legacy/, not by content hash — without this,
 * those versions boot with all sounds/textures silently missing despite a
 * "successful" install.
 */
export async function linkLegacyAssets(assetIndex: AssetIndex, resolvedVersion: ResolvedVersion, gameDir: string): Promise<void> {
  if (resolvedVersion.assets !== 'legacy' && resolvedVersion.assets !== 'pre-1.6') return

  const virtualDir = join(gameDir, 'assets', 'virtual', 'legacy')
  for (const [name, obj] of Object.entries(assetIndex.objects)) {
    const src = join(gameDir, 'assets', 'objects', obj.hash.slice(0, 2), obj.hash)
    const dest = join(virtualDir, ...name.split('/'))
    if (!existsSync(src) || existsSync(dest)) continue
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(src, dest)
  }
}
