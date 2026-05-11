import { BrowserWindow, app } from 'electron'
import { join } from 'path'

let consoleWin: BrowserWindow | null = null
const isDev = !app.isPackaged

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

  consoleWin = new BrowserWindow({
    width: 860,
    height: 520,
    minWidth: 580,
    minHeight: 300,
    title: 'BejaConsole',
    backgroundColor: '#060809',
    resizable: true,
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

  consoleWin.on('closed', () => { consoleWin = null })
}

export function sendConsoleLog(line: string): void {
  if (consoleWin && !consoleWin.isDestroyed()) {
    consoleWin.webContents.send('console:log', line)
  }
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
