import { Router } from 'express'
import { existsSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, basename, extname } from 'path'
import db from '../config/database.js'
import { streamFile, videoExtensions } from '../utils/streaming.js'

const router = Router()

const DOCUMENTARIES_ROOT_PATHS = [
  '/Volumes/Elements SE/纪录片',
  '/Volumes/Elements SE/航拍中国 第一季 6集全 2017 国语 内嵌中字'
]

// Get all documentary series
router.get('/series', (req, res) => {
  try {
    const { search } = req.query
    let sql = 'SELECT * FROM documentary_series WHERE 1=1'
    const params = []

    if (search) {
      sql += ' AND name LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY name ASC'
    const series = db.prepare(sql).all(...params)
    res.json(series)
  } catch (error) {
    console.error('Documentary series error:', error)
    res.status(500).json({ error: 'Failed to get documentary series' })
  }
})

// Get episodes for a documentary series
router.get('/series/:seriesId/episodes', (req, res) => {
  try {
    const episodes = db.prepare(`
      SELECT e.*, s.name as series_name
      FROM documentary_episodes e
      JOIN documentary_series s ON e.series_id = s.id
      WHERE e.series_id = ?
      ORDER BY e.title ASC
    `).all(req.params.seriesId)
    res.json(episodes)
  } catch (error) {
    console.error('Documentary episodes error:', error)
    res.status(500).json({ error: 'Failed to get documentary episodes' })
  }
})

// Stream documentary episode
router.get('/episodes/:id/stream', async (req, res) => {
  try {
    const episode = db.prepare('SELECT * FROM documentary_episodes WHERE id = ?').get(req.params.id)
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' })
    }

    await streamFile(episode.file_path, req, res, 'video')
  } catch (error) {
    console.error('Documentary stream error:', error)
    res.status(500).json({ error: 'Failed to stream documentary' })
  }
})

// Scan documentaries folders
async function scanDocumentariesFolder() {
  console.log('[Documentaries Scan] Starting scan...')
  let seriesCount = 0
  let episodeCount = 0
  const seenFiles = new Set()

  const scanDirectory = async (rootPath, seriesName) => {
    let series = db.prepare('SELECT * FROM documentary_series WHERE folder_path = ?').get(rootPath)
    if (!series) {
      db.prepare(`
        INSERT INTO documentary_series (name, folder_path, episode_count)
        VALUES (?, ?, 0)
      `).run(seriesName, rootPath)
      series = db.prepare('SELECT * FROM documentary_series WHERE folder_path = ?').get(rootPath)
      seriesCount++
    }

    const scanDir = async (dirPath) => {
      try {
        const items = await readdir(dirPath)

        for (const item of items) {
          if (item.startsWith('.') || item.startsWith('._')) continue
          const itemPath = join(dirPath, item)
          const itemStat = await stat(itemPath)

          if (itemStat.isDirectory()) {
            await scanDir(itemPath)
          } else if (videoExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
            if (seenFiles.has(itemPath)) continue
            seenFiles.add(itemPath)

            const existingEpisode = db.prepare('SELECT id FROM documentary_episodes WHERE file_path = ?').get(itemPath)
            if (!existingEpisode) {
              const ext = extname(item).toLowerCase().slice(1)
              let title = item.replace(/\.[^.]+$/, '')

              db.prepare(`
                INSERT INTO documentary_episodes (series_id, title, file_path, file_size, file_type)
                VALUES (?, ?, ?, ?, ?)
              `).run(series.id, title, itemPath, itemStat.size, ext)
              episodeCount++
            }
          }
        }
      } catch (err) {
        console.error('[Documentaries Scan] Error scanning directory:', dirPath, err.message)
      }
    }

    await scanDir(rootPath)

    const count = db.prepare('SELECT COUNT(*) as count FROM documentary_episodes WHERE series_id = ?').get(series.id)
    db.prepare('UPDATE documentary_series SET episode_count = ? WHERE id = ?').run(count.count, series.id)
  }

  for (const rootPath of DOCUMENTARIES_ROOT_PATHS) {
    if (existsSync(rootPath)) {
      const seriesName = basename(rootPath)
      console.log('[Documentaries Scan] Scanning:', seriesName)
      await scanDirectory(rootPath, seriesName)
    } else {
      console.log('[Documentaries Scan] Folder not found:', rootPath)
    }
  }

  console.log(`[Documentaries Scan] Completed: ${seriesCount} new series, ${episodeCount} new episodes`)
  return { series: seriesCount, episodes: episodeCount }
}

export { scanDocumentariesFolder }
export default router
