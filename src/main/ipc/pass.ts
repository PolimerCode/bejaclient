import { IpcMain } from 'electron'
import http from 'http'
import { getBejaToken } from '../services/bejaAuth'

const API_HOST = '206.217.141.184'
const API_PORT = 3093

function apiRequest(method: string, path: string, token?: string, body?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : ''
    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const req = http.request({ hostname: API_HOST, port: API_PORT, path, method, headers }, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(data) } })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

export function setupPassHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('pass:get', () =>
    apiRequest('GET', '/api/pass')
  )

  ipcMain.handle('pass:progress', async () => {
    const token = await getBejaToken()
    if (!token) return { xp: 0, current_tier: 0, unlocked_cosmetics: [], daily_available: false }
    return apiRequest('GET', '/api/pass/progress', token)
  })

  ipcMain.handle('pass:daily', async () => {
    const token = await getBejaToken()
    if (!token) return { awarded: false }
    return apiRequest('POST', '/api/pass/daily', token)
  })
}
