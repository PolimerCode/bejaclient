import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import { getSettings } from './settingsService'
import { getProfile } from './profileService'

const CF_API = 'https://api.curseforge.com/v1'
const UA     = 'BejaClient/1.0 (bejaclient.pages.dev)'

// Minecraft game ID on CurseForge
const MC_GAME_ID = 432

const CLASS_IDS: Record<string, number> = {
  mod:         6,
  modpack:     4471,
  shader:      6552,
  resourcepack: 12,
  datapack:    6945,
}

const LOADER_IDS: Record<string, number> = {
  forge:    1,
  fabric:   4,
  quilt:    5,
  neoforge: 6,
}

export interface CurseforgeHit {
  id: number
  name: string
  summary: string
  downloadCount: number
  logo: { url: string; thumbnailUrl: string } | null
  categories: { id: number; name: string }[]
  slug: string
}

function cfGet(urlPath: string, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `${CF_API}${urlPath}`
    const opts = {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': UA,
      },
    }
    https.get(url, opts, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        const status = res.statusCode ?? 200
        if (status < 200 || status >= 300) {
          return reject(new Error(`CurseForge API error ${status}: ${data.slice(0, 200)}`))
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

export async function installCurseforgeMod(
  modId: string,
  projectType: string,
  profileId: string,
  onProgress: (msg: string) => void,
): Promise<void> {
  const settings = getSettings()
  const apiKey = settings.launcher.curseforgeApiKey
  if (!apiKey) throw new Error('CurseForge API key not configured in Settings')

  const profile = getProfile(profileId)
  if (!profile) throw new Error('Profile not found')
  const gameDir = profile.gameDir || settings.game.defaultGameDir

  const destDir = {
    mod:          path.join(gameDir, 'mods'),
    shader:       path.join(gameDir, 'shaderpacks'),
    resourcepack: path.join(gameDir, 'resourcepacks'),
    datapack:     path.join(gameDir, 'datapacks'),
  }[projectType] ?? path.join(gameDir, 'mods')

  onProgress('Fetching file info…')
  const raw  = await cfGet(`/mods/${modId}/files?pageSize=20&sortOrder=desc&index=0`, apiKey)
  const data = JSON.parse(raw)
  const file = (data.data as any[])?.[0]
  if (!file) throw new Error('No files found')

  const downloadUrl: string | undefined = file.downloadUrl
  if (!downloadUrl) throw new Error('Download restricted — check mod page on CurseForge')

  const dest = path.join(destDir, file.fileName as string)
  onProgress(`Downloading ${file.fileName}…`)
  await downloadFile(downloadUrl, dest)
  onProgress('Done')
}

export async function searchCurseforge(
  query: string,
  projectType: string,
  gameVersion?: string,
  loader?: string,
  offset = 0,
): Promise<{ hits: CurseforgeHit[]; total: number }> {
  const settings = getSettings()
  const apiKey = settings.launcher.curseforgeApiKey
  if (!apiKey) throw new Error('CurseForge API key not configured')

  const classId = CLASS_IDS[projectType]
  if (!classId) return { hits: [], total: 0 }

  const params = new URLSearchParams({
    gameId:      String(MC_GAME_ID),
    classId:     String(classId),
    searchFilter: query,
    pageSize:    '20',
    index:       String(offset),
    sortField:   '6',  // total downloads
    sortOrder:   'desc',
  })

  if (gameVersion) params.set('gameVersion', gameVersion)
  if (loader && loader !== 'vanilla') {
    const loaderId = LOADER_IDS[loader]
    if (loaderId) params.set('modLoaderType', String(loaderId))
  }

  const raw  = await cfGet(`/mods/search?${params}`, apiKey)
  const data = JSON.parse(raw)
  return {
    hits:  data.data   ?? [],
    total: data.pagination?.totalCount ?? 0,
  }
}
