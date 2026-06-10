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

export function setupCosmeticsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('cosmetics:get', (_e, uuid: string) =>
    apiRequest('GET', `/api/cosmetics/${uuid}`)
  )

  ipcMain.handle('cosmetics:update', async (_e, data: { cape_url?: string | null; cape_type?: string; equipped?: string[] }) => {
    const token = await getBejaToken()
    if (!token) return { error: 'not_logged_in' }
    return apiRequest('PUT', '/api/cosmetics/', token, data)
  })
}
