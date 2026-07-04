import https from 'https'
import http from 'http'
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  renameSync,
  statSync,
  openSync,
  readSync,
  closeSync,
} from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { app } from 'electron'

const VERSION_JSON_URL = 'http://206.217.141.184:3093/api/jars/current'

export interface ClientVersionInfo {
  version: string
  url: string
  filename: string
  sha256?: string
  adapterUrl?: string
  adapterFilename?: string
  adapterSha256?: string
  releaseDate?: string
}

function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk: Buffer) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

/**
 * Checks that a file ends with a ZIP end-of-central-directory signature
 * (PK\x05\x06). Cheap way to detect truncated/corrupt jar downloads without
 * a full zip parser — jars produced by Gradle have no trailing zip comment,
 * so the EOCD record sits in the last ~22-4096 bytes.
 */
export function hasValidZipEnd(filePath: string): boolean {
  try {
    const stat = statSync(filePath)
    if (stat.size < 22) return false
    const bufSize = Math.min(stat.size, 4096)
    const buf = Buffer.alloc(bufSize)
    const fd = openSync(filePath, 'r')
    try {
      readSync(fd, buf, 0, bufSize, stat.size - bufSize)
    } finally {
      closeSync(fd)
    }
    for (let i = buf.length - 22; i >= 0; i--) {
      if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

// ── Path resolution ───────────────────────────────────────────────────────────

/**
 * Directory where downloaded JARs are stored (writable, persists across updates).
 * Takes priority over the bundled beja-libs so downloaded versions win.
 */
export function getDownloadedLibsDir(): string {
  return join(app.getPath('userData'), 'beja-libs')
}

/**
 * Finds the bootstrap JAR. Checks (in order):
 *   1. userData/beja-libs/  — downloaded via auto-update
 *   2. resources/beja-libs/ — bundled in production build
 *   3. BejaClient-MC/dist/  — dev build output
 */
export function resolveBootstrapJar(): string | null {
  const isBootstrap = (f: string) =>
    f.startsWith('beja-bootstrap-') && f.endsWith('.jar')

  const candidates = [
    getDownloadedLibsDir(),
    join(process.resourcesPath ?? '', 'beja-libs'),
    join(app.getAppPath(), '..', 'BejaClient-MC', 'dist'),
  ]

  for (const dir of candidates) {
    if (!existsSync(dir)) continue
    const jars = readdirSync(dir).filter(isBootstrap).sort().reverse()
    if (jars.length > 0) return join(dir, jars[0])
  }

  return null
}

/** Maps a Minecraft version string to the correct adapter JAR prefix. */
export function adapterJarPrefix(mcVersion: string): string {
  const m = mcVersion.match(/^1\.(\d+)/)
  const minor = m ? parseInt(m[1]) : 99
  if (minor >= 21) return 'beja-v1_21'
  if (minor >= 20) return 'beja-v1_20'
  if (minor >= 19) return 'beja-v1_19'
  if (minor >= 18) return 'beja-v1_18'
  if (minor >= 16) return 'beja-v1_16'
  return 'beja-v1_21'
}

/**
 * Finds the adapter JAR for a given MC version (beja-v1_21-*.jar, beja-v1_20-*.jar, …).
 * Falls back to any beja-v* JAR if no version-specific one is found.
 */
export function resolveAdapterJar(mcVersion?: string): string | null {
  const prefix = mcVersion ? adapterJarPrefix(mcVersion) : null

  const isAdapter = (f: string, p: string | null) =>
    f.startsWith(p ?? 'beja-v') && f.endsWith('.jar') &&
    !f.includes('-sources') && !f.includes('-dev')

  const candidates = [
    getDownloadedLibsDir(),
    join(process.resourcesPath ?? '', 'beja-libs'),
    join(app.getAppPath(), '..', 'BejaClient-MC', 'dist'),
  ]

  for (const dir of candidates) {
    if (!existsSync(dir)) continue
    const jars = readdirSync(dir).filter(f => isAdapter(f, prefix)).sort().reverse()
    if (jars.length > 0) return join(dir, jars[0])
  }

  // Fallback: any adapter JAR when version-specific one is missing
  if (prefix) return resolveAdapterJar()
  return null
}

function getLocalVersion(dir: string): string | null {
  if (!existsSync(dir)) return null
  const jars = readdirSync(dir)
    .filter(f => f.startsWith('beja-bootstrap-') && f.endsWith('.jar'))
    .sort().reverse()
  if (!jars.length) return null
  const m = jars[0].match(/beja-bootstrap-(.+)\.jar$/)
  return m ? m[1] : null
}

function semverGt(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number)
  const l = local.split('.').map(Number)
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] ?? 0
    const lv = l[i] ?? 0
    if (rv > lv) return true
    if (rv < lv) return false
  }
  return false
}

