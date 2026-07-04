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
    importFromLauncher: () => ipcRenderer.invoke('auth:import-launcher'),
    onDeviceCode: (cb: (data: { verificationUri: string; userCode: string; expiresIn: number }) => void) => {
      ipcRenderer.on('auth:device-code', (_e, d) => cb(d))
    },
    onBrowserOpened: (cb: () => void) => {
      ipcRenderer.on('auth:browser-opened', () => cb())
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
    exportPack: (id: string) => ipcRenderer.invoke('profiles:export', id),
    importPack: () => ipcRenderer.invoke('profiles:import'),
  },

  // Mods
  mods: {
    list: (profileId: string) => ipcRenderer.invoke('mods:list', profileId),
    checkConflicts: (profileId: string) => ipcRenderer.invoke('mods:check-conflicts', profileId),
    install: (profileId: string, filePath: string) =>
      ipcRenderer.invoke('mods:install', profileId, filePath),
    toggle: (profileId: string, modId: string) =>
      ipcRenderer.invoke('mods:toggle', profileId, modId),
    delete: (profileId: string, modId: string) =>
      ipcRenderer.invoke('mods:delete', profileId, modId),
    openFolder: (profileId: string) => ipcRenderer.invoke('mods:open-folder', profileId),
    autoFix: (profileId: string) => ipcRenderer.invoke('mods:auto-fix', profileId),
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
    search: (query: string, type: string, gameVersion?: string, loader?: string, offset?: number, categories?: string[]) =>
      ipcRenderer.invoke('modrinth:search', query, type, gameVersion, loader, offset, categories),
    categories: () =>
      ipcRenderer.invoke('modrinth:categories'),
    exploreSearch: (query: string, type: string, source: string, gameVersion?: string, loader?: string, offset?: number, categories?: string[]) =>
      ipcRenderer.invoke('explore:search', query, type, source, gameVersion, loader, offset, categories),
    installCurseforge: (modId: string, projectType: string, profileId: string) =>
      ipcRenderer.invoke('curseforge:install', modId, projectType, profileId),
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
    ready:    () => ipcRenderer.send('console:ready'),
    onLog:    (cb: (line: string) => void) => ipcRenderer.on('console:log',    (_e, l) => cb(l)),
    onStatus: (cb: (s: string)    => void) => ipcRenderer.on('console:status', (_e, s) => cb(s)),
    onClear:  (cb: ()             => void) => ipcRenderer.on('console:clear',  ()      => cb()),
  },

  // BejaClient player lookup
  players: {
    lookup:     (username: string)                  => ipcRenderer.invoke('players:lookup', username),
    saveSkin:   (skinUrl: string, username: string) => ipcRenderer.invoke('players:save-skin', skinUrl, username),
    fetchImage: (url: string)                       => ipcRenderer.invoke('players:fetchImage', url),
    mcProfile:  (accessToken: string)               => ipcRenderer.invoke('players:mc-profile', accessToken),
    bejaProfile: (uuid: string)                     => ipcRenderer.invoke('players:beja-profile', uuid),
    mcCreated:   (uuid: string)                     => ipcRenderer.invoke('players:mc-created', uuid),
    capes:       (uuid: string)                     => ipcRenderer.invoke('players:capes', uuid),
    search:      (query: string)                    => ipcRenderer.invoke('players:search', query),
  },

  // BejaClient friends & presence
  friends: {
    connect:        ()                   => ipcRenderer.invoke('friends:connect'),
    disconnect:     ()                   => ipcRenderer.invoke('friends:disconnect'),
    list:           ()                   => ipcRenderer.invoke('friends:list'),
    sendRequest:    (username: string)   => ipcRenderer.invoke('friends:request', username),
    acceptRequest:  (uuid: string)       => ipcRenderer.invoke('friends:accept', uuid),
    removeOrDecline:(uuid: string)       => ipcRenderer.invoke('friends:remove', uuid),
    onOnline:   (cb: (d: { uuid: string; username: string }) => void) => ipcRenderer.on('friend:online',   (_e, d) => cb(d)),
    onOffline:  (cb: (d: { uuid: string })                  => void) => ipcRenderer.on('friend:offline',  (_e, d) => cb(d)),
    onRequest:  (cb: (d: { uuid: string; username: string }) => void) => ipcRenderer.on('friend:request',  (_e, d) => cb(d)),
    onAccepted: (cb: (d: { uuid: string; username: string }) => void) => ipcRenderer.on('friend:accepted', (_e, d) => cb(d)),
    onRemoved:  (cb: (d: { uuid: string })                  => void) => ipcRenderer.on('friend:removed',  (_e, d) => cb(d)),
    onSocketStatus: (cb: (status: 'connected' | 'disconnected' | 'error') => void) =>
      ipcRenderer.on('socket:status', (_e, s) => cb(s)),
  },

  // Global player-count stats
  stats: {
    online:        ()                        => ipcRenderer.invoke('stats:online'),
    onOnlineCount: (cb: (count: number) => void) => ipcRenderer.on('stats:online', (_e, d) => cb(d.count)),
  },

  // Lobby / party
  lobby: {
    emit: (event: string, data: unknown) => ipcRenderer.invoke('lobby:emit', event, data),
    startWithServer: (profileId: string, server: string, port: number) =>
      ipcRenderer.invoke('launch:start-server', profileId, server, port),
    onPartyState:    (cb: (d: unknown) => void) => ipcRenderer.on('party:state',         (_e, d) => cb(d)),
    onMemberJoined:  (cb: (d: unknown) => void) => ipcRenderer.on('party:member_joined', (_e, d) => cb(d)),
    onMemberLeft:    (cb: (d: unknown) => void) => ipcRenderer.on('party:member_left',   (_e, d) => cb(d)),
    onReadyUpdate:   (cb: (d: unknown) => void) => ipcRenderer.on('party:ready_update',  (_e, d) => cb(d)),
    onSkinUpdate:    (cb: (d: unknown) => void) => ipcRenderer.on('party:skin_update',   (_e, d) => cb(d)),
    onLaunched:      (cb: (d: unknown) => void) => ipcRenderer.on('party:launched',      (_e, d) => cb(d)),
    onDisbanded:     (cb: ()           => void) => ipcRenderer.on('party:disbanded',     ()      => cb()),
    onError:         (cb: (d: unknown) => void) => ipcRenderer.on('party:error',         (_e, d) => cb(d)),
    onSpeaking:      (cb: (d: unknown) => void) => ipcRenderer.on('voice:speaking',      (_e, d) => cb(d)),
    onVoiceOffer:    (cb: (d: unknown) => void) => ipcRenderer.on('voice:offer',         (_e, d) => cb(d)),
    onVoiceAnswer:   (cb: (d: unknown) => void) => ipcRenderer.on('voice:answer',        (_e, d) => cb(d)),
    onVoiceIce:      (cb: (d: unknown) => void) => ipcRenderer.on('voice:ice',           (_e, d) => cb(d)),
    onInviteReceived: (cb: (d: { partyId: string; fromUuid: string; fromUsername: string }) => void) =>
      ipcRenderer.on('party:invite_received', (_e, d) => cb(d)),
  },

  // Cosmetics / Locker
  cosmetics: {
    get:       (uuid: string)                                                               => ipcRenderer.invoke('cosmetics:get', uuid),
    update:    (data: { cape_url?: string | null; cape_type?: string; equipped?: string[] }) => ipcRenderer.invoke('cosmetics:update', data),
    inventory: (uuid: string)                                                               => ipcRenderer.invoke('cosmetics:inventory', uuid),
  },

  // Crates
  crates: {
    list: ()                    => ipcRenderer.invoke('crates:list'),
    open: (crateId: string)     => ipcRenderer.invoke('crates:open', crateId),
    keys: ()                    => ipcRenderer.invoke('crates:keys'),
  },

  // Forge / crafting
  crafting: {
    inventory: ()               => ipcRenderer.invoke('crafting:inventory'),
    combine:   (rarity: string) => ipcRenderer.invoke('crafting:combine', rarity),
  },

  // Community Capes
  capes: {
    list:   (offset?: number)                  => ipcRenderer.invoke('capes:list', offset),
    upload: (filePath: string, name: string)   => ipcRenderer.invoke('capes:upload', filePath, name),
    report: (id: number)                       => ipcRenderer.invoke('capes:report', id),
  },

  // Client Pass
  pass: {
    get:      () => ipcRenderer.invoke('pass:get'),
    progress: () => ipcRenderer.invoke('pass:progress'),
    daily:    () => ipcRenderer.invoke('pass:daily'),
  },

  // Quests & XP leaderboard
  quests: {
    list:        ()                                  => ipcRenderer.invoke('quests:list'),
    progress:    (questId: string, amount: number)   => ipcRenderer.invoke('quests:progress', questId, amount),
    claim:       (questId: string)                   => ipcRenderer.invoke('quests:claim', questId),
    leaderboard: ()                                  => ipcRenderer.invoke('quests:leaderboard'),
  },

  // Install tracking
  installs: {
    get: () => ipcRenderer.invoke('installs:get'),
  },

  // Servers
  servers: {
    list: () => ipcRenderer.invoke('servers:list'),
    ping: (host: string, port: number) => ipcRenderer.invoke('servers:ping', host, port),
    add: (host: string, port: number, name: string) => ipcRenderer.invoke('servers:add', host, port, name),
    remove: (id: string) => ipcRenderer.invoke('servers:remove', id),
    addToProfile: (host: string, port: number, name: string, favicon: string | null, profileId: string) =>
      ipcRenderer.invoke('servers:add-to-profile', host, port, name, favicon, profileId),
    onPingResult: (cb: (data: unknown) => void) =>
      ipcRenderer.on('servers:ping-result', (_e, d) => cb(d)),
  },

  // Chat
  chat: {
    send:      (toUuid: string, content: string) => ipcRenderer.invoke('chat:send', toUuid, content),
    history:   (targetUuid: string)              => ipcRenderer.invoke('chat:history', targetUuid),
    sendTyping: (toUuid: string)                  => ipcRenderer.invoke('chat:typing', toUuid),
    onMessage: (cb: (msg: unknown) => void)      => { ipcRenderer.on('chat:message', (_e, d) => cb(d)) },
    onTyping:  (cb: (d: { fromUuid: string }) => void) => { ipcRenderer.on('chat:typing', (_e, d) => cb(d)) },
  },

  // Video
  video: {
    getScene: () => ipcRenderer.invoke('video:get-scene'),
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
