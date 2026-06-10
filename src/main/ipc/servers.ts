import { IpcMain, BrowserWindow } from 'electron'
import { getStaticList, pingServer, addServer, removeServer, addServerToProfile } from '../services/serverPingService'
import { recordServerAdd } from '../services/installTracker'

export function setupServerHandlers(ipcMain: IpcMain, mainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('servers:list', (_e) => {
    const list = getStaticList()

    // Ping each server in background — send result as it arrives
    for (const s of list) {
      pingServer(s.host, s.port)
        .then(status => {
          mainWindow()?.webContents.send('servers:ping-result', {
            id:            s.id,
            online:        true,
            favicon:       status.favicon,
            version:       status.version,
            playersOnline: status.playersOnline,
            playersMax:    status.playersMax,
            motd:          status.motd,
            ping:          status.ping,
          })
        })
        .catch(() => { /* stays offline */ })
    }

    return list
  })

  ipcMain.handle('servers:ping', async (_e, host: string, port: number) => {
    try { return await pingServer(host, port) } catch { return null }
  })

  ipcMain.handle('servers:add', (_e, host: string, port: number, name: string) => {
    return addServer(host, port, name)
  })

  ipcMain.handle('servers:remove', (_e, id: string) => {
    removeServer(id)
    return true
  })

  ipcMain.handle('servers:add-to-profile', (_e, host: string, port: number, name: string, favicon: string | null, profileId: string) => {
    addServerToProfile(host, port, name, favicon, profileId)
    recordServerAdd(host, port, profileId)
    return true
  })
}
