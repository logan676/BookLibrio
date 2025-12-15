/**
 * Admin Dashboard Routes
 *
 * Provides administrative endpoints with user token authentication for:
 * - Statistics overview
 * - User management
 * - Curated list (ranking) management
 * - Background job management
 * - System monitoring
 * - Content import
 */

import { OpenAPIHono } from '@hono/zod-openapi'
import { db } from '../db/client'
import { users, ebooks, magazines, curatedLists, curatedListItems } from '../db/schema'
import { eq, desc, count, sql } from 'drizzle-orm'
import { requireAdmin } from '../middleware/auth'
import { triggerJob, getJobStatus } from '../jobs'
import { readdirSync } from 'fs'
import { join, dirname } from 'path'

const app = new OpenAPIHono()

// All routes require admin authentication
app.use('*', requireAdmin)

// ============================================
// Statistics
// ============================================

// GET /api/admin-dashboard/stats
app.get('/stats', async (c) => {
  try {
    const [magazineStats] = await db
      .select({
        total: count(),
        preprocessed: count(magazines.preprocessed),
      })
      .from(magazines)

    const [ebookStats] = await db
      .select({ total: count() })
      .from(ebooks)

    const [userStats] = await db
      .select({ total: count() })
      .from(users)

    const [curatedListStats] = await db
      .select({ total: count() })
      .from(curatedLists)

    return c.json({
      magazines: {
        total: magazineStats?.total || 0,
        preprocessed: magazineStats?.preprocessed || 0,
      },
      ebooks: ebookStats?.total || 0,
      users: userStats?.total || 0,
      curatedLists: curatedListStats?.total || 0,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return c.json({ error: 'Failed to fetch stats' }, 500)
  }
})

// ============================================
// User Management
// ============================================

// GET /api/admin-dashboard/users
app.get('/users', async (c) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        is_admin: users.isAdmin,
        created_at: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))

    return c.json(allUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

// PUT /api/admin-dashboard/users/:id/admin
app.put('/users/:id/admin', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const { isAdmin } = await c.req.json()

    await db
      .update(users)
      .set({ isAdmin: isAdmin })
      .where(eq(users.id, id))

    return c.json({ success: true })
  } catch (error) {
    console.error('Error updating user:', error)
    return c.json({ error: 'Failed to update user' }, 500)
  }
})

// ============================================
// Curated Lists (External Rankings) Management
// ============================================

// GET /api/admin-dashboard/curated-lists
app.get('/curated-lists', async (c) => {
  try {
    const lists = await db
      .select({
        id: curatedLists.id,
        listType: curatedLists.listType,
        title: curatedLists.title,
        subtitle: curatedLists.subtitle,
        sourceName: curatedLists.sourceName,
        sourceLogoUrl: curatedLists.sourceLogoUrl,
        year: curatedLists.year,
        bookCount: curatedLists.bookCount,
        isActive: curatedLists.isActive,
        isFeatured: curatedLists.isFeatured,
        createdAt: curatedLists.createdAt,
        updatedAt: curatedLists.updatedAt,
      })
      .from(curatedLists)
      .orderBy(desc(curatedLists.updatedAt))

    return c.json(lists)
  } catch (error) {
    console.error('Error fetching curated lists:', error)
    return c.json({ error: 'Failed to fetch curated lists' }, 500)
  }
})

// GET /api/admin-dashboard/curated-lists/:id
app.get('/curated-lists/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))

    const [list] = await db
      .select()
      .from(curatedLists)
      .where(eq(curatedLists.id, id))
      .limit(1)

    if (!list) {
      return c.json({ error: 'List not found' }, 404)
    }

    const items = await db
      .select()
      .from(curatedListItems)
      .where(eq(curatedListItems.listId, id))
      .orderBy(curatedListItems.position)

    return c.json({ ...list, items })
  } catch (error) {
    console.error('Error fetching curated list:', error)
    return c.json({ error: 'Failed to fetch curated list' }, 500)
  }
})

// POST /api/admin-dashboard/curated-lists
app.post('/curated-lists', async (c) => {
  try {
    const data = await c.req.json()

    const [newList] = await db
      .insert(curatedLists)
      .values({
        listType: data.listType,
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        sourceName: data.sourceName,
        sourceUrl: data.sourceUrl,
        sourceLogoUrl: data.sourceLogoUrl,
        year: data.year,
        month: data.month,
        bookCount: 0,
        isActive: true,
        isFeatured: data.isFeatured || false,
      })
      .returning()

    return c.json(newList, 201)
  } catch (error) {
    console.error('Error creating curated list:', error)
    return c.json({ error: 'Failed to create curated list' }, 500)
  }
})

// PUT /api/admin-dashboard/curated-lists/:id
app.put('/curated-lists/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const data = await c.req.json()

    const [updated] = await db
      .update(curatedLists)
      .set({
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        sourceName: data.sourceName,
        sourceUrl: data.sourceUrl,
        sourceLogoUrl: data.sourceLogoUrl,
        year: data.year,
        month: data.month,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        updatedAt: new Date(),
      })
      .where(eq(curatedLists.id, id))
      .returning()

    return c.json(updated)
  } catch (error) {
    console.error('Error updating curated list:', error)
    return c.json({ error: 'Failed to update curated list' }, 500)
  }
})

// DELETE /api/admin-dashboard/curated-lists/:id
app.delete('/curated-lists/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))

    // Delete items first
    await db
      .delete(curatedListItems)
      .where(eq(curatedListItems.listId, id))

    // Delete list
    await db
      .delete(curatedLists)
      .where(eq(curatedLists.id, id))

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting curated list:', error)
    return c.json({ error: 'Failed to delete curated list' }, 500)
  }
})

