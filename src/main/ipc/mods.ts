import { IpcMain, dialog } from 'electron'
import { listMods, toggleMod, installMod, deleteMod, openModsFolder } from '../services/modService'

interface ConflictRule { a: string; b: string; msg: string }

const CONFLICT_RULES: ConflictRule[] = [
  { a: 'optifine', b: 'sodium',    msg: 'OptiFine + Sodium are incompatible. Use Iris+Sodium instead of OptiFine.' },
  { a: 'optifine', b: 'iris',      msg: 'OptiFine + Iris are incompatible. Remove one of them.' },
  { a: 'optifine', b: 'rubidium',  msg: 'OptiFine + Rubidium are incompatible.' },
  { a: 'optifabric', b: 'sodium',  msg: 'OptiFabric + Sodium are incompatible.' },
  { a: 'sodium',  b: 'embeddium',  msg: 'Sodium + Embeddium conflict — both are rendering overhauls.' },
  { a: 'sodium',  b: 'rubidium',   msg: 'Sodium + Rubidium conflict — both are rendering overhauls.' },
  { a: 'lithium', b: 'canary',     msg: 'Lithium + Canary are incompatible optimization mods.' },
]

export function setupModHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('mods:list', (_e, profileId: string) => {
    return listMods(profileId)
  })

  ipcMain.handle('mods:check-conflicts', async (_e, profileId: string) => {
    const mods = await listMods(profileId)
    const enabled = mods.filter(m => m.enabled)
    const names = enabled.map(m => m.fileName.toLowerCase())
    const conflicts: string[] = []

    for (const rule of CONFLICT_RULES) {
      if (names.some(n => n.includes(rule.a)) && names.some(n => n.includes(rule.b))) {
        conflicts.push(rule.msg)
      }
    }

    // Duplicate detection — same mod slug with different version numbers
    const slugs = names.map(n => n.replace(/[-_][\d].*$/, '').replace(/\.jar(\.disabled)?$/, ''))
    const seen = new Map<string, number>()
    for (const slug of slugs) { seen.set(slug, (seen.get(slug) ?? 0) + 1) }
    for (const [slug, count] of seen) {
      if (count > 1) {
        const dupes = enabled.filter(m => m.fileName.toLowerCase().replace(/[-_][\d].*$/, '').replace(/\.jar(\.disabled)?$/, '') === slug)
        conflicts.push(`Duplicate mod detected: ${dupes.map(m => m.fileName).join(', ')}`)
      }
    }

    return conflicts
  })

  ipcMain.handle('mods:install', async (_e, profileId: string, filePath?: string) => {
    if (!filePath) {
      const result = await dialog.showOpenDialog({
        title: 'Select Mod File',
        filters: [{ name: 'Minecraft Mods', extensions: ['jar'] }],
        properties: ['openFile', 'multiSelections'],
      })
      if (result.canceled || !result.filePaths.length) return listMods(profileId)
      for (const fp of result.filePaths) {
        installMod(profileId, fp)
      }
      return listMods(profileId)
    }
    return installMod(profileId, filePath)
  })

  ipcMain.handle('mods:toggle', (_e, profileId: string, modId: string) => {
    return toggleMod(profileId, modId)
  })

  ipcMain.handle('mods:delete', (_e, profileId: string, modId: string) => {
    return deleteMod(profileId, modId)
  })

  ipcMain.handle('mods:open-folder', (_e, profileId: string) => {
    openModsFolder(profileId)
  })

  ipcMain.handle('mods:auto-fix', async (_e, profileId: string) => {
    const mods = await listMods(profileId)
    const enabled = mods.filter(m => m.enabled)
    const fixed: string[] = []

    // Fix duplicates: keep newest by modifiedAt, delete the rest
    const slugMap = new Map<string, typeof enabled>()
    for (const mod of enabled) {
      const slug = mod.fileName.toLowerCase()
        .replace(/[-_][\d].*$/, '')
        .replace(/\.jar(\.disabled)?$/, '')
      const group = slugMap.get(slug) ?? []
      group.push(mod)
      slugMap.set(slug, group)
    }
    for (const [, group] of slugMap) {
      if (group.length < 2) continue
      group.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
      for (const mod of group.slice(1)) {
        deleteMod(profileId, mod.id)
        fixed.push(mod.fileName)
      }
    }

    return { fixed }
  })
}
