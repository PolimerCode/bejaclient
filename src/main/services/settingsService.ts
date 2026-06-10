import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

export interface GameSettings {
  defaultGameDir: string
  defaultJavaPath: string
  minRam: number
  maxRam: number
  jvmArgs: string
  resolution: { width: number; height: number }
  fullscreen: boolean
}

export interface LauncherSettings {
  closeOnLaunch: boolean
  keepLauncherOpen: boolean
  autoUpdate: boolean
  concurrentDownloads: number
  soundEnabled: boolean
  soundVolume: number
  soundStyle: 'soft' | 'clicky'
  curseforgeApiKey: string
}

export interface AppearanceSettings {
  language: string
  accentColor: string
}

export interface AppSettings {
  game: GameSettings
  launcher: LauncherSettings
  appearance: AppearanceSettings
  activeProfileId: string | null
}

const defaultSettings: AppSettings = {
  game: {
    defaultGameDir: join(app.getPath('appData'), '.minecraft'),
    defaultJavaPath: '',
    minRam: 512,
    maxRam: 2048,
    jvmArgs: '',
    resolution: { width: 854, height: 480 },
    fullscreen: false,
  },
  launcher: {
    closeOnLaunch: false,
    keepLauncherOpen: true,
    autoUpdate: true,
    concurrentDownloads: 16,
    soundEnabled: true,
    soundVolume: 50,
    soundStyle: 'soft',
    curseforgeApiKey: '',
  },
  appearance: {
    language: 'en',
    accentColor: '#27ade0',
  },
  activeProfileId: null,
}

function deepMerge<T extends object>(base: T, patch: Partial<T>): T {
  const out = { ...base }
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const bv = base[key]
    const pv = patch[key]
    if (
      bv !== null && pv !== null &&
      typeof bv === 'object' && typeof pv === 'object' &&
      !Array.isArray(bv)
    ) {
      out[key] = deepMerge(bv as object, pv as Partial<object>) as T[keyof T]
    } else if (pv !== undefined) {
      out[key] = pv as T[keyof T]
    }
  }
  return out
}

function getSettingsPath() {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'settings.json')
}

// In-memory cache — avoids repeated disk reads across multiple IPC calls per launch.
let settingsCache: AppSettings | null = null

export function getSettings(): AppSettings {
  if (settingsCache !== null) return settingsCache
  const path = getSettingsPath()
  if (!existsSync(path)) {
    settingsCache = { ...defaultSettings }
    return settingsCache
  }
  try {
    const raw = readFileSync(path, 'utf-8')
    settingsCache = deepMerge(defaultSettings, JSON.parse(raw) as Partial<AppSettings>)
    return settingsCache
  } catch {
    settingsCache = { ...defaultSettings }
    return settingsCache
  }
}

export function saveSettings(settings: AppSettings): void {
  settingsCache = settings
  const path = getSettingsPath()
  writeFileSync(path, JSON.stringify(settings, null, 2), 'utf-8')
}

export function patchSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const merged = { ...current, ...patch }
  saveSettings(merged)
  return merged
}
