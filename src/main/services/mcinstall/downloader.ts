import https from 'https'
import http from 'http'
import { createHash } from 'crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync, renameSync } from 'fs'
import { dirname } from 'path'

function sha1File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha1')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk: Buffer) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export interface DownloadOptions {
  sha1?: string
  onProgress?: (receivedBytes: number, totalBytes: number) => void
}

/**
 * Downloads to a `.part` sibling of `dest`, verifying completeness (Content-Length)
 * and checksum (when provided) before atomically renaming into place. If `dest`
 * already exists and matches `sha1`, returns immediately with no network call —
 * this is what makes installs resumable/cheap to retry.
 */
export async function downloadFile(url: string, dest: string, options: DownloadOptions = {}): Promise<void> {
  if (options.sha1 && existsSync(dest)) {
    try {
      const actual = await sha1File(dest)
      if (actual === options.sha1.toLowerCase()) return
    } catch { /* fall through and re-download */ }
  }

  const dir = dirname(dest)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  await downloadToTemp(url, dest, options.onProgress)

  if (options.sha1) {
    const actual = await sha1File(`${dest}.part`)
    if (actual !== options.sha1.toLowerCase()) {
      try { unlinkSync(`${dest}.part`) } catch { /* ignore */ }
      throw new Error(`Checksum mismatch for ${url}: expected ${options.sha1}, got ${actual}`)
    }
  }

  renameSync(`${dest}.part`, dest)
}

function downloadToTemp(
  url: string,
  dest: string,
  onProgress?: (received: number, total: number) => void,
  redirects = 5,
): Promise<void> {
  const tempDest = `${dest}.part`
  return new Promise((resolve, reject) => {
    const fail = (err: Error) => {
      try { unlinkSync(tempDest) } catch { /* ignore */ }
      reject(err)
    }
    const mod = url.startsWith('https') ? https : http
    mod
      .get(url, { timeout: 60000 }, res => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          if (redirects === 0) return reject(new Error('Too many redirects'))
          return downloadToTemp(res.headers.location, dest, onProgress, redirects - 1).then(resolve).catch(reject)
        }
        if (res.statusCode && res.statusCode >= 400) {
          res.resume()
          return fail(new Error(`HTTP ${res.statusCode} for ${url}`))
        }
        const total = parseInt(res.headers['content-length'] ?? '0', 10)
        let received = 0
        const out = createWriteStream(tempDest)
        res.on('data', (chunk: Buffer) => {
          received += chunk.length
          if (total > 0) onProgress?.(received, total)
        })
        res.pipe(out)
        out.on('finish', () => {
          if (total > 0 && received !== total) {
            return fail(new Error(`Download incomplete for ${url}: got ${received} of ${total} bytes`))
          }
          resolve()
        })
        out.on('error', fail)
        res.on('error', fail)
      })
      .on('error', fail)
      .on('timeout', () => fail(new Error(`Download timed out: ${url}`)))
  })
}

export interface PoolFailure<T> {
  item: T
  error: Error
}

/**
 * Runs `worker` over `items` with at most `concurrency` in flight at once. Per-item
 * failures are caught and collected rather than rejecting the whole batch — a single
 * flaky asset must not surface as an opaque AggregateError and abort everything else.
 */
export async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<PoolFailure<T>[]> {
  const failures: PoolFailure<T>[] = []
  let cursor = 0
  const limit = Math.max(1, Math.min(concurrency, 64))

  async function runNext(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++
      const item = items[index]
      try {
        await worker(item, index)
      } catch (e) {
        failures.push({ item, error: e instanceof Error ? e : new Error(String(e)) })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runNext()))
  return failures
}

export function summarizeFailures<T>(failures: PoolFailure<T>[], label: string): Error | null {
  if (failures.length === 0) return null
  const sample = failures.slice(0, 3).map(f => f.error.message).join('; ')
  return new Error(`${failures.length} ${label} failed: ${sample}${failures.length > 3 ? '…' : ''}`)
}
