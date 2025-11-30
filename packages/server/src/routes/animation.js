import { Router } from 'express'
import { existsSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, basename, extname } from 'path'
import db from '../config/database.js'
import { streamFile, videoExtensions } from '../utils/streaming.js'

const router = Router()

const ANIMATION_ROOT_PATHS = [
  '/Volumes/Elements SE/动漫'
]

// Get all animation series
router.get('/series', (req, res) => {
  try {
    const { search } = req.query
    let sql = 'SELECT * FROM animation_series WHERE 1=1'
    const params = []

    if (search) {
      sql += ' AND name LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY name ASC'
    const series = db.prepare(sql).all(...params)
    res.json(series)
  } catch (error) {
    console.error('Animation series error:', error)
    res.status(500).json({ error: 'Failed to get animation series' })
  }
})

// Get episodes for an animation series
router.get('/series/:seriesId/episodes', (req, res) => {
  try {
    const episodes = db.prepare(`
      SELECT e.*, s.name as series_name
      FROM animation_episodes e
      JOIN animation_series s ON e.series_id = s.id
      WHERE e.series_id = ?
      ORDER BY e.episode ASC, e.title ASC
    `).all(req.params.seriesId)
    res.json(episodes)
  } catch (error) {
    console.error('Animation episodes error:', error)
    res.status(500).json({ error: 'Failed to get animation episodes' })
  }
})

// Stream animation episode
router.get('/episodes/:id/stream', async (req, res) => {
  try {
    const episode = db.prepare('SELECT * FROM animation_episodes WHERE id = ?').get(req.params.id)
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' })
    }

    await streamFile(episode.file_path, req, res, 'video')
  } catch (error) {
    console.error('Animation stream error:', error)
    res.status(500).json({ error: 'Failed to stream animation' })
  }
})

// Scan animation folders
async function scanAnimationFolder() {
  console.log('[Animation Scan] Starting scan...')
  let seriesCount = 0
  let episodeCount = 0
  const seenFiles = new Set()

  const scanDirectory = async (rootPath, seriesName) => {
    let series = db.prepare('SELECT * FROM animation_series WHERE folder_path = ?').get(rootPath)
    if (!series) {
      db.prepare(`
        INSERT INTO animation_series (name, folder_path, episode_count)
        VALUES (?, ?, 0)
      `).run(seriesName, rootPath)
      series = db.prepare('SELECT * FROM animation_series WHERE folder_path = ?').get(rootPath)
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

            const existingEpisode = db.prepare('SELECT id FROM animation_episodes WHERE file_path = ?').get(itemPath)
            if (!existingEpisode) {
              const ext = extname(item).toLowerCase().slice(1)
              let title = item.replace(/\.[^.]+$/, '')

              // Try to extract episode number
              const epMatch = title.match(/(\d+)/g)
              const episode = epMatch ? parseInt(epMatch[epMatch.length - 1]) : null

              db.prepare(`
                INSERT INTO animation_episodes (series_id, title, file_path, file_size, file_type, episode)
                VALUES (?, ?, ?, ?, ?, ?)
              `).run(series.id, title, itemPath, itemStat.size, ext, episode)
              episodeCount++
            }
          }
        }
      } catch (err) {
        console.error('[Animation Scan] Error scanning directory:', dirPath, err.message)
      }
    }

    await scanDir(rootPath)

    const count = db.prepare('SELECT COUNT(*) as count FROM animation_episodes WHERE series_id = ?').get(series.id)
    db.prepare('UPDATE animation_series SET episode_count = ? WHERE id = ?').run(count.count, series.id)
  }

  for (const rootPath of ANIMATION_ROOT_PATHS) {
    if (existsSync(rootPath)) {
      const seriesName = basename(rootPath)
      console.log('[Animation Scan] Scanning:', seriesName)
      await scanDirectory(rootPath, seriesName)
    } else {
      console.log('[Animation Scan] Folder not found:', rootPath)
    }
  }

  console.log(`[Animation Scan] Completed: ${seriesCount} new series, ${episodeCount} new episodes`)
  return { series: seriesCount, episodes: episodeCount }
}

export { scanAnimationFolder }
export default router
