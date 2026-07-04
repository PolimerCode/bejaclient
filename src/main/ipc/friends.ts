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
  if (!account) { console.log('[Friends] getOrFetchBejaToken: no selected account'); return null }
  if (account.bejaToken) return account.bejaToken
  console.log('[Friends] getOrFetchBejaToken: no cached token, fetching from', API_HOST, API_PORT)
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
          console.log('[Friends] getOrFetchBejaToken: login response status', res.statusCode, 'body', data)
          try { resolve((JSON.parse(data) as { token?: string }).token ?? null) } catch { resolve(null) }
        })
      })
      req.on('error', e => { console.log('[Friends] getOrFetchBejaToken: request error', e.message); resolve(null) })
      req.setTimeout(5000, () => { console.log('[Friends] getOrFetchBejaToken: request timed out'); req.destroy(); resolve(null) })
      req.write(body)
      req.end()
    })
    if (token) {
      const accounts = loadAccounts()
      const idx = accounts.findIndex(a => a.id === account.id)
      if (idx >= 0) { accounts[idx].bejaToken = token; saveAccounts(accounts) }
      return token
    }
  } catch (e) { console.log('[Friends] getOrFetchBejaToken: unexpected error', e) }
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
    try {
      const token = await getOrFetchBejaToken()
      console.log('[Friends] sendRequest: token present?', !!token)
      if (!token) return { error: 'not_logged_in' }
      // Look up by username in BejaClient server (works for cracked + premium)
      const serverUser = await apiRequest('GET', `/api/users/lookup/${encodeURIComponent(username)}`, token) as { uuid?: string; error?: string }
      console.log('[Friends] sendRequest: lookup result:', serverUser)
      if (serverUser?.uuid) {
        const result = await apiRequest('POST', '/api/friends/request', token, { targetUuid: serverUser.uuid })
        console.log('[Friends] sendRequest: request result (beja user):', result)
        return result
      }
      // Fall back to Mojang for users not yet registered on BejaClient.
      // Keep the UUID undashed here — that's the format used everywhere else
      // (JWT payload, users.uuid, the server's online-socket map), unlike the
      // dashed format used for display purposes elsewhere in this file.
      const profile = await mojangLookup(username)
      console.log('[Friends] sendRequest: mojang lookup:', profile)
      if (!profile) return { error: 'not_found' }
      const result = await apiRequest('POST', '/api/friends/request', token, { targetUuid: profile.id, targetUsername: profile.name })
      console.log('[Friends] sendRequest: request result (mojang fallback):', result)
      return result
    } catch (err) {
      console.error('[Friends] sendRequest failed:', err)
      return { error: 'error' }
    }
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

  ipcMain.handle('players:beja-profile', async (_e, uuid: string) => {
    const token = await getOrFetchBejaToken()
    if (!token) return null
    const res = await apiRequest('GET', `/api/users/profile/${encodeURIComponent(uuid)}`, token)
      .catch(() => null) as { error?: string } | null
    if (!res || res.error) return null
    return res
  })

  ipcMain.handle('players:mc-created', (_e, uuid: string): Promise<string | null> => {
    // Mojang has no official account-creation-date API; Ashcon is best-effort
    return new Promise(resolve => {
      const req = https.get({
        hostname: 'api.ashcon.app',
        path:     `/mojang/v2/user/${encodeURIComponent(uuid)}`,
        headers:  { 'User-Agent': 'BejaClient' },
      }, res => {
        if (res.statusCode !== 200) { res.resume(); return resolve(null) }
        let data = ''
        res.on('data', c => (data += c))
        res.on('end', () => {
          try { resolve((JSON.parse(data) as { created_at?: string }).created_at ?? null) }
          catch { resolve(null) }
        })
      })
      req.on('error', () => resolve(null))
      req.setTimeout(6000, () => { req.destroy(); resolve(null) })
    })
  })

  ipcMain.handle('players:search', async (_e, query: string) => {
    const q = String(query ?? '').trim()
    if (q.length < 2) return []
    const token = await getOrFetchBejaToken()
    // BejaClient users by prefix + exact Mojang account match, in parallel
    const [bejaRows, mojang] = await Promise.all([
      token
        ? apiRequest('GET', `/api/users/search?q=${encodeURIComponent(q)}`, token).catch(() => [])
        : Promise.resolve([]),
      mojangLookup(q),
    ])
    const results: { uuid: string; username: string; source: 'beja' | 'mojang' }[] = []
    for (const r of (Array.isArray(bejaRows) ? bejaRows : []) as { uuid: string; username: string }[]) {
      results.push({ uuid: r.uuid, username: r.username, source: 'beja' })
    }
    if (mojang && !results.some(r => r.uuid.replace(/-/g, '') === mojang.id)) {
      results.push({ uuid: addUuidDashes(mojang.id), username: mojang.name, source: 'mojang' })
    }
    return results
  })

  ipcMain.handle('players:capes', (_e, uuid: string): Promise<{ service: string; capeUrl: string }[]> => {
    // capes.dev aggregates current capes across services; unequipped Mojang capes are not public
    const SERVICE_LABELS: Record<string, string> = {
      minecraft:      'Vanilla',
      optifine:       'OptiFine',
      minecraftcapes: 'MinecraftCapes',
      labymod:        'LabyMod',
      '5zig':         '5zig',
      tlauncher:      'TLauncher',
      skinmc:         'SkinMC',
    }
    return new Promise(resolve => {
      const req = https.get({
        hostname: 'api.capes.dev',
        path:     `/load/${encodeURIComponent(uuid)}`,
        headers:  { 'User-Agent': 'BejaClient' },
      }, res => {
        if (res.statusCode !== 200) { res.resume(); return resolve([]) }
        let data = ''
        res.on('data', c => (data += c))
        res.on('end', () => {
          try {
            const json = JSON.parse(data) as Record<string, { exists?: boolean; imageUrl?: string }>
            const capes: { service: string; capeUrl: string }[] = []
            for (const [service, cape] of Object.entries(json)) {
              if (cape?.exists && cape.imageUrl) {
                capes.push({ service: SERVICE_LABELS[service] ?? service, capeUrl: cape.imageUrl })
              }
            }
            resolve(capes)
          } catch { resolve([]) }
        })
      })
      req.on('error', () => resolve([]))
      req.setTimeout(8000, () => { req.destroy(); resolve([]) })
    })
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

  ipcMain.handle('chat:typing', (_e, toUuid: string) => {
    emitLobbyEvent('chat:typing', { toUuid })
  })

  ipcMain.handle('stats:online', async () => {
    const res = await apiRequest('GET', '/api/stats/online', '').catch(() => null) as { count?: number } | null
    return res?.count ?? 0
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
