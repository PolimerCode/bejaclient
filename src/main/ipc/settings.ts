import { IpcMain, dialog, shell, app } from 'electron'
import { getSettings, saveSettings, AppSettings } from '../services/settingsService'
import * as https from 'https'
import { scanLocalJava } from '../services/mcinstall'

const SANITY_PROJECT_ID = 'xicxnhum'
const SANITY_DATASET = 'production'

function urlForImage(source: any): string {
  if (!source || !source.asset || !source.asset._ref) return ''
  const m = source.asset._ref.match(/^image-([a-f0-9]+)-(\d+x\d+)-(\w+)$/)
  if (!m) return ''
  const [, id, dimensions, format] = m
  return `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${id}-${dimensions}.${format}`
}

function fetchNews(): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent('*[_type == "newsArticle"] | order(publishedAt desc){title, "slug": slug.current, excerpt, coverImage, publishedAt}')
    const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`
    https
      .get(url, res => {
        let data = ''
        res.on('data', c => (data += c))
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            const result = parsed.result ?? []
            const entries = result.map((item: any) => {
              const coverUrl = urlForImage(item.coverImage)
              return {
                id: item.slug || Math.random().toString(),
                title: item.title || '',
                tag: 'Update',
                category: 'News',
                date: item.publishedAt || new Date().toISOString(),
                text: item.excerpt || '',
                playPageImage: {
                  title: item.title || '',
                  url: coverUrl,
                },
                readMoreLink: `https://bejaclient.xyz/article.html?slug=${encodeURIComponent(item.slug || '')}`,
              }
            })
            resolve(entries)
          } catch {
            resolve([])
          }
        })
      })
      .on('error', reject)
  })
}

export function setupSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:set', (_e, settings: AppSettings) => {
    saveSettings(settings)
    return true
  })

  ipcMain.handle('settings:game-dir', () => {
    return getSettings().game.defaultGameDir
  })

  ipcMain.handle('settings:set-game-dir', (_e, dir: string) => {
    const settings = getSettings()
    settings.game.defaultGameDir = dir
    saveSettings(settings)
    return true
  })

  ipcMain.handle('settings:choose-dir', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Game Directory',
      properties: ['openDirectory'],
    })
    if (result.canceled || !result.filePaths.length) return null
    return result.filePaths[0]
  })

  ipcMain.handle('settings:choose-java', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Java Executable',
      filters: [
        { name: 'Java', extensions: ['exe', ''] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths.length) return null
    return result.filePaths[0]
  })

  ipcMain.handle('news:fetch', async () => {
    try {
      return await fetchNews()
    } catch {
      return []
    }
  })

  ipcMain.handle('system:open-external', (_e, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('system:get-version', () => app.getVersion())

  ipcMain.handle('system:java-versions', async () => {
    try {
      return await scanLocalJava()
    } catch {
      return []
    }
  })
}
