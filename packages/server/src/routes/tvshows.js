import { Router } from 'express'
import { existsSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, basename, extname } from 'path'
import db from '../config/database.js'
import { streamFile, videoExtensions } from '../utils/streaming.js'

const router = Router()

const TVSHOWS_ROOT_PATHS = [
  '/Volumes/美剧/SexEducationSeason1',
  '/Volumes/美剧/SexEducationSeason2',
  '/Volumes/美剧/SexEducationSeason3',
  '/Volumes/美剧/SexEducationSeason4',
  '/Volumes/美剧/猫和老鼠 4K修复',
  '/Volumes/美剧/美剧',
  '/Volumes/Elements SE/电视剧'
]

// Get all TV show series
router.get('/series', (req, res) => {
  try {
    const { search } = req.query
    let sql = 'SELECT * FROM tvshow_series WHERE 1=1'
    const params = []

    if (search) {
      sql += ' AND name LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY name ASC'
    const series = db.prepare(sql).all(...params)
    res.json(series)
  } catch (error) {
    console.error('TV Shows series error:', error)
    res.status(500).json({ error: 'Failed to get TV show series' })
  }
})

// Get episodes for a series
router.get('/series/:seriesId/episodes', (req, res) => {
  try {
    const episodes = db.prepare(`
      SELECT e.*, s.name as series_name
      FROM tvshow_episodes e
      JOIN tvshow_series s ON e.series_id = s.id
      WHERE e.series_id = ?
      ORDER BY e.season ASC, e.episode ASC, e.title ASC
    `).all(req.params.seriesId)
    res.json(episodes)
  } catch (error) {
    console.error('TV Show episodes error:', error)
    res.status(500).json({ error: 'Failed to get TV show episodes' })
  }
})

// Stream TV show episode
router.get('/episodes/:id/stream', async (req, res) => {
  try {
    const episode = db.prepare('SELECT * FROM tvshow_episodes WHERE id = ?').get(req.params.id)
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' })
    }

    await streamFile(episode.file_path, req, res, 'video')
  } catch (error) {
    console.error('TV Show episode stream error:', error)
    res.status(500).json({ error: 'Failed to stream episode' })
  }
})

// Scan TV shows folders
async function scanTVShowsFolder() {
  console.log('[TV Shows Scan] Starting scan...')
  let seriesCount = 0
  let episodeCount = 0
  const seenFiles = new Set()

  const scanDirectory = async (rootPath, seriesName) => {
    let series = db.prepare('SELECT * FROM tvshow_series WHERE folder_path = ?').get(rootPath)
    if (!series) {
      db.prepare(`
        INSERT INTO tvshow_series (name, folder_path, episode_count)
        VALUES (?, ?, 0)
      `).run(seriesName, rootPath)
      series = db.prepare('SELECT * FROM tvshow_series WHERE folder_path = ?').get(rootPath)
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

            const existingEpisode = db.prepare('SELECT id FROM tvshow_episodes WHERE file_path = ?').get(itemPath)
            if (!existingEpisode) {
              const ext = extname(item).toLowerCase().slice(1)
              let title = item.replace(/\.[^.]+$/, '')

              const seMatch = title.match(/S(\d+)E(\d+)/i)
              const season = seMatch ? parseInt(seMatch[1]) : null
              const episode = seMatch ? parseInt(seMatch[2]) : null

              db.prepare(`
                INSERT INTO tvshow_episodes (series_id, title, file_path, file_size, file_type, season, episode)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(series.id, title, itemPath, itemStat.size, ext, season, episode)
              episodeCount++
            }
          }
        }
      } catch (err) {
        console.error('[TV Shows Scan] Error scanning directory:', dirPath, err.message)
      }
    }

    await scanDir(rootPath)

    const count = db.prepare('SELECT COUNT(*) as count FROM tvshow_episodes WHERE series_id = ?').get(series.id)
    db.prepare('UPDATE tvshow_series SET episode_count = ? WHERE id = ?').run(count.count, series.id)
  }

  for (const rootPath of TVSHOWS_ROOT_PATHS) {
    if (existsSync(rootPath)) {
      const seriesName = basename(rootPath)
      console.log('[TV Shows Scan] Scanning:', seriesName)
      await scanDirectory(rootPath, seriesName)
    } else {
      console.log('[TV Shows Scan] Folder not found:', rootPath)
    }
  }

  console.log(`[TV Shows Scan] Completed: ${seriesCount} new series, ${episodeCount} new episodes`)
  return { series: seriesCount, episodes: episodeCount }
}

export { scanTVShowsFolder }
export default router
