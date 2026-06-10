import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LaunchProfile, LaunchStatus, VersionProgress, NewsEntry } from '../types'

export interface CrashInfo {
  cause: string
  fix: string
  lines: string[]
}

const CRASH_PATTERNS: Array<{ test: (s: string) => boolean; cause: string; fix: string }> = [
  {
    test: s => s.includes('OutOfMemoryError'),
    cause: 'Out of memory (Java heap space)',
    fix: 'Increase Max RAM in your profile settings. 4 GB+ recommended for modded play.',
  },
  {
    test: s => s.includes('EXCEPTION_ACCESS_VIOLATION'),
    cause: 'JVM memory access violation',
    fix: 'Try a different Java version, or add -XX:+UseG1GC to JVM arguments.',
  },
  {
    test: s => s.includes('MixinApplyError') || (s.includes('mixin') && s.includes('Exception')),
    cause: 'Mod mixin conflict',
    fix: 'A mod is incompatible with your current setup. Remove recently added mods one by one to find the culprit.',
  },
  {
    test: s => /Could not load 'mods\//.test(s),
    cause: 'Corrupted or incompatible mod file',
    fix: 'Delete the problematic mod from your mods folder and re-download it.',
  },
  {
    test: s => s.includes('ClassCastException'),
    cause: 'Class conflict between mods',
    fix: 'Two or more mods are incompatible. Check for duplicate or conflicting mods.',
  },
  {
    test: s => s.includes('NoSuchMethodError') || s.includes('NoSuchFieldError'),
    cause: 'Mod version incompatibility',
    fix: 'A mod requires a method that no longer exists. Update all your mods to their latest versions.',
  },
  {
    test: s => s.includes('UnsatisfiedLinkError'),
    cause: 'Native library missing',
    fix: 'Try reinstalling Minecraft or switching to a different Java version.',
  },
  {
    test: s => s.includes('Incompatible FML') || s.includes('fml.incompatible'),
    cause: 'Forge version mismatch',
    fix: 'Reinstall the correct Forge version for your Minecraft version.',
  },
  {
    test: s => s.includes('Failed to start') || s.includes('Could not find or load main class'),
    cause: 'Failed to start Minecraft',
    fix: 'Your game installation may be corrupt. Try reinstalling the version in the Versions tab.',
  },
]

function analyzeLogs(lines: string[]): CrashInfo {
  const full = lines.join('\n')
  const errLines = lines
    .filter(l => l.startsWith('[ERR]') || l.includes('Exception') || l.includes('FATAL'))
    .slice(-12)

  for (const pattern of CRASH_PATTERNS) {
    if (pattern.test(full)) {
      return { cause: pattern.cause, fix: pattern.fix, lines: errLines.slice(-8) }
    }
  }
  return {
    cause: 'Unexpected crash',
    fix: 'Check the crash-reports folder in your game directory for the full crash report.',
    lines: errLines.slice(-8),
  }
}

