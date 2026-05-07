import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { BrowserWindow, app } from 'electron'

type LogFn = (level: 'INFO' | 'WARN' | 'ERROR', msg: string) => void

export function initAutoUpdater(getWindow: () => BrowserWindow | null, log: LogFn) {
  // Only run in packaged builds — dev has no release channel to check.
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false  // client-v* releases are pre-releases; ignore them
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => {
    log('INFO', 'updater: checking for update')
    getWindow()?.webContents.send('updater:checking')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log('INFO', `updater: update available — ${info.version}`)
    getWindow()?.webContents.send('updater:available', { version: info.version, releaseNotes: info.releaseNotes })
  })

  autoUpdater.on('update-not-available', () => {
    log('INFO', 'updater: no update available')
    getWindow()?.webContents.send('updater:not-available')
  })

  autoUpdater.on('error', (err: Error) => {
    log('ERROR', `updater: ${err?.message ?? err}`)
    getWindow()?.webContents.send('updater:error', err?.message ?? String(err))
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    getWindow()?.webContents.send('updater:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log('INFO', `updater: update downloaded — ${info.version}`)
    getWindow()?.webContents.send('updater:downloaded', { version: info.version })
  })

  // Check automatically after startup (give window time to load).
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err: Error) => {
      log('WARN', `updater: auto-check failed — ${err?.message ?? err}`)
    })
  }, 5000)

  return {
    checkForUpdates: () => autoUpdater.checkForUpdates(),
    downloadUpdate: () => autoUpdater.downloadUpdate(),
    quitAndInstall: () => autoUpdater.quitAndInstall(true, true),
  }
}
