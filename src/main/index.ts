import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { setupAuthHandlers } from './ipc/auth'
import { setupVersionHandlers } from './ipc/versions'
import { setupLaunchHandlers } from './ipc/launcher'
import { setupModHandlers } from './ipc/mods'
import { setupSettingsHandlers } from './ipc/settings'
import { initDiscordRPC, destroyDiscordRPC } from './services/discordRPC'
import { setupModrinthHandlers } from './ipc/modrinth'
import { setupUpdaterHandlers } from './ipc/updater'
import { setupFriendsHandlers } from './ipc/friends'
import { setupLobbyHandlers } from './ipc/lobby'
import { setupCosmeticsHandlers } from './ipc/cosmetics'
import { setupPassHandlers } from './ipc/pass'
import { setupCapesHandlers } from './ipc/capes'
import { setupServerHandlers } from './ipc/servers'

// ── Crash logging ─────────────────────────────────────────────────────────────
// Runs before anything else so even early failures are captured.
const logDir = join(app.getPath('userData'), 'logs')
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
const logFile = join(logDir, `main-${new Date().toISOString().replace(/[:.]/g, '-')}.log`)
const logStream = createWriteStream(logFile, { flags: 'a' })

function log(level: 'INFO' | 'WARN' | 'ERROR', msg: string) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`
  process.stdout.write(line)
  logStream.write(line)
}

process.on('uncaughtException', (err) => {
  log('ERROR', `Uncaught exception: ${err?.stack ?? err}`)
  dialog.showErrorBox('BejaClient — Fatal Error', `An unexpected error occurred:\n\n${err?.message ?? err}\n\nCheck logs at:\n${logFile}`)
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  log('ERROR', `Unhandled rejection: ${reason instanceof Error ? reason.stack : String(reason)}`)
})

log('INFO', `BejaClient starting — packaged=${app.isPackaged} version=${app.getVersion()}`)

// ── Windows taskbar branding ──────────────────────────────────────────────────
// Must be called before app.whenReady() and must match build.appId in package.json.
// Without this, pinned taskbar entries show "Electron App" with the default icon.
app.setAppUserModelId('com.bejaclient.launcher')

// ── Dev / prod detection ──────────────────────────────────────────────────────
// Do NOT use process.env.NODE_ENV — it is not reliably set in packaged builds.
const isDev = !app.isPackaged

// ── Icon path ─────────────────────────────────────────────────────────────────
// In packaged mode the icon is copied to process.resourcesPath via extraResources.
// In dev mode it lives at ../../resources/icon.ico relative to this file.
function getIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.ico')
    : join(__dirname, '../../resources/icon.ico')
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  log('INFO', `Creating window — icon: ${getIconPath()}`)

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 1100,
    minHeight: 680,
    frame: false,
    transparent: false,
    backgroundColor: '#090909',
    title: 'BejaClient',
    resizable: true,
    show: false,
    icon: getIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    log('INFO', 'Window ready-to-show')
    mainWindow?.show()
    mainWindow?.maximize()
  })

  // Catch renderer load failures so the app never silently dies.
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log('ERROR', `Renderer failed to load: ${code} ${desc} — url: ${url}`)
    if (!isDev) {
      dialog.showErrorBox(
        'BejaClient — Load Error',
        `The launcher failed to load.\n\nCode: ${code}\nDetails: ${desc}\n\nCheck logs at:\n${logFile}`,
      )
    }
  })

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log('ERROR', `Render process gone: reason=${details.reason} exitCode=${details.exitCode}`)
  })

  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && input.key === 'I') ||
        (input.control && input.shift && input.key === 'J') ||
        (input.control && input.key === 'U')
      ) {
        event.preventDefault()
      }
    })
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools()
    })
  }

  if (isDev) {
    log('INFO', 'Loading dev URL http://localhost:5173')
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const rendererPath = join(__dirname, '../../dist/index.html')
    log('INFO', `Loading production renderer: ${rendererPath}`)
    mainWindow.loadFile(rendererPath).catch((err) => {
      log('ERROR', `loadFile failed: ${err}`)
      dialog.showErrorBox('BejaClient — Load Error', `Could not load renderer:\n${rendererPath}\n\n${err}`)
    })
  }

  mainWindow.on('closed', () => {
    log('INFO', 'Main window closed')
    mainWindow = null
  })

  mainWindow.on('maximize',   () => mainWindow?.webContents.send('window:maximized', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false))
}

function setupWindowHandlers() {
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => mainWindow?.close())
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)
}

app.on('before-quit', () => {
  log('INFO', 'App before-quit')
  destroyDiscordRPC()
})

app.whenReady().then(() => {
  log('INFO', 'app.whenReady fired')

  createWindow()
  setupWindowHandlers()
  setupAuthHandlers(ipcMain, mainWindow)
  setupVersionHandlers(ipcMain)
  setupLaunchHandlers(ipcMain, mainWindow)
  setupModHandlers(ipcMain)
  setupSettingsHandlers(ipcMain)
  setupModrinthHandlers(ipcMain, () => mainWindow)
  setupUpdaterHandlers(ipcMain, () => mainWindow, log)
  setupFriendsHandlers(ipcMain, () => mainWindow)
  setupLobbyHandlers(ipcMain, () => mainWindow)
  setupCosmeticsHandlers(ipcMain)
  setupPassHandlers(ipcMain)
  setupCapesHandlers(ipcMain)
  setupServerHandlers(ipcMain, () => mainWindow)
  initDiscordRPC()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((err) => {
  log('ERROR', `app.whenReady failed: ${err}`)
})

app.on('window-all-closed', () => {
  log('INFO', 'All windows closed')
  if (process.platform !== 'darwin') app.quit()
})

export { mainWindow }
