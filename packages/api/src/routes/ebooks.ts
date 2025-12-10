import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { ebooks, ebookCategories, ebookUnderlines, ebookIdeas } from '../db/schema'
import { eq, like, desc, count, and } from 'drizzle-orm'
import { streamFromR2, isR2Configured } from '../services/storage'
import { requireAuth } from '../middleware/auth'

const app = new OpenAPIHono()

// Schemas
const EbookSchema = z.object({
  id: z.number(),
  categoryId: z.number().nullable(),
  title: z.string(),
  filePath: z.string().nullable(),
  fileSize: z.number().nullable(),
  fileType: z.string().nullable(),
  normalizedTitle: z.string().nullable(),
  coverUrl: z.string().nullable(),
  s3Key: z.string().nullable(),
  createdAt: z.string().nullable(),
})

const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  count: z.number().optional(),
})

// GET /api/ebooks - List ebooks
const listEbooksRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Ebooks'],
  summary: 'List all ebooks',
  request: {
    query: z.object({
      category: z.coerce.number().optional(),
      search: z.string().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      description: 'List of ebooks',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(EbookSchema),
            total: z.number(),
          }),
        },
      },
    },
  },
})

app.openapi(listEbooksRoute, async (c) => {
  const { category, search, limit, offset } = c.req.valid('query')

  let query = db.select().from(ebooks).$dynamic()

  if (category) {
    query = query.where(eq(ebooks.categoryId, category))
  }

  if (search) {
    query = query.where(like(ebooks.title, `%${search}%`))
  }

  const results = await query
    .orderBy(desc(ebooks.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db.select({ count: count() }).from(ebooks)

  return c.json({
    data: results.map(e => ({
      ...e,
      createdAt: e.createdAt?.toISOString() ?? null,
    })),
    total: totalResult.count,
  })
})

// GET /api/ebooks/:id - Get single ebook
const getEbookRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Ebooks'],
  summary: 'Get ebook by ID',
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Ebook details',
      content: {
        'application/json': {
          schema: z.object({ data: EbookSchema }),
        },
      },
    },
    404: {
      description: 'Ebook not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
  },
})

app.openapi(getEbookRoute, async (c) => {
  const { id } = c.req.valid('param')

  const [ebook] = await db.select().from(ebooks).where(eq(ebooks.id, id)).limit(1)

  if (!ebook) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'Ebook not found' },
    }, 404)
  }

  return c.json({
    data: {
      ...ebook,
      createdAt: ebook.createdAt?.toISOString() ?? null,
    },
  })
})

// GET /api/ebooks/:id/file - Serve ebook file from R2
app.get('/:id/file', async (c) => {
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid ebook ID' } }, 400)
  }

  // Get ebook from database
  const [ebook] = await db.select().from(ebooks).where(eq(ebooks.id, id)).limit(1)

  if (!ebook) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Ebook not found' } }, 404)
  }

  if (!ebook.s3Key) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Ebook file not available' } }, 404)
  }

  if (!isR2Configured()) {
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Storage not configured' } }, 500)
  }

  try {
    const stream = await streamFromR2(ebook.s3Key)

    if (!stream) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'File not found in storage' } }, 404)
    }

    // Determine content type based on file type
    const contentType = ebook.fileType === 'epub'
      ? 'application/epub+zip'
      : ebook.fileType === 'pdf'
        ? 'application/pdf'
        : 'application/octet-stream'

    const webStream = stream.transformToWebStream()

    return new Response(webStream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${encodeURIComponent(ebook.title || 'ebook')}.${ebook.fileType || 'epub'}"`,
      },
    })
  } catch (error) {
    console.error('Failed to serve ebook file:', error)
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to serve file' } }, 500)
  }
})

// GET /api/ebooks/categories - List categories
const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/categories',
  tags: ['Ebooks'],
  summary: 'List ebook categories',
  responses: {
    200: {
      description: 'List of categories',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(CategorySchema),
          }),
        },
      },
    },
  },
})

