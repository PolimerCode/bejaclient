import { IpcMain } from 'electron'
import http from 'http'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getBejaToken } from '../services/bejaAuth'

const API_HOST = '206.217.141.184'
const API_PORT = 3093

function apiGet(apiPath: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: API_HOST, port: API_PORT, path: apiPath, method: 'GET' }, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(data) } })
    })
    req.on('error', reject)
    req.end()
  })
}

function apiPost(apiPath: string, token: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
      'Content-Length': 0,
      'Authorization': `Bearer ${token}`,
    }
    const req = http.request({ hostname: API_HOST, port: API_PORT, path: apiPath, method: 'POST', headers }, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(data) } })
    })
    req.on('error', reject)
    req.end()
  })
}

function uploadCape(filePath: string, name: string, token: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath)
    const ext         = path.extname(filePath).toLowerCase()
    const mime        = ext === '.png' ? 'image/png' : 'image/jpeg'
    const filename    = `cape${ext}`
    const boundary    = `----BejaCapeBoundary${crypto.randomBytes(8).toString('hex')}`

    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`),
      fileContent,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])

    const req = http.request({
      hostname: API_HOST,
      port:     API_PORT,
      path:     '/api/capes',
      method:   'POST',
      headers:  {
        'Content-Type':   `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'Authorization':  `Bearer ${token}`,
      },
    }, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(data) } })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

export function setupCapesHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('capes:list', (_e, offset = 0) =>
    apiGet(`/api/capes?limit=50&offset=${offset}`)
  )

  ipcMain.handle('capes:upload', async (_e, filePath: string, name: string) => {
    const token = await getBejaToken()
    if (!token) return { error: 'not_logged_in' }
    return uploadCape(filePath, name, token)
  })

  ipcMain.handle('capes:report', async (_e, id: number) => {
    const token = await getBejaToken()
    if (!token) return { error: 'not_logged_in' }
    return apiPost(`/api/capes/${id}/report`, token)
  })
}
