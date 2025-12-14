/**
 * Avatar Images Routes - Serves user avatars from R2 storage
 */

import { Hono } from 'hono'
import { streamFromR2, isR2Configured } from '../services/storage'

const app = new Hono()

// GET /api/avatars/:filename - Serve avatar image
app.get('/:filename', async (c) => {
  const { filename } = c.req.param()

  if (!isR2Configured()) {
    return c.json({ error: 'R2 storage not configured' }, 500)
  }

  const key = `avatars/${filename}`

  try {
    const stream = await streamFromR2(key)

    if (!stream) {
      return c.json({ error: 'Avatar not found' }, 404)
    }

    const webStream = stream.transformToWebStream()

    // Determine content type from filename
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
    }
    const contentType = contentTypes[ext || ''] || 'image/jpeg'

    return new Response(webStream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 1 day cache
      },
    })
  } catch (error) {
    console.error('Failed to serve avatar:', error)
    return c.json({ error: 'Failed to serve avatar' }, 500)
  }
})

export default app
