import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'

export interface LaunchProfile {
  id: string
  name: string
  version: string
  loader: 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge'
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
  playtimeMs: number
  imageUrl?: string | null
}

function getProfilesPath() {
  return join(app.getPath('userData'), 'profiles.json')
}

// In-memory cache — populated on first read, invalidated on every write.
// Eliminates repeated disk reads when multiple IPC handlers fire in quick succession.
let profilesCache: LaunchProfile[] | null = null

export function listProfiles(): LaunchProfile[] {
  if (profilesCache !== null) return profilesCache
  const path = getProfilesPath()
  if (!existsSync(path)) {
    profilesCache = []
    return profilesCache
  }
  try {
    profilesCache = JSON.parse(readFileSync(path, 'utf-8')) as LaunchProfile[]
    return profilesCache
  } catch {
    profilesCache = []
    return profilesCache
  }
}

export function saveProfiles(profiles: LaunchProfile[]): void {
  profilesCache = profiles
  writeFileSync(getProfilesPath(), JSON.stringify(profiles, null, 2), 'utf-8')
}

export function createProfile(data: Omit<LaunchProfile, 'id' | 'createdAt' | 'lastPlayed' | 'playtimeMs'>): LaunchProfile {
  const profile: LaunchProfile = {
    ...data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    lastPlayed: null,
    playtimeMs: 0,
  }
  const profiles = listProfiles()
  profiles.push(profile)
  saveProfiles(profiles)
  return profile
}

export function updateProfile(id: string, data: Partial<LaunchProfile>): LaunchProfile | null {
  const profiles = listProfiles()
  const idx = profiles.findIndex(p => p.id === id)
  if (idx === -1) return null
  profiles[idx] = { ...profiles[idx], ...data }
  saveProfiles(profiles)
  return profiles[idx]
}

export function deleteProfile(id: string): boolean {
  const profiles = listProfiles()
  const filtered = profiles.filter(p => p.id !== id)
  if (filtered.length === profiles.length) return false
  saveProfiles(filtered)
  return true
}

export function getProfile(id: string): LaunchProfile | null {
  return listProfiles().find(p => p.id === id) ?? null
}
