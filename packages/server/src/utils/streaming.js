import { existsSync, createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { extname } from 'path'

const videoContentTypes = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.ts': 'video/mp2t',
  '.webm': 'video/webm',
  '.iso': 'application/octet-stream'
}

const audioContentTypes = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg'
}

export async function streamFile(filePath, req, res, type = 'video') {
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' })
  }

  const fileStat = await stat(filePath)
  const fileSize = fileStat.size
  const range = req.headers.range

  const ext = extname(filePath).toLowerCase()
  const contentTypes = type === 'audio' ? audioContentTypes : videoContentTypes
  const contentType = contentTypes[ext] || (type === 'audio' ? 'audio/mpeg' : 'video/mp4')

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
}

export const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.ts', '.webm', '.iso']
export const audioExtensions = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg']
