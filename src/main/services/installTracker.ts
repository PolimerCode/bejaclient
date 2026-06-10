import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

interface TrackerData {
  mods: Record<string, string[]>     // projectId → profileId[]
  servers: Record<string, string[]>  // "host:port" → profileId[]
}

function getFile(): string {
  return path.join(app.getPath('userData'), 'install-tracker.json')
}

function load(): TrackerData {
  try {
    return JSON.parse(fs.readFileSync(getFile(), 'utf8')) as TrackerData
  } catch {
    return { mods: {}, servers: {} }
  }
}

function save(data: TrackerData): void {
  fs.writeFileSync(getFile(), JSON.stringify(data, null, 2), 'utf8')
}

export function recordModInstall(projectId: string, profileId: string): void {
  const data = load()
  if (!data.mods[projectId]) data.mods[projectId] = []
  if (!data.mods[projectId].includes(profileId)) {
    data.mods[projectId].push(profileId)
    save(data)
  }
}

export function recordServerAdd(host: string, port: number, profileId: string): void {
  const key = `${host}:${port}`
  const data = load()
  if (!data.servers[key]) data.servers[key] = []
  if (!data.servers[key].includes(profileId)) {
    data.servers[key].push(profileId)
    save(data)
  }
}

export function getInstalls(): TrackerData {
  return load()
}
