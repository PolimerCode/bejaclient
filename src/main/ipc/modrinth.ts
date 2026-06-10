import { IpcMain, BrowserWindow } from 'electron'
import { searchModrinth, getCategories, getProjectVersions, downloadMod, downloadModVersion, downloadResourcePack, downloadShader, downloadDatapack, installModpack, ModrinthProjectType } from '../services/modrinthService'
import { searchCurseforge, installCurseforgeMod } from '../services/curseforgeService'
import { deleteMod, listMods } from '../services/modService'
import { recordModInstall, getInstalls } from '../services/installTracker'

export interface ExploreHit {
  id: string
  title: string
  description: string
  iconUrl: string | null
  downloads: number
  categories: string[]
  source: 'modrinth' | 'curseforge'
  projectType: string
  slug: string
}

export function setupModrinthHandlers(ipcMain: IpcMain, mainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('modrinth:search', async (_e, query: string, type: ModrinthProjectType, gameVersion?: string, loader?: string, offset?: number, categories?: string[]) => {
    try {
      const result = await searchModrinth(query, type, gameVersion, loader, offset, categories)
      console.log(`[modrinth:search] type=${type} hits=${result.hits.length} total=${result.total_hits}`)
      return result
    } catch (e) {
      console.error('[modrinth:search] failed:', e)
      throw e
    }
  })

  ipcMain.handle('modrinth:categories', async () => {
    return getCategories()
  })

  ipcMain.handle('explore:search', async (
    _e,
    query: string,
    type: string,
    source: 'modrinth' | 'curseforge' | 'both',
    gameVersion?: string,
    loader?: string,
    offset = 0,
    categories?: string[],
  ): Promise<{ hits: ExploreHit[]; total: number }> => {
    const mrHits: ExploreHit[] = []
    const cfHits: ExploreHit[] = []
    let total = 0

    if (source === 'modrinth' || source === 'both') {
      try {
        const res = await searchModrinth(query, type as ModrinthProjectType, gameVersion, loader, offset, categories)
        for (const h of res.hits) {
          mrHits.push({
            id:          h.project_id,
            title:       h.title,
            description: h.description,
            iconUrl:     h.icon_url,
            downloads:   h.downloads,
            categories:  h.categories,
            source:      'modrinth',
            projectType: h.project_type,
            slug:        h.slug,
          })
        }
        total += res.total_hits
      } catch (e) {
        console.error('[explore:search] modrinth error:', e)
      }
    }

    if (source === 'curseforge' || source === 'both') {
      try {
        const res = await searchCurseforge(query, type, gameVersion, loader, offset)
        console.log(`[explore:search] cf hits=${res.hits.length} total=${res.total}`)
        for (const h of res.hits) {
          cfHits.push({
            id:          String(h.id),
            title:       h.name,
            description: h.summary,
            iconUrl:     h.logo?.thumbnailUrl ?? null,
            downloads:   h.downloadCount,
            categories:  h.categories.map(c => c.name),
            source:      'curseforge',
            projectType: type,
            slug:        h.slug,
          })
        }
        total += res.total
      } catch (e) {
        console.error('[explore:search] curseforge error:', e)
        // Surface error to renderer when CF-only so it isn't silent
        if (source === 'curseforge') throw e
      }
    }

    // Interleave results when both: mr, cf, mr, cf...
    let hits: ExploreHit[]
    if (source === 'both') {
      const maxLen = Math.max(mrHits.length, cfHits.length)
      hits = []
      for (let i = 0; i < maxLen; i++) {
        if (mrHits[i]) hits.push(mrHits[i])
        if (cfHits[i]) hits.push(cfHits[i])
      }
    } else {
      hits = source === 'modrinth' ? mrHits : cfHits
    }

    return { hits, total }
  })

  ipcMain.handle('modrinth:versions', async (_e, projectId: string, gameVersion?: string, loader?: string) => {
    return getProjectVersions(projectId, gameVersion, loader)
  })

  ipcMain.handle('installs:get', () => getInstalls())

  ipcMain.handle('modrinth:install-mod', async (event, projectId: string, profileId: string) => {
    await downloadMod(projectId, profileId, msg => {
      event.sender.send('modrinth:progress', msg)
    })
    recordModInstall(projectId, profileId)
    return true
  })

  ipcMain.handle('modrinth:install-modpack', async (event, projectId: string, versionId: string | null) => {
    const result = await installModpack(projectId, versionId, msg => {
      event.sender.send('modrinth:progress', msg)
    })
    return result
  })

  ipcMain.handle('modrinth:install-resourcepack', async (event, projectId: string, profileId: string) => {
    await downloadResourcePack(projectId, profileId, msg => {
      event.sender.send('modrinth:progress', msg)
    })
    recordModInstall(projectId, profileId)
    return true
  })

  ipcMain.handle('modrinth:install-shader', async (event, projectId: string, profileId: string) => {
    await downloadShader(projectId, profileId, msg => {
      event.sender.send('modrinth:progress', msg)
    })
    recordModInstall(projectId, profileId)
    return true
  })

  ipcMain.handle('modrinth:install-datapack', async (event, projectId: string, profileId: string) => {
    await downloadDatapack(projectId, profileId, msg => {
      event.sender.send('modrinth:progress', msg)
    })
    recordModInstall(projectId, profileId)
    return true
  })

  ipcMain.handle('curseforge:install', async (event, modId: string, projectType: string, profileId: string) => {
    await installCurseforgeMod(modId, projectType, profileId, msg => {
      event.sender.send('modrinth:progress', msg)
    })
    return true
  })

  ipcMain.handle('modrinth:swap-mod', async (event, profileId: string, oldModId: string, projectId: string, versionId: string) => {
    deleteMod(profileId, oldModId)
    await downloadModVersion(projectId, versionId, profileId, msg => {
      event.sender.send('modrinth:progress', msg)
    })
    return listMods(profileId)
  })
}
