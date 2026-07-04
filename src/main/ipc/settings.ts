import { IpcMain, dialog, shell, app } from 'electron'
import { getSettings, saveSettings, AppSettings } from '../services/settingsService'
import * as https from 'https'
import { scanLocalJava } from '../services/mcinstall'

function fetchNews(): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    https
      .get('https://launchercontent.mojang.com/news.json', res => {
        let data = ''
        res.on('data', c => (data += c))
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            resolve(parsed.entries ?? [])
          } catch {
            resolve([])
          }
        })
      })
      .on('error', reject)
  })
}

export function setupSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:set', (_e, settings: AppSettings) => {
    saveSettings(settings)
    return true
  })

  ipcMain.handle('settings:game-dir', () => {
    return getSettings().game.defaultGameDir
  })

  ipcMain.handle('settings:set-game-dir', (_e, dir: string) => {
    const settings = getSettings()
    settings.game.defaultGameDir = dir
    saveSettings(settings)
    return true
  })

  ipcMain.handle('settings:choose-dir', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Game Directory',
      properties: ['openDirectory'],
    })
    if (result.canceled || !result.filePaths.length) return null
    return result.filePaths[0]
  })

  ipcMain.handle('settings:choose-java', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Java Executable',
      filters: [
        { name: 'Java', extensions: ['exe', ''] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths.length) return null
    return result.filePaths[0]
  })

  ipcMain.handle('news:fetch', async () => {
    try {
      return await fetchNews()
    } catch {
      return []
    }
  })

  ipcMain.handle('system:open-external', (_e, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('system:get-version', () => app.getVersion())

  ipcMain.handle('system:java-versions', async () => {
    try {
      return await scanLocalJava()
    } catch {
      return []
    }
  })
}
