import { createServer } from 'http'
import { createReadStream, existsSync } from 'fs'
import { join, basename } from 'path'
import { app } from 'electron'

export const CAPE_SERVER_PORT = 25588
export const BEJA_ORIGINAL_CAPE_URL = `http://127.0.0.1:${CAPE_SERVER_PORT}/beja-default.png`

export function startCapeServer(): void {
  const capeDir = app.isPackaged
    ? join(process.resourcesPath, 'capes')
    : join(__dirname, '../../resources/capes')

  const server = createServer((req, res) => {
    if (req.method !== 'GET') { res.writeHead(405).end(); return }

    const name = basename((req.url ?? '').split('?')[0])
    if (!name || !/^[\w\-]+\.png$/i.test(name)) { res.writeHead(400).end(); return }

    const file = join(capeDir, name)
    if (!existsSync(file)) { res.writeHead(404).end(); return }

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'no-store')
    createReadStream(file).pipe(res)
  })

  server.listen(CAPE_SERVER_PORT, '127.0.0.1', () => {
    console.log(`[CapeServer] http://127.0.0.1:${CAPE_SERVER_PORT}  dir=${capeDir}`)
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[CapeServer] Port ${CAPE_SERVER_PORT} already in use — skipping`)
    } else {
      console.error('[CapeServer] Error:', err)
    }
  })
}