export const useLauncherStore = defineStore('launcher', () => {
  const profiles = ref<LaunchProfile[]>([])
  const activeProfile = ref<LaunchProfile | null>(null)
  const status = ref<LaunchStatus>('idle')
  const statusMsg = ref<string>('')
  const logs = ref<string[]>([])
  const lastError = ref<string | null>(null)
  const installProgress = ref<VersionProgress | null>(null)
  const news = ref<NewsEntry[]>([])
  const crashInfo = ref<CrashInfo | null>(null)
  const conflictWarning = ref<{ conflicts: string[]; profileId: string } | null>(null)
  const wizardOpen = ref(false)

  const isRunning = computed(() => status.value === 'running')
  const isLaunching = computed(() => status.value === 'starting')

  async function loadProfiles() {
    profiles.value = await window.api.profiles.list()
    activeProfile.value = await window.api.profiles.getActive()
  }

  async function createProfile(data: Omit<LaunchProfile, 'id' | 'createdAt' | 'lastPlayed' | 'playtimeMs'>) {
    const profile = await window.api.profiles.create(JSON.parse(JSON.stringify(data)))
    profiles.value.push(profile)
    if (!activeProfile.value) {
      await setActiveProfile(profile.id)
    }
    return profile
  }

  async function updateProfile(id: string, data: Partial<LaunchProfile>) {
    const updated = await window.api.profiles.update(id, JSON.parse(JSON.stringify(data)))
    if (updated) {
      const idx = profiles.value.findIndex(p => p.id === id)
      if (idx >= 0) profiles.value[idx] = updated
      if (activeProfile.value?.id === id) activeProfile.value = updated
    }
    return updated
  }

  async function deleteProfile(id: string) {
    await window.api.profiles.delete(id)
    profiles.value = profiles.value.filter(p => p.id !== id)
    if (activeProfile.value?.id === id) {
      const next = profiles.value[0] ?? null
      if (next) {
        await setActiveProfile(next.id)
      } else {
        activeProfile.value = null
      }
    }
  }

  async function setActiveProfile(id: string) {
    activeProfile.value = await window.api.profiles.setActive(id)
  }

  async function doLaunch(profileId: string) {
    status.value = 'starting'
    logs.value = []
    lastError.value = null
    try {
      await window.api.launch.start(profileId)
    } catch (e) {
      status.value = 'error'
      lastError.value = String(e)
    }
  }

  async function launch() {
    if (!activeProfile.value) return
    try {
      const conflicts = await window.api.mods.checkConflicts(activeProfile.value.id)
      if (conflicts.length > 0) {
        conflictWarning.value = { conflicts, profileId: activeProfile.value.id }
        return
      }
    } catch { /* non-fatal — launch anyway if check fails */ }
    await doLaunch(activeProfile.value.id)
  }

  async function forceLaunch() {
    const id = conflictWarning.value?.profileId
    conflictWarning.value = null
    if (id) await doLaunch(id)
  }

  async function autoFixAndLaunch() {
    const w = conflictWarning.value
    if (!w) return
    await window.api.mods.autoFix(w.profileId)
    conflictWarning.value = null
    await doLaunch(w.profileId)
  }

  function dismissConflict() {
    conflictWarning.value = null
  }

  async function killGame() {
    status.value = 'stopping'
    await window.api.launch.kill()
    // status transitions to 'idle' when 'stopped:0' arrives via onStatus
  }

  function setupLaunchListeners() {
    window.api.launch.onLog(line => {
      logs.value.push(line)
      if (logs.value.length > 500) logs.value.shift()
    })
    window.api.launch.onStatus(s => {
      if (s === 'running') {
        status.value = 'running'
        statusMsg.value = ''
        installProgress.value = null
      } else if (s.startsWith('stopped:')) {
        const code = parseInt(s.split(':')[1] ?? '0', 10)
        statusMsg.value = ''
        installProgress.value = null
        if (code === 0) {
          status.value = 'idle'
        } else {
          status.value = 'error'
          const errLines = logs.value.filter(l => l.startsWith('[ERR]')).slice(-5)
          lastError.value = errLines.length
            ? errLines.join('\n')
            : `Process exited with code ${code}`
          crashInfo.value = analyzeLogs(logs.value)
        }
        // Refresh profiles to pick up updated lastPlayed + playtimeMs
        loadProfiles()
      } else if (s === 'starting') {
        status.value = 'starting'
        statusMsg.value = ''
      } else {
        statusMsg.value = s
      }
    })
    window.api.versions.onProgress(p => {
      installProgress.value = p
    })
  }

  async function fetchNews() {
    try {
      news.value = await window.api.news.fetch()
    } catch {
      news.value = []
    }
  }

  return {
    profiles,
    activeProfile,
    status,
    statusMsg,
    logs,
    lastError,
    installProgress,
    news,
    crashInfo,
    conflictWarning,
    wizardOpen,
    isRunning,
    isLaunching,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    launch,
    forceLaunch,
    autoFixAndLaunch,
    dismissConflict,
    killGame,
    setupLaunchListeners,
    fetchNews,
  }
})
