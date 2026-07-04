export interface Platform {
  name: 'windows' | 'osx' | 'linux'
  version: string
  arch: string
}

export interface Rule {
  action: 'allow' | 'disallow'
  os?: { name?: string; version?: string; arch?: string }
  features?: Record<string, boolean>
}

export type ArgumentEntry = string | { rules: Rule[]; value: string | string[] }

export interface DownloadArtifact {
  path?: string
  url: string
  sha1?: string
  size?: number
}

export interface RawLibrary {
  name: string
  url?: string
  rules?: Rule[]
  natives?: Record<string, string>
  extract?: { exclude?: string[] }
  downloads?: {
    artifact?: DownloadArtifact
    classifiers?: Record<string, DownloadArtifact>
  }
}

export interface AssetIndexRef {
  id: string
  url: string
  sha1: string
  size: number
  totalSize?: number
}

/** A version JSON as read straight off disk/network — may be a partial "child" link in an inheritsFrom chain. */
export interface RawVersionJson {
  id: string
  inheritsFrom?: string
  type: string
  mainClass: string
  minecraftArguments?: string
  arguments?: { game?: ArgumentEntry[]; jvm?: ArgumentEntry[] }
  libraries: RawLibrary[]
  assetIndex?: AssetIndexRef
  assets?: string
  downloads?: { client?: DownloadArtifact; server?: DownloadArtifact }
  javaVersion?: { majorVersion: number }
  releaseTime?: string
  time?: string
  minimumLauncherVersion?: number
}

/** Fully merged version — every field guaranteed present after walking the inheritsFrom chain. */
export interface ResolvedVersion {
  id: string
  type: string
  mainClass: string
  minecraftArguments?: string
  arguments?: { game: ArgumentEntry[]; jvm: ArgumentEntry[] }
  libraries: RawLibrary[]
  assetIndex: AssetIndexRef
  assets: string
  javaVersion?: { majorVersion: number }
}

export interface ResolvedLibrary {
  name: string
  path: string
  url: string
  sha1?: string
  size?: number
  isNative: boolean
  nativeClassifier?: string
  extractExclude?: string[]
}

export interface AssetIndex {
  objects: Record<string, { hash: string; size: number }>
  virtual?: boolean
  map_to_resources?: boolean
}
