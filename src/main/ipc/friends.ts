import { IpcMain, BrowserWindow, app } from 'electron'
import https from 'https'
import http from 'http'
import fs from 'fs'
import nodePath from 'path'
import { getSelectedAccount, loadAccounts, saveAccounts } from '../services/authService'
import { connectBejaSocket, disconnectBejaSocket, emitLobbyEvent } from '../services/bejaSocketService'

const API_HOST = '206.217.141.184'
const API_PORT = 3093

function apiRequest(method: string, path: string, token: string, body?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : ''
    const req = http.request({
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    }, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(data) } })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

function mojangLookup(username: string): Promise<{ id: string; name: string } | null> {
  return new Promise(resolve => {
    https.get(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
      res => {
        if (res.statusCode === 204 || res.statusCode === 404) return resolve(null)
        let data = ''
        res.on('data', c => (data += c))
        res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(null) } })
      },
    ).on('error', () => resolve(null))
  })
}

function addUuidDashes(id: string): string {
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
}

function fetchPlayerTextures(uuidNoDashes: string): Promise<{ skinUrl: string | null; capeUrl: string | null; skinModel: 'default' | 'slim' }> {
  return new Promise(resolve => {
    https.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuidNoDashes}`, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        try {
          const profile = JSON.parse(data)
          const texProp = profile.properties?.find((p: { name: string }) => p.name === 'textures')
          if (!texProp) return resolve({ skinUrl: null, capeUrl: null, skinModel: 'default' })
          const texJson = JSON.parse(Buffer.from(texProp.value, 'base64').toString())
          const skin = texJson.textures?.SKIN
          const cape = texJson.textures?.CAPE
          resolve({
            skinUrl:   skin?.url ?? null,
            capeUrl:   cape?.url ?? null,
            skinModel: skin?.metadata?.model === 'slim' ? 'slim' : 'default',
          })
        } catch { resolve({ skinUrl: null, capeUrl: null, skinModel: 'default' }) }
      })
    }).on('error', () => resolve({ skinUrl: null, capeUrl: null, skinModel: 'default' }))
  })
}

async function getOrFetchBejaToken(): Promise<string | null> {
  const account = getSelectedAccount()
  if (!account) return null
  if (account.bejaToken) return account.bejaToken
  // Account predates bejaToken — fetch one now and persist it
  try {
    const token = await new Promise<string | null>(resolve => {
      const body = JSON.stringify({ uuid: account.uuid, username: account.username })
      const req = http.request({
        hostname: API_HOST, port: API_PORT, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, res => {
        let data = ''
        res.on('data', c => (data += c))
        res.on('end', () => {
          try { resolve((JSON.parse(data) as { token?: string }).token ?? null) } catch { resolve(null) }
        })
      })
      req.on('error', () => resolve(null))
      req.write(body)
      req.end()
    })
    if (token) {
      const accounts = loadAccounts()
      const idx = accounts.findIndex(a => a.id === account.id)
      if (idx >= 0) { accounts[idx].bejaToken = token; saveAccounts(accounts) }
      return token
    }
  } catch { /* non-fatal */ }
  return null
}

export function setupFriendsHandlers(ipcMain: IpcMain, getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('friends:connect', async () => {
    const token = await getOrFetchBejaToken()
    if (!token) return false
    connectBejaSocket(token, getWindow)
    return true
  })

  ipcMain.handle('friends:disconnect', () => {
    disconnectBejaSocket()
  })

  ipcMain.handle('friends:list', async () => {
    const account = getSelectedAccount()
    const token = await getOrFetchBejaToken()
    if (!account || !token) return []
    return apiRequest('GET', `/api/friends/${account.uuid}`, token)
  })

  ipcMain.handle('friends:request', async (_e, username: string) => {
    const token = await getOrFetchBejaToken()
    if (!token) return { error: 'not_logged_in' }
    // Look up by username in BejaClient server (works for cracked + premium)
    const serverUser = await apiRequest('GET', `/api/users/lookup/${encodeURIComponent(username)}`, token) as { uuid?: string; error?: string }
    if (serverUser?.uuid) {
      return apiRequest('POST', '/api/friends/request', token, { targetUuid: serverUser.uuid })
    }
    // Fall back to Mojang for users not yet registered on BejaClient
    const profile = await mojangLookup(username)
    if (!profile) return { error: 'not_found' }
    const targetUuid = addUuidDashes(profile.id)
    return apiRequest('POST', '/api/friends/request', token, { targetUuid })
  })

  ipcMain.handle('friends:accept', async (_e, requesterUuid: string) => {
    const token = await getOrFetchBejaToken()
    if (!token) return { error: 'not_logged_in' }
    return apiRequest('POST', '/api/friends/accept', token, { requesterUuid })
  })

  ipcMain.handle('friends:remove', async (_e, friendUuid: string) => {
    const token = await getOrFetchBejaToken()
    if (!token) return { error: 'not_logged_in' }
    return apiRequest('DELETE', `/api/friends/${friendUuid}`, token)
  })

  ipcMain.handle('players:fetchImage', (_e, url: string): Promise<string> => {
    function fetch(targetUrl: string, redirects = 5): Promise<string> {
      return new Promise(resolve => {
        const mod    = targetUrl.startsWith('https') ? https : http
        const UA     = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
        const req    = mod.get(targetUrl, { headers: { 'User-Agent': UA } }, res => {
          if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirects > 0) {
            res.resume()
            return fetch(res.headers.location, redirects - 1).then(resolve)
          }
          if (res.statusCode !== 200) { res.resume(); return resolve('') }
          const chunks: Buffer[] = []
          res.on('data', (c: Buffer) => chunks.push(c))
          res.on('end', () => {
            const mime = res.headers['content-type'] || 'image/png'
            resolve(`data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`)
          })
          res.on('error', () => resolve(''))
        })
        req.on('error', () => resolve(''))
        req.setTimeout(10000, () => { req.destroy(); resolve('') })
      })
    }
    return fetch(url)
  })

  ipcMain.handle('players:lookup', async (_e, username: string) => {
    const mojang = await mojangLookup(username)
    if (!mojang) return null
    const uuid     = addUuidDashes(mojang.id)
    const textures = await fetchPlayerTextures(mojang.id)
    return { uuid, username: mojang.name, ...textures }
  })

  ipcMain.handle('players:save-skin', async (_e, skinUrl: string, username: string) => {
    const dir  = nodePath.join(app.getPath('pictures'), 'BejaClient')
    fs.mkdirSync(dir, { recursive: true })
    const dest = nodePath.join(dir, `${username}_skin.png`)
    return new Promise<string>((resolve, reject) => {
      const mod = skinUrl.startsWith('https') ? https : http
      mod.get(skinUrl, res => {
        const out = fs.createWriteStream(dest)
        res.pipe(out)
        out.on('finish', () => resolve(dest))
        out.on('error', reject)
      }).on('error', reject)
    })
  })

  ipcMain.handle('chat:send', (_e, toUuid: string, content: string) => {
    emitLobbyEvent('chat:send', { toUuid, content })
  })

  ipcMain.handle('chat:history', async (_e, targetUuid: string) => {
    const token = await getOrFetchBejaToken()
    if (!token) return []
    return apiRequest('GET', `/api/chat/history/${targetUuid}`, token)
  })

  ipcMain.handle('players:mc-profile', (_e, accessToken: string) => {
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.minecraftservices.com',
        path:     '/minecraft/profile',
        method:   'GET',
        headers:  { Authorization: `Bearer ${accessToken}` },
      }, res => {
        let data = ''
        res.on('data', c => (data += c))
        res.on('end', () => {
          try { resolve(JSON.parse(data)) } catch { resolve(null) }
        })
      })
      req.on('error', reject)
      req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')) })
      req.end()
    })
  })
}