// ── Network helpers ───────────────────────────────────────────────────────────

function fetchJson<T>(url: string, redirects = 5): Promise<T> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod
      .get(url, { timeout: 8000 }, res => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          if (redirects === 0) return reject(new Error('Too many redirects'))
          return fetchJson<T>(res.headers.location, redirects - 1).then(resolve).catch(reject)
        }
        if (res.statusCode && res.statusCode >= 400) {
          res.resume() // drain so socket is reused
          return reject(new Error(`Server returned HTTP ${res.statusCode}`))
        }
        let data = ''
        res.on('data', (c: string) => (data += c))
        res.on('end', () => {
          const trimmed = data.trimStart()
          if (trimmed.startsWith('<')) {
            return reject(new Error(`Server returned HTML instead of JSON (HTTP ${res.statusCode ?? '?'})`))
          }
          try { resolve(JSON.parse(trimmed)) } catch (e) { reject(e) }
        })
        res.on('error', reject)
      })
      .on('error', reject)
      .on('timeout', () => reject(new Error('Request timed out')))
  })
}

/**
 * Downloads to a `.part` sibling of `dest` and only renames it into place once
 * the transfer is confirmed complete (byte count matches Content-Length, when
 * present) — so a truncated/interrupted download never lands at the final
 * path that resolveBootstrapJar/resolveAdapterJar pick up.
 */
function downloadFile(
  url: string,
  dest: string,
  onProgress: (pct: number) => void,
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
      .get(url, { timeout: 120000 }, res => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          if (redirects === 0) return reject(new Error('Too many redirects'))
          return downloadFile(res.headers.location, dest, onProgress, redirects - 1)
            .then(resolve)
            .catch(reject)
        }
        if (res.statusCode && res.statusCode >= 400) {
          res.resume()
          return fail(new Error(`Server returned HTTP ${res.statusCode}`))
        }
        const total = parseInt(res.headers['content-length'] ?? '0', 10)
        let received = 0
        const out = createWriteStream(tempDest)
        res.on('data', (chunk: Buffer) => {
          received += chunk.length
          if (total > 0) onProgress(Math.floor((received / total) * 100))
        })
        res.pipe(out)
        out.on('finish', () => {
          if (total > 0 && received !== total) {
            return fail(new Error(`Download incomplete: got ${received} of ${total} bytes`))
          }
          try {
            renameSync(tempDest, dest)
          } catch (err) {
            return fail(err as Error)
          }
          resolve()
        })
        out.on('error', fail)
        res.on('error', fail)
      })
      .on('error', fail)
      .on('timeout', () => fail(new Error('Download timed out')))
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches client-version.json from GitHub, compares with the locally installed
 * bootstrap JAR, and downloads the new version if outdated.
 * Non-fatal — if anything fails the launcher continues with whatever JAR is present.
 */
