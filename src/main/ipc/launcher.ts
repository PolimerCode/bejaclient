import { IpcMain, BrowserWindow, dialog, ipcMain as _ipcMain } from 'electron'
import { writeFileSync } from 'fs'
import { launchGame, killGame, isRunning } from '../services/launchService'
import {
  listProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  getProfile,
} from '../services/profileService'
import { getSettings, saveSettings } from '../services/settingsService'
import { setIdlePresence, setPlayingPresence } from '../services/discordRPC'
import {
  openConsoleWindow,
  sendConsoleLog,
  sendConsoleStatus,
  sendConsoleClear,
} from '../services/consoleWindowService'

export function setupLaunchHandlers(ipcMain: IpcMain, mainWindow: BrowserWindow | null): void {
  ipcMain.on('launch:open-console', () => openConsoleWindow())

  ipcMain.handle('launch:start', async (event, profileId: string) => {
    sendConsoleClear()
    openConsoleWindow()
    await launchGame(
      profileId,
      line => {
        event.sender.send('launch:log', line)
        sendConsoleLog(line)
      },
      status => {
        event.sender.send('launch:status', status)
        sendConsoleStatus(status)
        if (status === 'running') {
          const profile = getProfile(profileId)
          setPlayingPresence(profile?.version)
          if (getSettings().launcher.closeOnLaunch) mainWindow?.hide()
        }
        if (status.startsWith('stopped')) {
          setIdlePresence()
          if (getSettings().launcher.keepLauncherOpen) mainWindow?.show()
        }
      },
    )
  })

  ipcMain.handle('launch:kill', () => {
    killGame()
    return true
  })

  ipcMain.handle('launch:is-running', () => isRunning())

  ipcMain.handle('launch:save-logs', async (_e, lines: string[]) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Game Log',
      defaultPath: `bejaclient-log-${Date.now()}.txt`,
      filters: [{ name: 'Text Files', extensions: ['txt'] }],
    })
    if (!filePath) return false
    writeFileSync(filePath, lines.join('\n'), 'utf-8')
    return true
  })

  ipcMain.handle('profiles:list', () => listProfiles())

  ipcMain.handle('profiles:create', (_e, data: Parameters<typeof createProfile>[0]) => {
    return createProfile(data)
  })

  ipcMain.handle('profiles:update', (_e, id: string, data: Parameters<typeof updateProfile>[1]) => {
    return updateProfile(id, data)
  })

  ipcMain.handle('profiles:delete', (_e, id: string) => {
    return deleteProfile(id)
  })

  ipcMain.handle('profiles:get-active', () => {
    const settings = getSettings()
    if (!settings.activeProfileId) return null
    return getProfile(settings.activeProfileId)
  })

  ipcMain.handle('profiles:set-active', (_e, id: string) => {
    const settings = getSettings()
    settings.activeProfileId = id
    saveSettings(settings)
    return getProfile(id)
  })
}
