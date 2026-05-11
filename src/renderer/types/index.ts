export interface Account {
  id: string
  username: string
  uuid: string
  accessToken: string
  refreshToken: string
  tokenExpiry: number
  skinUrl: string | null
  capeUrl: string | null
  skinModel: 'default' | 'slim'
  selected: boolean
}

export type LoaderType = 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge'

export interface LaunchProfile {
  id: string
  name: string
  version: string
  loader: LoaderType
  loaderVersion: string
  gameDir: string
  minRam: number
  maxRam: number
  javaPath: string
  jvmArgs: string
  resolution: { width: number; height: number }
  useBejaClient: boolean
  createdAt: string
  lastPlayed: string | null
}

export interface RemoteVersion {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
  url: string
  time: string
  releaseTime: string
}

export interface VersionManifest {
  latest: { release: string; snapshot: string }
  versions: RemoteVersion[]
}

export interface ModInfo {
  id: string
  name: string
  fileName: string
  enabled: boolean
  filePath: string
  fileSize: number
  modifiedAt: string
}

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

export interface NewsEntry {
  id: string
  title: string
  tag: string
  category: string
  date: string
  text: string
  playPageImage: {
    title: string
    url: string
  }
  readMoreLink: string
  cardBorder?: boolean
}

export type LaunchStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'error'

export type ModrinthProjectType = 'mod' | 'modpack' | 'resourcepack' | 'shader' | 'datapack'

export interface ModrinthHit {
  project_id: string
  slug: string
  title: string
  description: string
  categories: string[]
  project_type: ModrinthProjectType
  downloads: number
  icon_url: string | null
  latest_version: string
  game_versions: string[]
  loaders: string[]
}

export interface ModrinthVersion {
  id: string
  name: string
  version_number: string
  game_versions: string[]
  loaders: string[]
  files: { url: string; filename: string; primary: boolean; size: number }[]
}

export interface FabricLoaderVersion {
  loader: { version: string; stable: boolean }
  intermediary: { version: string }
  launcherMeta: { version: number }
}

export interface VersionProgress {
  task: string
  progress: number
  total: number
}

declare global {
  interface Window {
    api: {
      window: {
        minimize(): void
        maximize(): void
        close(): void
        isMaximized(): Promise<boolean>
        onMaximized(cb: (maximized: boolean) => void): void
      }
      auth: {
        login(): Promise<Account>
        logout(id: string): Promise<boolean>
        listAccounts(): Promise<Account[]>
        selectAccount(id: string): Promise<Account[]>
        refreshAccount(id: string): Promise<Account | null>
        onDeviceCode(cb: (data: { verificationUri: string; userCode: string; expiresIn: number }) => void): void
      }
      versions: {
        listRemote(): Promise<VersionManifest>
        listInstalled(): Promise<string[]>
        install(versionId: string, loaderType: string, loaderVersion?: string): Promise<string[]>
        delete(versionId: string): Promise<string[]>
        onProgress(cb: (data: VersionProgress) => void): void
        listFabricVersions(mcVersion: string): Promise<FabricLoaderVersion[]>
        listForgeVersions(mcVersion: string): Promise<string[]>
      }
      launch: {
        start(profileId: string): Promise<void>
        kill(): Promise<boolean>
        openConsole(): void
        onLog(cb: (line: string) => void): void
        onStatus(cb: (status: string) => void): void
      }
      console: {
        onLog(cb: (line: string) => void): void
        onStatus(cb: (s: string) => void): void
        onClear(cb: () => void): void
      }
      profiles: {
        list(): Promise<LaunchProfile[]>
        create(profile: Omit<LaunchProfile, 'id' | 'createdAt' | 'lastPlayed'>): Promise<LaunchProfile>
        update(id: string, profile: Partial<LaunchProfile>): Promise<LaunchProfile | null>
        delete(id: string): Promise<boolean>
        getActive(): Promise<LaunchProfile | null>
        setActive(id: string): Promise<LaunchProfile | null>
      }
      mods: {
        list(profileId: string): Promise<ModInfo[]>
        install(profileId: string, filePath?: string): Promise<ModInfo[]>
        toggle(profileId: string, modId: string): Promise<ModInfo[]>
        delete(profileId: string, modId: string): Promise<ModInfo[]>
        openFolder(profileId: string): Promise<void>
      }
      settings: {
        get(): Promise<AppSettings>
        set(settings: AppSettings): Promise<boolean>
        getGameDir(): Promise<string>
        setGameDir(dir: string): Promise<boolean>
        chooseJava(): Promise<string | null>
        chooseDir(): Promise<string | null>
      }
      news: {
        fetch(): Promise<NewsEntry[]>
      }
      modrinth: {
        search(query: string, type: ModrinthProjectType, gameVersion?: string, loader?: string, offset?: number): Promise<{ hits: ModrinthHit[]; total_hits: number }>
        versions(projectId: string, gameVersion?: string, loader?: string): Promise<ModrinthVersion[]>
        installMod(projectId: string, profileId: string): Promise<boolean>
        installModpack(projectId: string, versionId: string | null): Promise<{ profileId: string; name: string }>
        installResourcePack(projectId: string, profileId: string): Promise<boolean>
        installShader(projectId: string, profileId: string): Promise<boolean>
        installDatapack(projectId: string, profileId: string): Promise<boolean>
        onProgress(cb: (msg: string) => void): void
        swapMod(profileId: string, oldModId: string, projectId: string, versionId: string): Promise<ModInfo[]>
      }
      system: {
        getVersion(): Promise<string>
        getJavaVersions(): Promise<string[]>
        platform: string
        openExternal(url: string): Promise<void>
      }
      updater: {
        check(): Promise<void>
        download(): Promise<void>
        install(): void
        onChecking(cb: () => void): void
        onAvailable(cb: (info: { version: string; releaseNotes?: string }) => void): void
        onNotAvailable(cb: () => void): void
        onProgress(cb: (p: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void): void
        onDownloaded(cb: (info: { version: string }) => void): void
        onError(cb: (msg: string) => void): void
      }
    }
  }
}
