import { Router } from 'express'
import { existsSync, createReadStream } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, basename, extname } from 'path'
import db from '../config/database.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

const router = Router()

const AUDIO_ROOT_PATHS = [
  '/Volumes/三星移动硬盘/有声书'
]

// Get all audio series with audio count
router.get('/series', (req, res) => {
  try {
    const series = db.prepare(`
      SELECT s.*, COUNT(a.id) as audio_count
      FROM audio_series s
      LEFT JOIN audio_files a ON s.id = a.series_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all()
    res.json(series)
  } catch (error) {
    console.error('Audio series error:', error)
    res.status(500).json({ error: 'Failed to get audio series' })
  }
})

// Get audio files for a series
router.get('/', (req, res) => {
  try {
    const { series_id, search } = req.query
    let sql = 'SELECT * FROM audio_files WHERE 1=1'
    const params = []

    if (series_id) {
      sql += ' AND series_id = ?'
      params.push(parseInt(series_id))
    }
    if (search) {
      sql += ' AND title LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY title ASC'
    const audioFiles = db.prepare(sql).all(...params)
    res.json(audioFiles)
  } catch (error) {
    console.error('Audio files error:', error)
    res.status(500).json({ error: 'Failed to get audio files' })
  }
})

// Stream audio file
router.get('/:id/stream', async (req, res) => {
  try {
    const audio = db.prepare('SELECT * FROM audio_files WHERE id = ?').get(req.params.id)
    if (!audio) {
      return res.status(404).json({ error: 'Audio not found' })
    }

    const filePath = audio.file_path
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' })
    }

    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const range = req.headers.range

    const ext = extname(filePath).toLowerCase()
    const contentTypes = {
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg'
    }
    const contentType = contentTypes[ext] || 'audio/mpeg'

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      })

      const stream = createReadStream(filePath, { start, end })
      stream.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      })
      createReadStream(filePath).pipe(res)
    }
  } catch (error) {
    console.error('Audio stream error:', error)
    res.status(500).json({ error: 'Failed to stream audio' })
  }
})

// Scan audio folders
async function scanAudioFolders() {
  console.log('[Audio Scan] Starting scan...')
  const audioExtensions = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg']
  let seriesCount = 0
  let audioCount = 0
  const seenFiles = new Set()

  for (const rootPath of AUDIO_ROOT_PATHS) {
    if (!existsSync(rootPath)) {
      console.log('[Audio Scan] Folder not found:', rootPath)
      continue
    }

    console.log('[Audio Scan] Scanning', rootPath)

    const scanDirectory = async (dirPath, seriesName = null) => {
      try {
        const items = await readdir(dirPath)
        let hasAudioFiles = false
        let audioFilesInDir = []

        for (const item of items) {
          if (item.startsWith('.') || item.startsWith('._')) continue
          const itemPath = join(dirPath, item)
          const itemStat = await stat(itemPath)

          if (itemStat.isDirectory()) {
            await scanDirectory(itemPath, item)
          } else if (audioExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
            hasAudioFiles = true
            audioFilesInDir.push({ name: item, path: itemPath, size: itemStat.size })
          }
        }

        if (hasAudioFiles && audioFilesInDir.length > 0) {
          const effectiveSeriesName = seriesName || basename(dirPath)

          let existingSeries = db.prepare('SELECT id FROM audio_series WHERE folder_path = ?').get(dirPath)
          let seriesId

          if (existingSeries) {
            seriesId = existingSeries.id
          } else {
            const result = db.prepare(`
              INSERT INTO audio_series (name, folder_path) VALUES (?, ?)
            `).run(effectiveSeriesName, dirPath)
            seriesId = result.lastInsertRowid
            seriesCount++
          }

          for (const audioFile of audioFilesInDir) {
            if (seenFiles.has(audioFile.path)) continue
            seenFiles.add(audioFile.path)

            const existingAudio = db.prepare('SELECT id FROM audio_files WHERE file_path = ?').get(audioFile.path)
            if (!existingAudio) {
              const ext = extname(audioFile.name).toLowerCase().slice(1)
              let title = audioFile.name.replace(/\.[^.]+$/, '')

              db.prepare(`
                INSERT INTO audio_files (series_id, title, file_path, file_size, file_type)
                VALUES (?, ?, ?, ?, ?)
              `).run(seriesId, title, audioFile.path, audioFile.size, ext)
              audioCount++
            }
          }
        }
      } catch (err) {
        console.error('[Audio Scan] Error scanning directory:', dirPath, err.message)
      }
    }

    await scanDirectory(rootPath)
  }

  console.log(`[Audio Scan] Completed: ${seriesCount} new series, ${audioCount} new audio files`)
  return { series: seriesCount, audio: audioCount }
}

// API endpoint to manually trigger audio scan
router.post('/scan', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await scanAudioFolders()
    res.json({ message: 'Scan completed', ...result })
  } catch (error) {
    console.error('Audio scan error:', error)
    res.status(500).json({ error: 'Failed to scan audio folders' })
  }
})

// Get audio stats
router.get('/stats', (req, res) => {
  try {
    const seriesCount = db.prepare('SELECT COUNT(*) as count FROM audio_series').get().count
    const audioCount = db.prepare('SELECT COUNT(*) as count FROM audio_files').get().count
    res.json({ series: seriesCount, audio: audioCount })
  } catch (error) {
    console.error('Audio stats error:', error)
    res.status(500).json({ error: 'Failed to get audio stats' })
  }
})

export default router
export { scanAudioFolders }
