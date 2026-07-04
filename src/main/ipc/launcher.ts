import { IpcMain, BrowserWindow, dialog, ipcMain as _ipcMain } from 'electron'
import { showTray, hideTray } from '../services/trayService'
import { writeFileSync, readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
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
    try {
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
            if (getSettings().launcher.closeOnLaunch) {
              mainWindow?.hide()
              showTray()
            }
          }
          if (status.startsWith('stopped')) {
            setIdlePresence()
            hideTray()
            if (getSettings().launcher.keepLauncherOpen) mainWindow?.show()
          }
        },
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      event.sender.send('launch:log', `[Launcher] Error: ${message}`)
      sendConsoleLog(`[Launcher] Error: ${message}`)
      throw e
    }
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

  ipcMain.handle('profiles:export', async (_e, id: string) => {
    const profile = getProfile(id)
    if (!profile) return { ok: false, error: 'Profile not found' }
    const settings = getSettings()
    const gameDir = profile.gameDir || settings.game.defaultGameDir
    const modsDir = join(gameDir, 'mods')
    const mods = existsSync(modsDir)
      ? readdirSync(modsDir).filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'))
      : []
    const pack = {
      bejaPackVersion: 1,
      exportedAt: Date.now(),
      profile: { ...profile },
      mods,
    }
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Profile Pack',
      defaultPath: `${profile.name.replace(/[^a-z0-9]/gi, '_')}.beja`,
      filters: [{ name: 'BejaClient Pack', extensions: ['beja'] }],
    })
    if (!filePath) return { ok: false, error: 'cancelled' }
    writeFileSync(filePath, JSON.stringify(pack, null, 2), 'utf-8')
    return { ok: true, mods: mods.length }
  })

  ipcMain.handle('profiles:import', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Profile Pack',
      filters: [{ name: 'BejaClient Pack', extensions: ['beja'] }],
      properties: ['openFile'],
    })
    if (!filePaths[0]) return null
    try {
      const raw = JSON.parse(readFileSync(filePaths[0], 'utf-8'))
      if (raw.bejaPackVersion !== 1) return { error: 'Unsupported pack version' }
      const { id: _id, createdAt: _c, lastPlayed: _l, ...profileData } = raw.profile
      const newProfile = createProfile(profileData)
      return { profile: newProfile, mods: raw.mods as string[] }
    } catch (e) {
      return { error: String(e) }
    }
  })
}
