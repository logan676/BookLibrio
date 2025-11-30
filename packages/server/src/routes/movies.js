import { Router } from 'express'
import { existsSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, extname } from 'path'
import db from '../config/database.js'
import { streamFile, videoExtensions } from '../utils/streaming.js'

const router = Router()

const MOVIES_ROOT_PATHS = [
  '/Volumes/三星移动硬盘/电影'
]

// Get all movies
router.get('/', (req, res) => {
  try {
    const { search } = req.query
    let sql = 'SELECT * FROM movies WHERE 1=1'
    const params = []

    if (search) {
      sql += ' AND title LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY title ASC'
    const movies = db.prepare(sql).all(...params)
    res.json(movies)
  } catch (error) {
    console.error('Movies error:', error)
    res.status(500).json({ error: 'Failed to get movies' })
  }
})

// Stream movie
router.get('/:id/stream', async (req, res) => {
  try {
    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id)
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }

    await streamFile(movie.file_path, req, res, 'video')
  } catch (error) {
    console.error('Movie stream error:', error)
    res.status(500).json({ error: 'Failed to stream movie' })
  }
})

// Scan movies folders
async function scanMoviesFolder() {
  console.log('[Movies Scan] Starting scan...')
  let movieCount = 0
  const seenFiles = new Set()

  const scanDirectory = async (dirPath) => {
    try {
      const items = await readdir(dirPath)

      for (const item of items) {
        if (item.startsWith('.') || item.startsWith('._')) continue
        const itemPath = join(dirPath, item)
        const itemStat = await stat(itemPath)

        if (itemStat.isDirectory()) {
          await scanDirectory(itemPath)
        } else if (videoExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
          if (seenFiles.has(itemPath)) continue
          seenFiles.add(itemPath)

          const existingMovie = db.prepare('SELECT id FROM movies WHERE file_path = ?').get(itemPath)
          if (!existingMovie) {
            const ext = extname(item).toLowerCase().slice(1)
            let title = item.replace(/\.[^.]+$/, '')
            const yearMatch = title.match(/\b(19|20)\d{2}\b/)
            const year = yearMatch ? parseInt(yearMatch[0]) : null

            db.prepare(`
              INSERT INTO movies (title, file_path, file_size, file_type, year)
              VALUES (?, ?, ?, ?, ?)
            `).run(title, itemPath, itemStat.size, ext, year)
            movieCount++
          }
        }
      }
    } catch (err) {
      console.error('[Movies Scan] Error scanning directory:', dirPath, err.message)
    }
  }

  for (const rootPath of MOVIES_ROOT_PATHS) {
    if (existsSync(rootPath)) {
      console.log('[Movies Scan] Scanning:', rootPath)
      await scanDirectory(rootPath)
    } else {
      console.log('[Movies Scan] Folder not found:', rootPath)
    }
  }

  console.log(`[Movies Scan] Completed: ${movieCount} new movies`)
  return { movies: movieCount }
}

export { scanMoviesFolder }
export default router
