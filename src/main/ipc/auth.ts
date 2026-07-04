import { IpcMain, BrowserWindow } from 'electron'
import {
  loginWithMicrosoft,
  loadAccounts,
  logoutAccount,
  selectAccount,
  refreshAccount,
  importFromOfficialLauncher,
} from '../services/authService'

export function setupAuthHandlers(ipcMain: IpcMain, mainWindow: BrowserWindow | null): void {
  ipcMain.handle('auth:login', async () => {
    mainWindow?.webContents.send('auth:browser-opened')
    return await loginWithMicrosoft(mainWindow)
  })

  ipcMain.handle('auth:logout', (_e, id: string) => {
    logoutAccount(id)
    return true
  })

  ipcMain.handle('auth:list-accounts', () => loadAccounts())

  ipcMain.handle('auth:select-account', (_e, id: string) => {
    selectAccount(id)
    return loadAccounts()
  })

  ipcMain.handle('auth:refresh', async (_e, id: string) => {
    return await refreshAccount(id)
  })

  ipcMain.handle('auth:import-launcher', async () => {
    return await importFromOfficialLauncher()
  })
}
