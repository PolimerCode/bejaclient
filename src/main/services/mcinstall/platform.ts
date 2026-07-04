import * as os from 'os'
import type { Platform } from './types'

let cached: Platform | null = null

export function getCurrentPlatform(): Platform {
  if (cached) return cached
  const plat = os.platform()
  const name: Platform['name'] = plat === 'win32' ? 'windows' : plat === 'darwin' ? 'osx' : 'linux'
  const arch = os.arch() === 'x64' ? 'x64' : os.arch() === 'arm64' ? 'arm64' : os.arch()
  cached = { name, version: os.release(), arch }
  return cached
}