app.openapi(listCategoriesRoute, async (c) => {
  const categories = await db.select().from(ebookCategories)

  // Get count for each category
  const categoriesWithCount = await Promise.all(
    categories.map(async (cat) => {
      const [result] = await db
        .select({ count: count() })
        .from(ebooks)
        .where(eq(ebooks.categoryId, cat.id))
      return {
        ...cat,
        count: result.count,
      }
    })
  )

  return c.json({
    data: categoriesWithCount,
  })
})

// ============================================
// Ebook Underlines Endpoints
// ============================================

// GET /api/ebooks/:id/underlines - Get underlines for an ebook
app.get('/:id/underlines', async (c) => {
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid ebook ID' } }, 400)
  }

  // Get all underlines for this ebook (public for reading, no auth required)
  const underlines = await db
    .select()
    .from(ebookUnderlines)
    .where(eq(ebookUnderlines.ebookId, id))

  return c.json({
    data: underlines.map(u => ({
      ...u,
      createdAt: u.createdAt?.toISOString() ?? null,
    })),
  })
})

// POST /api/ebooks/:id/underlines - Create underline (requires auth)
app.post('/:id/underlines', requireAuth, async (c) => {
  const id = parseInt(c.req.param('id'))
  const userId = c.get('userId')

  if (isNaN(id)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid ebook ID' } }, 400)
  }

  const body = await c.req.json()
  const { text, paragraph, chapterIndex, paragraphIndex, startOffset, endOffset, cfiRange } = body

  if (!text) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Text is required' } }, 400)
  }

  const [underline] = await db.insert(ebookUnderlines).values({
    ebookId: id,
    userId,
    text,
    paragraph,
    chapterIndex,
    paragraphIndex,
    startOffset,
    endOffset,
    cfiRange,
  }).returning()

  return c.json({
    data: {
      ...underline,
      createdAt: underline.createdAt?.toISOString() ?? null,
    },
  }, 201)
})

// DELETE /api/ebooks/:id/underlines/:underlineId - Delete underline (requires auth)
app.delete('/:id/underlines/:underlineId', requireAuth, async (c) => {
  const id = parseInt(c.req.param('id'))
  const underlineId = parseInt(c.req.param('underlineId'))
  const userId = c.get('userId')

  if (isNaN(id) || isNaN(underlineId)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid ID' } }, 400)
  }

  // Check if underline exists and belongs to user
  const [existing] = await db
    .select()
    .from(ebookUnderlines)
    .where(and(eq(ebookUnderlines.id, underlineId), eq(ebookUnderlines.userId, userId)))

  if (!existing) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Underline not found' } }, 404)
  }

  await db.delete(ebookUnderlines).where(eq(ebookUnderlines.id, underlineId))

  return c.json({ success: true })
})

// GET /api/ebooks/:id/underlines/:underlineId/ideas - Get ideas for an underline
app.get('/:id/underlines/:underlineId/ideas', async (c) => {
  const underlineId = parseInt(c.req.param('underlineId'))

  if (isNaN(underlineId)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid underline ID' } }, 400)
  }

  const ideasList = await db
    .select()
    .from(ebookIdeas)
    .where(eq(ebookIdeas.underlineId, underlineId))

  return c.json({
    data: ideasList.map(idea => ({
      ...idea,
      createdAt: idea.createdAt?.toISOString() ?? null,
    })),
  })
})

// POST /api/ebooks/:id/underlines/:underlineId/ideas - Add idea to underline (requires auth)
app.post('/:id/underlines/:underlineId/ideas', requireAuth, async (c) => {
  const underlineId = parseInt(c.req.param('underlineId'))
  const userId = c.get('userId')

  if (isNaN(underlineId)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid underline ID' } }, 400)
  }

  const body = await c.req.json()
  const { content } = body

  if (!content) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Content is required' } }, 400)
  }

  const [idea] = await db.insert(ebookIdeas).values({
    underlineId,
    userId,
    content,
  }).returning()

  // Update idea count on underline
  await db
    .update(ebookUnderlines)
    .set({ ideaCount: (await db.select({ count: count() }).from(ebookIdeas).where(eq(ebookIdeas.underlineId, underlineId)))[0].count })
    .where(eq(ebookUnderlines.id, underlineId))

  return c.json({
    data: {
      ...idea,
      createdAt: idea.createdAt?.toISOString() ?? null,
    },
  }, 201)
})

export { app as ebooksRoutes }