export async function checkAndUpdateClientJar(
  onLog: (line: string) => void,
  onStatus: (msg: string) => void,
): Promise<void> {
  try {
    onLog('[BejaClient] Checking for client updates…')

    const remote = await fetchJson<ClientVersionInfo>(VERSION_JSON_URL)

    if (!remote.version || !remote.url || remote.version === '0.0.0') {
      onLog('[BejaClient] No released client version yet — skipping update.')
      return
    }

    const dlDir = getDownloadedLibsDir()
    const localVer = getLocalVersion(dlDir)

    onLog(`[BejaClient] Local: ${localVer ?? 'none'}  |  Remote: ${remote.version}`)

    const localBootstrapValid = localVer
      ? hasValidZipEnd(join(dlDir, `beja-bootstrap-${localVer}.jar`))
      : false
    const localAdapterJar = resolveAdapterJar()
    const localAdapterValid = localAdapterJar ? hasValidZipEnd(localAdapterJar) : false

    if (localVer && !semverGt(remote.version, localVer)) {
      if (localBootstrapValid && localAdapterValid) {
        onLog('[BejaClient] Client JAR is up to date.')
        return
      }
      onLog('[BejaClient] Local client JAR appears corrupted — re-downloading current version.')
    }

    if (!existsSync(dlDir)) mkdirSync(dlDir, { recursive: true })

    // Bootstrap JAR
    onStatus(`Downloading BejaClient ${remote.version}…`)
    onLog(`[BejaClient] Downloading ${remote.filename}…`)

    readdirSync(dlDir)
      .filter(f => f.startsWith('beja-bootstrap-') && f.endsWith('.jar'))
      .forEach(f => { try { unlinkSync(join(dlDir, f)) } catch { /* ignore */ } })

    // Use canonical version-based filename regardless of what the server reports.
    // Server filename can lag behind the version field (e.g. version=1.1.0 but
    // filename=beja-bootstrap-1.0.9.jar), which causes getLocalVersion to always
    // see the old version and re-download on every launch.
    const dest = join(dlDir, `beja-bootstrap-${remote.version}.jar`)
    await downloadFile(remote.url, dest, pct => {
      onStatus(`Downloading BejaClient ${remote.version}… ${pct}%`)
    })

    if (!hasValidZipEnd(dest)) {
      try { unlinkSync(dest) } catch { /* ignore */ }
      throw new Error('Downloaded bootstrap JAR is not a valid zip (truncated download?)')
    }

    if (remote.sha256) {
      onLog('[BejaClient] Verifying bootstrap checksum…')
      const actual = await computeSha256(dest)
      if (actual !== remote.sha256.toLowerCase()) {
        try { unlinkSync(dest) } catch { /* ignore */ }
        throw new Error(`Bootstrap checksum mismatch — expected ${remote.sha256} got ${actual}`)
      }
      onLog('[BejaClient] Bootstrap checksum OK.')
    }

    // Adapter JAR — must live next to bootstrap so AdapterLocator finds it
    if (remote.adapterUrl && remote.adapterFilename) {
      onLog(`[BejaClient] Downloading ${remote.adapterFilename}…`)

      readdirSync(dlDir)
        .filter(f => f.startsWith('beja-v') && f.endsWith('.jar') && !f.includes('-sources') && !f.includes('-dev'))
        .forEach(f => { try { unlinkSync(join(dlDir, f)) } catch { /* ignore */ } })

      const adapterDest = join(dlDir, remote.adapterFilename)
      await downloadFile(remote.adapterUrl, adapterDest, pct => {
        onStatus(`Downloading adapter ${remote.version}… ${pct}%`)
      })

      if (!hasValidZipEnd(adapterDest)) {
        try { unlinkSync(adapterDest) } catch { /* ignore */ }
        throw new Error('Downloaded adapter JAR is not a valid zip (truncated download?)')
      }

      if (remote.adapterSha256) {
        onLog('[BejaClient] Verifying adapter checksum…')
        const actual = await computeSha256(adapterDest)
        if (actual !== remote.adapterSha256.toLowerCase()) {
          try { unlinkSync(adapterDest) } catch { /* ignore */ }
          throw new Error(`Adapter checksum mismatch — expected ${remote.adapterSha256} got ${actual}`)
        }
        onLog('[BejaClient] Adapter checksum OK.')
      }

      onLog(`[BejaClient] Adapter downloaded → ${adapterDest}`)
    } else {
      onLog('[BejaClient] No adapter URL in version manifest — adapter not updated.')
    }

    onLog(`[BejaClient] Update complete → ${dest}`)
  } catch (err) {
    // Non-fatal: log the error but let the launcher continue
    onLog(`[BejaClient] Update check skipped: ${String(err)}`)
  }
}
