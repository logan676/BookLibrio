import { Router } from 'express'
import { existsSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, basename, extname } from 'path'
import db from '../config/database.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'
import { streamFile, videoExtensions } from '../utils/streaming.js'

const router = Router()

const NBA_ROOT_PATH = '/Volumes/Elements SE/NBA'

// Get all NBA series (grouped by category)
router.get('/series', (req, res) => {
  try {
    const { search, category } = req.query
    let sql = `
      SELECT s.*, COUNT(g.id) as game_count
      FROM nba_series s
      LEFT JOIN nba_games g ON s.id = g.series_id
      WHERE 1=1
    `
    const params = []

    if (search) {
      sql += ' AND s.name LIKE ?'
      params.push(`%${search}%`)
    }
    if (category) {
      sql += ' AND s.category = ?'
      params.push(category)
    }

    sql += ' GROUP BY s.id ORDER BY s.category, s.name ASC'
    const series = db.prepare(sql).all(...params)
    res.json(series)
  } catch (error) {
    console.error('NBA series error:', error)
    res.status(500).json({ error: 'Failed to get NBA series' })
  }
})

// Get all categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT DISTINCT category, COUNT(*) as series_count
      FROM nba_series
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `).all()
    res.json(categories)
  } catch (error) {
    console.error('NBA categories error:', error)
    res.status(500).json({ error: 'Failed to get NBA categories' })
  }
})

// Get games for a series
router.get('/series/:id/games', (req, res) => {
  try {
    const games = db.prepare('SELECT * FROM nba_games WHERE series_id = ? ORDER BY title ASC').all(req.params.id)
    res.json(games)
  } catch (error) {
    console.error('NBA games error:', error)
    res.status(500).json({ error: 'Failed to get NBA games' })
  }
})

// Stream NBA game
router.get('/games/:id/stream', async (req, res) => {
  try {
    const game = db.prepare('SELECT * FROM nba_games WHERE id = ?').get(req.params.id)
    if (!game) {
      return res.status(404).json({ error: 'Game not found' })
    }

    await streamFile(game.file_path, req, res, 'video')
  } catch (error) {
    console.error('NBA stream error:', error)
    res.status(500).json({ error: 'Failed to stream NBA game' })
  }
})

// Scan NBA folders
async function scanNBAFolder() {
  console.log('[NBA Scan] Starting scan...')
  let seriesCount = 0
  let gameCount = 0
  const seenFiles = new Set()

  const scanDirectory = async (dirPath, category = null) => {
    try {
      const items = await readdir(dirPath)

      for (const item of items) {
        if (item.startsWith('.') || item.startsWith('._')) continue
        const itemPath = join(dirPath, item)
        const itemStat = await stat(itemPath)

        if (itemStat.isDirectory()) {
          // If at root level, this is a category
          if (dirPath === NBA_ROOT_PATH) {
            await scanDirectory(itemPath, item)
          } else {
            // This is a series folder
            let series = db.prepare('SELECT * FROM nba_series WHERE folder_path = ?').get(itemPath)
            if (!series) {
              db.prepare(`
                INSERT INTO nba_series (name, folder_path, category, game_count)
                VALUES (?, ?, ?, 0)
              `).run(item, itemPath, category)
              series = db.prepare('SELECT * FROM nba_series WHERE folder_path = ?').get(itemPath)
              seriesCount++
            }

            // Scan for games in this series
            const seriesItems = await readdir(itemPath)
            for (const gameItem of seriesItems) {
              if (gameItem.startsWith('.') || gameItem.startsWith('._')) continue
              const gamePath = join(itemPath, gameItem)
              const gameStat = await stat(gamePath)

              if (!gameStat.isDirectory() && videoExtensions.some(ext => gameItem.toLowerCase().endsWith(ext))) {
                if (seenFiles.has(gamePath)) continue
                seenFiles.add(gamePath)

                const existingGame = db.prepare('SELECT id FROM nba_games WHERE file_path = ?').get(gamePath)
                if (!existingGame) {
                  const ext = extname(gameItem).toLowerCase().slice(1)
                  let title = gameItem.replace(/\.[^.]+$/, '')

                  db.prepare(`
                    INSERT INTO nba_games (series_id, title, file_path, file_size, file_type)
                    VALUES (?, ?, ?, ?, ?)
                  `).run(series.id, title, gamePath, gameStat.size, ext)
                  gameCount++
                }
              }
            }

            // Update game count
            const count = db.prepare('SELECT COUNT(*) as count FROM nba_games WHERE series_id = ?').get(series.id)
            db.prepare('UPDATE nba_series SET game_count = ? WHERE id = ?').run(count.count, series.id)
          }
        } else if (category && videoExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
          // Video file directly under category folder
          let series = db.prepare('SELECT * FROM nba_series WHERE folder_path = ?').get(dirPath)
          if (!series) {
            db.prepare(`
              INSERT INTO nba_series (name, folder_path, category, game_count)
              VALUES (?, ?, ?, 0)
            `).run(category, dirPath, category)
            series = db.prepare('SELECT * FROM nba_series WHERE folder_path = ?').get(dirPath)
            seriesCount++
          }

          if (seenFiles.has(itemPath)) continue
          seenFiles.add(itemPath)

          const existingGame = db.prepare('SELECT id FROM nba_games WHERE file_path = ?').get(itemPath)
          if (!existingGame) {
            const ext = extname(item).toLowerCase().slice(1)
            let title = item.replace(/\.[^.]+$/, '')

            db.prepare(`
              INSERT INTO nba_games (series_id, title, file_path, file_size, file_type)
              VALUES (?, ?, ?, ?, ?)
            `).run(series.id, title, itemPath, itemStat.size, ext)
            gameCount++
          }
        }
      }
    } catch (err) {
      console.error('[NBA Scan] Error scanning directory:', dirPath, err.message)
    }
  }

  if (existsSync(NBA_ROOT_PATH)) {
    console.log('[NBA Scan] Scanning:', NBA_ROOT_PATH)
    await scanDirectory(NBA_ROOT_PATH)
  } else {
    console.log('[NBA Scan] Folder not found:', NBA_ROOT_PATH)
  }

  console.log(`[NBA Scan] Completed: ${seriesCount} new series, ${gameCount} new games`)
  return { series: seriesCount, games: gameCount }
}

// API endpoint to manually trigger NBA scan
router.post('/scan', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await scanNBAFolder()
    res.json({ message: 'Scan completed', ...result })
  } catch (error) {
    console.error('NBA scan error:', error)
    res.status(500).json({ error: 'Failed to scan NBA folders' })
  }
})

// Get NBA stats
router.get('/stats', (req, res) => {
  try {
    const seriesCount = db.prepare('SELECT COUNT(*) as count FROM nba_series').get().count
    const gameCount = db.prepare('SELECT COUNT(*) as count FROM nba_games').get().count
    res.json({ series: seriesCount, games: gameCount })
  } catch (error) {
    console.error('NBA stats error:', error)
    res.status(500).json({ error: 'Failed to get NBA stats' })
  }
})

export { scanNBAFolder }
export default router
