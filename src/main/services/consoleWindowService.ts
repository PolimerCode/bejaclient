import { BrowserWindow, app, ipcMain } from 'electron'
import { join } from 'path'

let consoleWin: BrowserWindow | null = null
let consoleReady = false
let logBuffer: string[] = []
const isDev = !app.isPackaged

// Renderer signals when its IPC listeners are registered (after Vue onMounted).
ipcMain.on('console:ready', (event) => {
  if (!consoleWin || consoleWin.isDestroyed()) return
  if (event.sender !== consoleWin.webContents) return
  consoleReady = true
  for (const line of logBuffer) {
    consoleWin.webContents.send('console:log', line)
  }
  logBuffer = []
})

function getIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.ico')
    : join(__dirname, '../../resources/icon.ico')
}

export function openConsoleWindow(): void {
  if (consoleWin && !consoleWin.isDestroyed()) {
    consoleWin.focus()
    return
  }

  // Reset buffer for new window — logs sent before did-finish-load are buffered and replayed.
  logBuffer = []
  consoleReady = false

  consoleWin = new BrowserWindow({
    width: 860,
    height: 520,
    minWidth: 580,
    minHeight: 300,
    title: 'BejaConsole',
    backgroundColor: '#060809',
    resizable: true,
    autoHideMenuBar: true,
    icon: getIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    consoleWin.loadURL('http://localhost:5173/#/console')
  } else {
    const rendererPath = join(__dirname, '../../dist/index.html')
    consoleWin.loadFile(rendererPath, { hash: '/console' })
  }

  consoleWin.on('closed', () => { consoleWin = null; consoleReady = false })
}

export function sendConsoleLog(line: string): void {
  if (!consoleWin || consoleWin.isDestroyed()) return
  if (!consoleReady) {
    logBuffer.push(line)
    return
  }
  consoleWin.webContents.send('console:log', line)
}

export function sendConsoleStatus(status: string): void {
  if (consoleWin && !consoleWin.isDestroyed()) {
    consoleWin.webContents.send('console:status', status)
  }
}

export function sendConsoleClear(): void {
  if (consoleWin && !consoleWin.isDestroyed()) {
    consoleWin.webContents.send('console:clear')
  }
}