// POST /api/admin-dashboard/curated-lists/:id/items
app.post('/curated-lists/:id/items', async (c) => {
  try {
    const listId = parseInt(c.req.param('id'))
    const data = await c.req.json()

    // Get current max position
    const [maxPos] = await db
      .select({ max: sql<number>`COALESCE(MAX(position), 0)` })
      .from(curatedListItems)
      .where(eq(curatedListItems.listId, listId))

    const [newItem] = await db
      .insert(curatedListItems)
      .values({
        listId,
        externalTitle: data.externalTitle,
        externalAuthor: data.externalAuthor,
        externalCoverUrl: data.externalCoverUrl,
        isbn: data.isbn,
        amazonUrl: data.amazonUrl,
        goodreadsUrl: data.goodreadsUrl,
        editorNote: data.editorNote,
        position: (maxPos?.max || 0) + 1,
      })
      .returning()

    // Update book count
    await db
      .update(curatedLists)
      .set({
        bookCount: sql`${curatedLists.bookCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(curatedLists.id, listId))

    return c.json(newItem, 201)
  } catch (error) {
    console.error('Error adding item to curated list:', error)
    return c.json({ error: 'Failed to add item' }, 500)
  }
})

// PUT /api/admin-dashboard/curated-lists/:id/items/:itemId
app.put('/curated-lists/:id/items/:itemId', async (c) => {
  try {
    const itemId = parseInt(c.req.param('itemId'))
    const data = await c.req.json()

    const [updated] = await db
      .update(curatedListItems)
      .set({
        externalTitle: data.externalTitle,
        externalAuthor: data.externalAuthor,
        externalCoverUrl: data.externalCoverUrl,
        isbn: data.isbn,
        amazonUrl: data.amazonUrl,
        goodreadsUrl: data.goodreadsUrl,
        editorNote: data.editorNote,
        position: data.position,
      })
      .where(eq(curatedListItems.id, itemId))
      .returning()

    return c.json(updated)
  } catch (error) {
    console.error('Error updating curated list item:', error)
    return c.json({ error: 'Failed to update item' }, 500)
  }
})

// DELETE /api/admin-dashboard/curated-lists/:id/items/:itemId
app.delete('/curated-lists/:id/items/:itemId', async (c) => {
  try {
    const listId = parseInt(c.req.param('id'))
    const itemId = parseInt(c.req.param('itemId'))

    await db
      .delete(curatedListItems)
      .where(eq(curatedListItems.id, itemId))

    // Update book count
    await db
      .update(curatedLists)
      .set({
        bookCount: sql`GREATEST(${curatedLists.bookCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(curatedLists.id, listId))

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting curated list item:', error)
    return c.json({ error: 'Failed to delete item' }, 500)
  }
})

// ============================================
// Background Jobs Management
// ============================================

// GET /api/admin-dashboard/jobs
app.get('/jobs', async (c) => {
  try {
    const status = getJobStatus()
    return c.json({ data: status })
  } catch (error) {
    console.error('Error fetching job status:', error)
    return c.json({ error: 'Failed to fetch job status' }, 500)
  }
})

// POST /api/admin-dashboard/jobs/:jobName/trigger
app.post('/jobs/:jobName/trigger', async (c) => {
  try {
    const jobName = c.req.param('jobName')
    const triggered = await triggerJob(jobName)

    if (!triggered) {
      return c.json({ error: `Unknown job: ${jobName}` }, 400)
    }

    return c.json({
      triggered: true,
      jobName,
      message: `Job ${jobName} has been triggered`,
    })
  } catch (error) {
    console.error('Error triggering job:', error)
    return c.json({ error: 'Failed to trigger job' }, 500)
  }
})

// ============================================
// System Information
// ============================================

// GET /api/admin-dashboard/system
app.get('/system', async (c) => {
  try {
    const memUsage = process.memoryUsage()

    return c.json({
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching system info:', error)
    return c.json({ error: 'Failed to fetch system info' }, 500)
  }
})

// ============================================
// Content Import (File Browser)
// ============================================

// GET /api/admin-dashboard/browse
app.get('/browse', async (c) => {
  try {
    const path = c.req.query('path') || '/'

    const folders: { name: string; path: string }[] = []
    const entries = readdirSync(path, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        folders.push({
          name: entry.name,
          path: join(path, entry.name),
        })
      }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name))

    const parentPath = path === '/' ? null : dirname(path)

    return c.json({
      currentPath: path,
      parentPath,
      folders,
    })
  } catch (error) {
    console.error('Error browsing folders:', error)
    return c.json({ error: 'Failed to browse folders' }, 500)
  }
})

// Import progress state (in-memory for simplicity)
let importProgress = {
  running: false,
  type: '',
  current: 0,
  total: 0,
  currentItem: '',
  errors: [] as string[],
}

// GET /api/admin-dashboard/import/progress
app.get('/import/progress', async (c) => {
  return c.json(importProgress)
})

// POST /api/admin-dashboard/import
app.post('/import', async (c) => {
  try {
    const { type, folderPath } = await c.req.json()

    if (importProgress.running) {
      return c.json({ error: 'Import already in progress' }, 400)
    }

    // Start import in background
    importProgress = {
      running: true,
      type,
      current: 0,
      total: 0,
      currentItem: 'Scanning folder...',
      errors: [],
    }

    // Note: Actual import logic would be here
    // For now, just simulate progress
    return c.json({ message: 'Import started', type, folderPath })
  } catch (error) {
    console.error('Error starting import:', error)
    return c.json({ error: 'Failed to start import' }, 500)
  }
})

export default app
