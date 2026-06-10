import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import AdmZip from 'adm-zip'
import { app } from 'electron'
import { createProfile, getProfile } from './profileService'
import { getSettings } from './settingsService'

const API = 'https://api.modrinth.com/v2'
const UA = 'BejaClient/1.0 (bejaclient.pages.dev)'

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function get(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    ;(lib as typeof https).get(url, { headers: { 'User-Agent': UA } }, res => {
      if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume()
        return get(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        const status = res.statusCode ?? 200
        if (status < 200 || status >= 300) {
          return reject(new Error(`Modrinth API error ${status}: ${data.slice(0, 200)}`))
        }
        resolve(data)
      })
    }).on('error', reject)
  })
}

function downloadFile(url: string, dest: string, redirects = 0): Promise<void> {
  if (redirects > 8) return Promise.reject(new Error('Too many redirects'))
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    ;(lib as typeof https).get(url, { headers: { 'User-Agent': UA } }, res => {
      if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume()
        return downloadFile(res.headers.location, dest, redirects + 1).then(resolve).catch(reject)
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      const file = fs.createWriteStream(dest)
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
      file.on('error', err => { try { fs.unlinkSync(dest) } catch {} ; reject(err) })
      res.on('error', err => { try { fs.unlinkSync(dest) } catch {} ; reject(err) })
    }).on('error', reject)
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModrinthProjectType = 'mod' | 'modpack' | 'resourcepack' | 'shader' | 'datapack'

export interface ModrinthHit {
  project_id: string
  slug: string
  title: string
  description: string
  categories: string[]
  project_type: ModrinthProjectType
  downloads: number
  icon_url: string | null
  latest_version: string
  versions: string[]
  game_versions?: string[]
  loaders: string[]
}

export interface ModrinthVersion {
  id: string
  name: string
  version_number: string
  game_versions: string[]
  loaders: string[]
  files: { url: string; filename: string; primary: boolean; size: number }[]
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<{ name: string; project_type: string; header: string }[]> {
  const raw = await get(`${API}/tag/category`)
  return JSON.parse(raw)
}

export async function searchModrinth(
  query: string,
  projectType: ModrinthProjectType,
  gameVersion?: string,
  loader?: string,
  offset = 0,
  categories?: string[],
): Promise<{ hits: ModrinthHit[]; total_hits: number }> {
  const facets: string[][] = [[`project_type:${projectType}`]]
  if (gameVersion) facets.push([`versions:${gameVersion}`])
  if (loader && loader !== 'vanilla') facets.push([`categories:${loader}`])
  if (categories && categories.length > 0) facets.push(categories.map(c => `categories:${c}`))

  // Build URL manually — URLSearchParams double-encodes brackets on some Node versions
  const facetsStr = encodeURIComponent(JSON.stringify(facets))
  const queryStr  = encodeURIComponent(query)
  const url = `${API}/search?query=${queryStr}&facets=${facetsStr}&limit=20&offset=${offset}&index=downloads`

  const raw  = await get(url)
  const data = JSON.parse(raw)
  if (!Array.isArray(data.hits)) throw new Error(data.description ?? data.error ?? 'Unexpected Modrinth response')
  return data
}

// ── Versions ──────────────────────────────────────────────────────────────────

export async function getProjectVersions(
  projectId: string,
  gameVersion?: string,
  loader?: string,
): Promise<ModrinthVersion[]> {
  const params = new URLSearchParams()
  if (gameVersion) params.set('game_versions', JSON.stringify([gameVersion]))
  if (loader && loader !== 'vanilla') params.set('loaders', JSON.stringify([loader]))
  const suffix = params.toString() ? `?${params}` : ''
  const raw = await get(`${API}/project/${projectId}/version${suffix}`)
  return JSON.parse(raw)
}

// ── Generic file downloader (mod / resourcepack / shader) ─────────────────────

async function downloadToDir(
  projectId: string,
  destDir: string,
  gameVersion: string | undefined,
  loader: string | undefined,
  onProgress: (msg: string) => void,
): Promise<void> {
  onProgress('Finding compatible version…')
  const versions = await getProjectVersions(projectId, gameVersion, loader)
  const version = versions[0]
  if (!version) throw new Error('No compatible version found for this Minecraft version / loader')

  const file = version.files.find(f => f.primary) ?? version.files[0]
  if (!file) throw new Error('No downloadable file found')

  const dest = path.join(destDir, file.filename)
  onProgress(`Downloading ${file.filename}…`)
  await downloadFile(file.url, dest)
  onProgress('Done')
}

// ── Install specific version ──────────────────────────────────────────────────

export async function downloadModVersion(
  projectId: string,
  versionId: string,
  profileId: string,
  onProgress: (msg: string) => void,
): Promise<void> {
  const profile = getProfile(profileId)
  if (!profile) throw new Error('Profile not found')
  const settings = getSettings()
  const gameDir = profile.gameDir || settings.game.defaultGameDir

  onProgress('Fetching version info…')
  const version: ModrinthVersion = JSON.parse(await get(`${API}/version/${versionId}`))
  const file = version.files.find(f => f.primary) ?? version.files[0]
  if (!file) throw new Error('No downloadable file found')

  const dest = path.join(gameDir, 'mods', file.filename)
  onProgress(`Downloading ${file.filename}…`)
  await downloadFile(file.url, dest)
  onProgress('Done')
}

// ── Install mod ───────────────────────────────────────────────────────────────

export async function downloadMod(
  projectId: string,
  profileId: string,
  onProgress: (msg: string) => void,
): Promise<void> {
  const profile = getProfile(profileId)
  if (!profile) throw new Error('Profile not found')
  const settings = getSettings()
  const gameDir = profile.gameDir || settings.game.defaultGameDir
  await downloadToDir(projectId, path.join(gameDir, 'mods'), profile.version, profile.loader, onProgress)
}

// ── Install resource pack ─────────────────────────────────────────────────────

export async function downloadResourcePack(
  projectId: string,
  profileId: string,
  onProgress: (msg: string) => void,
): Promise<void> {
  const profile = getProfile(profileId)
  if (!profile) throw new Error('Profile not found')
  const settings = getSettings()
  const gameDir = profile.gameDir || settings.game.defaultGameDir
  await downloadToDir(projectId, path.join(gameDir, 'resourcepacks'), profile.version, undefined, onProgress)
}

// ── Install shader ────────────────────────────────────────────────────────────

export async function downloadShader(
  projectId: string,
  profileId: string,
  onProgress: (msg: string) => void,
): Promise<void> {
  const profile = getProfile(profileId)
  if (!profile) throw new Error('Profile not found')
  const settings = getSettings()
  const gameDir = profile.gameDir || settings.game.defaultGameDir
  await downloadToDir(projectId, path.join(gameDir, 'shaderpacks'), profile.version, undefined, onProgress)
}

// ── Install datapack ──────────────────────────────────────────────────────────

export async function downloadDatapack(
  projectId: string,
  profileId: string,
  onProgress: (msg: string) => void,
): Promise<void> {
  const profile = getProfile(profileId)
  if (!profile) throw new Error('Profile not found')
  const settings = getSettings()
  const gameDir = profile.gameDir || settings.game.defaultGameDir
  await downloadToDir(projectId, path.join(gameDir, 'datapacks'), profile.version, undefined, onProgress)
}

// ── Install modpack ───────────────────────────────────────────────────────────

export interface ModpackInstallResult {
  profileId: string
  name: string
}

export async function installModpack(
  projectId: string,
  versionId: string | null,
  onProgress: (msg: string) => void,
): Promise<ModpackInstallResult> {
  onProgress('Fetching modpack info…')
  const projectRaw = await get(`${API}/project/${projectId}`)
  const project = JSON.parse(projectRaw)

  let version: ModrinthVersion
  if (versionId) {
    version = JSON.parse(await get(`${API}/version/${versionId}`))
  } else {
    const versions = await getProjectVersions(projectId)
    if (!versions.length) throw new Error('No versions found')
    version = versions[0]
  }

  const mrpackFile = version.files.find(f => f.primary) ?? version.files[0]
  if (!mrpackFile) throw new Error('No modpack file found')

  onProgress('Downloading modpack…')
  const tmpPath = path.join(app.getPath('temp'), `${projectId}-${Date.now()}.mrpack`)
  await downloadFile(mrpackFile.url, tmpPath)

  onProgress('Reading modpack manifest…')
  const zip = new AdmZip(tmpPath)
  const indexEntry = zip.getEntry('modrinth.index.json')
  if (!indexEntry) throw new Error('Invalid mrpack: missing modrinth.index.json')
  const index = JSON.parse(indexEntry.getData().toString('utf-8'))

  const mcVersion: string = index.dependencies?.minecraft ?? version.game_versions?.[0] ?? ''
  const fabricVer: string | undefined = index.dependencies?.['fabric-loader']
  const forgeVer: string | undefined  = index.dependencies?.['forge']
  const quiltVer: string | undefined  = index.dependencies?.['quilt-loader']
  const loader = fabricVer ? 'fabric' : forgeVer ? 'forge' : quiltVer ? 'quilt' : 'vanilla'
  const loaderVersion = fabricVer ?? forgeVer ?? quiltVer ?? ''

  const settings = getSettings()
  const profileName = project.title as string
  const safeName = profileName.replace(/[^a-zA-Z0-9_\- ]/g, '')
  const gameDir = path.join(settings.game.defaultGameDir, 'modpacks', safeName)
  fs.mkdirSync(gameDir, { recursive: true })

  const modFiles: { path: string; downloads: string[] }[] = index.files ?? []
  for (let i = 0; i < modFiles.length; i++) {
    onProgress(`Downloading mod ${i + 1} / ${modFiles.length}…`)
    const modFile = modFiles[i]
    const dest = path.join(gameDir, modFile.path)
    if (!fs.existsSync(dest)) {
      try { await downloadFile(modFile.downloads[0], dest) } catch { /* skip on error */ }
    }
  }

  onProgress('Applying overrides…')
  zip.getEntries().forEach(entry => {
    const prefix = 'overrides/'
    if (entry.entryName.startsWith(prefix) && !entry.isDirectory) {
      const dest = path.join(gameDir, entry.entryName.slice(prefix.length))
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, entry.getData())
    }
  })

  try { fs.unlinkSync(tmpPath) } catch {}

  const profile = createProfile({
    name: profileName,
    version: mcVersion,
    loader: loader as any,
    loaderVersion,
    gameDir,
    minRam: 1024,
    maxRam: settings.game.maxRam,
    javaPath: settings.game.defaultJavaPath,
    jvmArgs: '',
    resolution: settings.game.resolution,
    useBejaClient: false,
  })

  onProgress('Done')
  return { profileId: profile.id, name: profileName }
}
