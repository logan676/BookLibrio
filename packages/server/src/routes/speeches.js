import { Router } from 'express'
import { existsSync, createReadStream } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, basename, extname } from 'path'
import db from '../config/database.js'

const router = Router()

const SPEECHES_ROOT_PATH = '/Volumes/三星移动硬盘/演讲'

// Get all speech series with video count
router.get('/series', (req, res) => {
  try {
    const series = db.prepare(`
      SELECT s.*, COUNT(v.id) as video_count
      FROM speech_series s
      LEFT JOIN speech_videos v ON s.id = v.series_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all()
    res.json(series)
  } catch (error) {
    console.error('Speech series error:', error)
    res.status(500).json({ error: 'Failed to get speech series' })
  }
})

// Get speech videos for a series
router.get('/', (req, res) => {
  try {
    const { series_id, search } = req.query
    let sql = 'SELECT * FROM speech_videos WHERE 1=1'
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
    const videos = db.prepare(sql).all(...params)
    res.json(videos)
  } catch (error) {
    console.error('Speech videos error:', error)
    res.status(500).json({ error: 'Failed to get speech videos' })
  }
})

// Stream speech video
router.get('/:id/stream', async (req, res) => {
  try {
    const video = db.prepare('SELECT * FROM speech_videos WHERE id = ?').get(req.params.id)
    if (!video) {
      return res.status(404).json({ error: 'Speech not found' })
    }

    const filePath = video.file_path
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found' })
    }

    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const range = req.headers.range

    const ext = extname(filePath).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.ts': 'video/mp2t',
      '.webm': 'video/webm'
    }
    const contentType = contentTypes[ext] || 'video/mp4'

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
    console.error('Speech stream error:', error)
    res.status(500).json({ error: 'Failed to stream speech' })
  }
})

// Scan speeches folder
async function scanSpeechesFolder() {
  console.log('[Speeches Scan] Starting scan...')
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.ts', '.webm']
  let seriesCount = 0
  let videoCount = 0
  const seenFiles = new Set()

  const scanDirectory = async (dirPath, seriesName = null) => {
    try {
      const items = await readdir(dirPath)
      let hasVideoFiles = false
      let videoFilesInDir = []

      for (const item of items) {
        if (item.startsWith('.') || item.startsWith('._') || item.endsWith('.lnk')) continue
        const itemPath = join(dirPath, item)
        const itemStat = await stat(itemPath)

        if (itemStat.isDirectory()) {
          await scanDirectory(itemPath, item)
        } else if (videoExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
          hasVideoFiles = true
          videoFilesInDir.push({ name: item, path: itemPath, size: itemStat.size })
        }
      }

      if (hasVideoFiles && videoFilesInDir.length > 0) {
        const effectiveSeriesName = seriesName || basename(dirPath)

        let existingSeries = db.prepare('SELECT id FROM speech_series WHERE folder_path = ?').get(dirPath)
        let seriesId

        if (existingSeries) {
          seriesId = existingSeries.id
        } else {
          const result = db.prepare(`
            INSERT INTO speech_series (name, folder_path) VALUES (?, ?)
          `).run(effectiveSeriesName, dirPath)
          seriesId = result.lastInsertRowid
          seriesCount++
        }

        for (const videoFile of videoFilesInDir) {
          if (seenFiles.has(videoFile.path)) continue
          seenFiles.add(videoFile.path)

          const existingVideo = db.prepare('SELECT id FROM speech_videos WHERE file_path = ?').get(videoFile.path)
          if (!existingVideo) {
            const ext = extname(videoFile.name).toLowerCase().slice(1)
            let title = videoFile.name.replace(/\.[^.]+$/, '')

            db.prepare(`
              INSERT INTO speech_videos (series_id, title, file_path, file_size, file_type)
              VALUES (?, ?, ?, ?, ?)
            `).run(seriesId, title, videoFile.path, videoFile.size, ext)
            videoCount++
          }
        }
      }
    } catch (err) {
      console.error('[Speeches Scan] Error scanning directory:', dirPath, err.message)
    }
  }

  if (existsSync(SPEECHES_ROOT_PATH)) {
    console.log('[Speeches Scan] Scanning:', SPEECHES_ROOT_PATH)
    await scanDirectory(SPEECHES_ROOT_PATH)
  } else {
    console.log('[Speeches Scan] Folder not found:', SPEECHES_ROOT_PATH)
  }

  console.log(`[Speeches Scan] Completed: ${seriesCount} new series, ${videoCount} new videos`)
  return { series: seriesCount, videos: videoCount }
}

export { scanSpeechesFolder }
export default router
