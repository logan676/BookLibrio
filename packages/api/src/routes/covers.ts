/**
 * Cover Images Routes - Serves covers from R2 storage
 * Supports thumbnail generation via ?thumb=1 query parameter
 * Thumbnails are cached in R2 for optimal performance
 */

import { Hono } from 'hono'
import { streamFromR2, isR2Configured, uploadToR2 } from '../services/storage'

// Sharp is a CommonJS module - use dynamic import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSharp = async (): Promise<typeof import('sharp')> => {
  const module = await import('sharp')
  return (module as any).default || module
}

const app = new Hono()

// Thumbnail width for book store grid display
const THUMBNAIL_WIDTH = 300

/**
 * Convert stream to buffer for image processing
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

/**
 * Generate thumbnail key from original cover key
 * covers/ebooks/book.jpg → covers/thumbs/ebooks/book.jpg
 */
function getThumbnailKey(originalKey: string): string {
  return originalKey.replace('covers/', 'covers/thumbs/')
}

// GET /api/r2-covers/:type/:filename
// Optional query params:
// - thumb=1: Return thumbnail version (300px width, cached in R2)
app.get('/:type/:filename', async (c) => {
  const { type, filename } = c.req.param()
  const wantThumbnail = c.req.query('thumb') === '1'

  if (!['magazines', 'ebooks'].includes(type)) {
    return c.json({ error: 'Invalid type' }, 400)
  }

  if (!isR2Configured()) {
    return c.json({ error: 'R2 storage not configured' }, 500)
  }

  const originalKey = `covers/${type}/${filename}`
  const thumbnailKey = getThumbnailKey(originalKey)

  try {
    // If thumbnail requested, try to serve from cache first
    if (wantThumbnail) {
      // 1. Check if cached thumbnail exists in R2
      const cachedThumb = await streamFromR2(thumbnailKey)

      if (cachedThumb) {
        // Serve cached thumbnail
        console.log(`Serving cached thumbnail: ${thumbnailKey}`)
        const webStream = cachedThumb.transformToWebStream()
        return new Response(webStream, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000', // 1 year (immutable cache)
          },
        })
      }

      // 2. Cached thumbnail not found - fetch original
      const originalStream = await streamFromR2(originalKey)

      if (!originalStream) {
        return c.json({ error: 'Cover not found' }, 404)
      }

      // 3. Generate thumbnail
      console.log(`Generating thumbnail for: ${originalKey}`)
      const originalBuffer = await streamToBuffer(originalStream as NodeJS.ReadableStream)

      const sharp = await getSharp()
      const thumbnailBuffer = await sharp(originalBuffer)
        .resize(THUMBNAIL_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer()

      // 4. Upload thumbnail to R2 cache (async, don't block response)
      uploadToR2(thumbnailKey, thumbnailBuffer, 'image/jpeg')
        .then(() => console.log(`Cached thumbnail: ${thumbnailKey}`))
        .catch((err) => console.error(`Failed to cache thumbnail: ${thumbnailKey}`, err))

      // 5. Return the generated thumbnail
      return new Response(new Uint8Array(thumbnailBuffer), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000', // 1 year
        },
      })
    }

    // Return original image
    const stream = await streamFromR2(originalKey)

    if (!stream) {
      return c.json({ error: 'Cover not found' }, 404)
    }

    const webStream = stream.transformToWebStream()

    return new Response(webStream, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Failed to serve cover:', error)
    return c.json({ error: 'Failed to serve cover' }, 500)
  }
})

export default app
