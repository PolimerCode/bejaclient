import { IpcMain, BrowserWindow } from 'electron'
import { emitLobbyEvent } from '../services/bejaSocketService'
import { launchGame } from '../services/launchService'
import { getSettings } from '../services/settingsService'
import { setPlayingPresence, setIdlePresence } from '../services/discordRPC'
import { getProfile } from '../services/profileService'
import {
  openConsoleWindow,
  sendConsoleLog,
  sendConsoleStatus,
  sendConsoleClear,
} from '../services/consoleWindowService'

export function setupLobbyHandlers(ipcMain: IpcMain, getWindow: () => BrowserWindow | null): void {
  // Relay any lobby socket event from renderer → server
  ipcMain.handle('lobby:emit', (_e, event: string, data: unknown) => {
    emitLobbyEvent(event, data)
  })

  // Launch game with auto-connect to a server (used by party leader flow)
  ipcMain.handle('launch:start-server', async (event, profileId: string, server: string, port: number) => {
    const win = getWindow()
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
          if (getSettings().launcher.closeOnLaunch) win?.hide()
        }
        if (status.startsWith('stopped')) {
          setIdlePresence()
          if (getSettings().launcher.keepLauncherOpen) win?.show()
        }
      },
      // Pass --server / --port as extra Minecraft CLI args for direct connect
      ['--server', server, '--port', String(port)],
    )
  })
}
