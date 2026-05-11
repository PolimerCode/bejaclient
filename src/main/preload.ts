import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximized: (cb: (maximized: boolean) => void) => {
      ipcRenderer.on('window:maximized', (_e, v) => cb(v))
    },
  },

  // Authentication
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    logout: (id: string) => ipcRenderer.invoke('auth:logout', id),
    listAccounts: () => ipcRenderer.invoke('auth:list-accounts'),
    selectAccount: (id: string) => ipcRenderer.invoke('auth:select-account', id),
    refreshAccount: (id: string) => ipcRenderer.invoke('auth:refresh', id),
    onDeviceCode: (cb: (data: { verificationUri: string; userCode: string; expiresIn: number }) => void) => {
      ipcRenderer.on('auth:device-code', (_e, d) => cb(d))
    },
  },

  // Versions
  versions: {
    listRemote: () => ipcRenderer.invoke('versions:list-remote'),
    listInstalled: () => ipcRenderer.invoke('versions:list-installed'),
    install: (versionId: string, loaderType: string, loaderVersion?: string) =>
      ipcRenderer.invoke('versions:install', versionId, loaderType, loaderVersion),
    delete: (versionId: string) => ipcRenderer.invoke('versions:delete', versionId),
    onProgress: (cb: (data: { task: string; progress: number; total: number }) => void) => {
      ipcRenderer.on('versions:progress', (_e, d) => cb(d))
    },
    listFabricVersions: (mcVersion: string) =>
      ipcRenderer.invoke('versions:list-fabric', mcVersion),
    listForgeVersions: (mcVersion: string) =>
      ipcRenderer.invoke('versions:list-forge', mcVersion),
  },

  // Launcher
  launch: {
    start: (profileId: string) => ipcRenderer.invoke('launch:start', profileId),
    kill: () => ipcRenderer.invoke('launch:kill'),
    openConsole: () => ipcRenderer.send('launch:open-console'),
    saveLogs: (lines: string[]) => ipcRenderer.invoke('launch:save-logs', lines),
    onLog: (cb: (line: string) => void) => {
      ipcRenderer.on('launch:log', (_e, l) => cb(l))
    },
    onStatus: (cb: (status: string) => void) => {
      ipcRenderer.on('launch:status', (_e, s) => cb(s))
    },
  },

  // Profiles (launch configurations)
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list'),
    create: (profile: unknown) => ipcRenderer.invoke('profiles:create', profile),
    update: (id: string, profile: unknown) => ipcRenderer.invoke('profiles:update', id, profile),
    delete: (id: string) => ipcRenderer.invoke('profiles:delete', id),
    getActive: () => ipcRenderer.invoke('profiles:get-active'),
    setActive: (id: string) => ipcRenderer.invoke('profiles:set-active', id),
  },

  // Mods
  mods: {
    list: (profileId: string) => ipcRenderer.invoke('mods:list', profileId),
    install: (profileId: string, filePath: string) =>
      ipcRenderer.invoke('mods:install', profileId, filePath),
    toggle: (profileId: string, modId: string) =>
      ipcRenderer.invoke('mods:toggle', profileId, modId),
    delete: (profileId: string, modId: string) =>
      ipcRenderer.invoke('mods:delete', profileId, modId),
    openFolder: (profileId: string) => ipcRenderer.invoke('mods:open-folder', profileId),
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings: unknown) => ipcRenderer.invoke('settings:set', settings),
    getGameDir: () => ipcRenderer.invoke('settings:game-dir'),
    setGameDir: (dir: string) => ipcRenderer.invoke('settings:set-game-dir', dir),
    chooseJava: () => ipcRenderer.invoke('settings:choose-java'),
    chooseDir: () => ipcRenderer.invoke('settings:choose-dir'),
  },

  // News
  news: {
    fetch: () => ipcRenderer.invoke('news:fetch'),
  },

  // Modrinth
  modrinth: {
    search: (query: string, type: 'mod' | 'modpack', gameVersion?: string, loader?: string, offset?: number) =>
      ipcRenderer.invoke('modrinth:search', query, type, gameVersion, loader, offset),
    versions: (projectId: string, gameVersion?: string, loader?: string) =>
      ipcRenderer.invoke('modrinth:versions', projectId, gameVersion, loader),
    installMod: (projectId: string, profileId: string) =>
      ipcRenderer.invoke('modrinth:install-mod', projectId, profileId),
    installModpack: (projectId: string, versionId: string | null) =>
      ipcRenderer.invoke('modrinth:install-modpack', projectId, versionId),
    installResourcePack: (projectId: string, profileId: string) =>
      ipcRenderer.invoke('modrinth:install-resourcepack', projectId, profileId),
    installShader: (projectId: string, profileId: string) =>
      ipcRenderer.invoke('modrinth:install-shader', projectId, profileId),
    installDatapack: (projectId: string, profileId: string) =>
      ipcRenderer.invoke('modrinth:install-datapack', projectId, profileId),
    onProgress: (cb: (msg: string) => void) => {
      ipcRenderer.on('modrinth:progress', (_e, msg) => cb(msg))
    },
    swapMod: (profileId: string, oldModId: string, projectId: string, versionId: string) =>
      ipcRenderer.invoke('modrinth:swap-mod', profileId, oldModId, projectId, versionId),
  },

  // System
  system: {
    getVersion: () => ipcRenderer.invoke('system:get-version'),
    getJavaVersions: () => ipcRenderer.invoke('system:java-versions'),
    platform: process.platform,
    openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),
  },

  // BejaConsole window
  console: {
    onLog:    (cb: (line: string) => void) => ipcRenderer.on('console:log',    (_e, l) => cb(l)),
    onStatus: (cb: (s: string)    => void) => ipcRenderer.on('console:status', (_e, s) => cb(s)),
    onClear:  (cb: ()             => void) => ipcRenderer.on('console:clear',  ()      => cb()),
  },

  // Auto-updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onChecking: (cb: () => void) => ipcRenderer.on('updater:checking', () => cb()),
    onAvailable: (cb: (info: { version: string; releaseNotes?: string }) => void) =>
      ipcRenderer.on('updater:available', (_e, info) => cb(info)),
    onNotAvailable: (cb: () => void) => ipcRenderer.on('updater:not-available', () => cb()),
    onProgress: (cb: (p: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) =>
      ipcRenderer.on('updater:progress', (_e, p) => cb(p)),
    onDownloaded: (cb: (info: { version: string }) => void) =>
      ipcRenderer.on('updater:downloaded', (_e, info) => cb(info)),
    onError: (cb: (msg: string) => void) =>
      ipcRenderer.on('updater:error', (_e, msg) => cb(msg)),
  },
})
