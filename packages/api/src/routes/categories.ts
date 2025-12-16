/**
 * Categories Routes - Enhanced category browsing API
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { db } from '../db/client'
import { ebookCategories, bookCategories, ebooks, magazines } from '../db/schema'
import { desc, eq, and, isNull, count, sql, inArray, asc } from 'drizzle-orm'
import { requireAuth, requireAdmin } from '../middleware/auth'

const app = new OpenAPIHono()

// ============================================
// Schemas
// ============================================

const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string().nullable(),
  nameEn: z.string().nullable(),
  description: z.string().nullable(),
  slug: z.string().nullable(),
  parentId: z.number().nullable(),
  level: z.number(),
  icon: z.string().nullable(),
  iconUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  themeColor: z.string().nullable(),
  sortOrder: z.number(),
  bookTypes: z.string().nullable(),
  tags: z.string().nullable(), // Comma-separated tags: 'fiction', 'nonfiction', 'featured', etc.
  ebookCount: z.number(),
  magazineCount: z.number(),
  isActive: z.boolean(),
  createdAt: z.string().nullable(),
})

const CategoryWithChildrenSchema = CategorySchema.extend({
  children: z.array(CategorySchema).optional(),
})

const CategoryListResponseSchema = z.object({
  data: z.array(CategoryWithChildrenSchema),
  total: z.number(),
})

const CategoryDetailResponseSchema = z.object({
  data: CategoryWithChildrenSchema,
})

const BookItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string().nullable(),
  coverUrl: z.string().nullable(),
  description: z.string().nullable(),
  paymentType: z.string().nullable(),
  externalRating: z.number().nullable(),
})

const CategoryBooksResponseSchema = z.object({
  data: z.array(BookItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

// ============================================
// Helper Functions
// ============================================

function formatCategory(cat: typeof ebookCategories.$inferSelect) {
  return {
    ...cat,
    level: cat.level ?? 1,
    sortOrder: cat.sortOrder ?? 0,
    ebookCount: cat.ebookCount ?? 0,
    magazineCount: cat.magazineCount ?? 0,
    isActive: cat.isActive ?? true,
    createdAt: cat.createdAt?.toISOString() ?? null,
  }
}

// ============================================
// GET /api/categories - List all categories
// ============================================

const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/categories',
  tags: ['Categories'],
  summary: 'List all categories with hierarchy',
  request: {
    query: z.object({
      bookType: z.enum(['ebook', 'magazine', 'all']).optional().default('all'),
      includeInactive: z.string().optional().transform(v => v === 'true'),
      parentId: z.string().optional().transform(v => v ? parseInt(v) : undefined),
      flat: z.string().optional().transform(v => v === 'true'), // Return flat list without hierarchy
    }),
  },
  responses: {
    200: {
      description: 'List of categories',
      content: {
        'application/json': {
          schema: CategoryListResponseSchema,
        },
      },
    },
  },
})

app.openapi(listCategoriesRoute, async (c) => {
  const { bookType, includeInactive, parentId, flat } = c.req.valid('query')

  // Build query conditions
  const conditions = []

  if (!includeInactive) {
    conditions.push(eq(ebookCategories.isActive, true))
  }

  if (parentId !== undefined) {
    conditions.push(eq(ebookCategories.parentId, parentId))
  }

  // Get categories
  let allCategories = await db
    .select()
    .from(ebookCategories)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(ebookCategories.sortOrder), asc(ebookCategories.id))

  // Filter by book type if specified
  if (bookType !== 'all') {
    allCategories = allCategories.filter(cat => {
      const types = cat.bookTypes?.split(',') ?? []
      return types.includes(bookType)
    })
  }

  // If flat list requested, return without hierarchy
  if (flat || parentId !== undefined) {
    return c.json({
      data: allCategories.map(formatCategory),
      total: allCategories.length,
    })
  }

  // Build hierarchy: organize into parent-children structure
  const topLevel = allCategories.filter(cat => cat.parentId === null)
  const categoriesWithChildren = topLevel.map(parent => {
    const children = allCategories.filter(cat => cat.parentId === parent.id)
    return {
      ...formatCategory(parent),
      children: children.map(formatCategory),
    }
  })

  return c.json({
    data: categoriesWithChildren,
    total: allCategories.length,
  })
})

// ============================================
// GET /api/categories/:id - Get category details
// ============================================

const getCategoryRoute = createRoute({
  method: 'get',
  path: '/categories/{id}',
  tags: ['Categories'],
  summary: 'Get category by ID with children',
  request: {
    params: z.object({
      id: z.string().transform(v => parseInt(v)),
    }),
  },
  responses: {
    200: {
      description: 'Category details',
      content: {
        'application/json': {
          schema: CategoryDetailResponseSchema,
        },
      },
    },
    404: {
      description: 'Category not found',
    },
  },
})

app.openapi(getCategoryRoute, async (c) => {
  const { id } = c.req.valid('params')

  const [category] = await db
    .select()
    .from(ebookCategories)
    .where(eq(ebookCategories.id, id))
    .limit(1)

  if (!category) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404)
  }

  // Get children
  const children = await db
    .select()
    .from(ebookCategories)
    .where(eq(ebookCategories.parentId, id))
    .orderBy(asc(ebookCategories.sortOrder), asc(ebookCategories.id))

  return c.json({
    data: {
      ...formatCategory(category),
      children: children.map(formatCategory),
    },
  })
})

// ============================================
// GET /api/categories/:id/books - Get books in category
// ============================================

const getCategoryBooksRoute = createRoute({
  method: 'get',
  path: '/categories/{id}/books',
  tags: ['Categories'],
  summary: 'Get books in a category (paginated)',
  request: {
    params: z.object({
      id: z.string().transform(v => parseInt(v)),
    }),
    query: z.object({
      bookType: z.enum(['ebook', 'magazine']).optional().default('ebook'),
      page: z.string().optional().transform(v => Math.max(1, parseInt(v || '1'))),
      limit: z.string().optional().transform(v => Math.min(50, Math.max(1, parseInt(v || '20')))),
      sort: z.enum(['newest', 'popular', 'rating']).optional().default('newest'),
      includeChildren: z.string().optional().transform(v => v === 'true'), // Include books from child categories
    }),
  },
  responses: {
    200: {
      description: 'Books in category',
      content: {
        'application/json': {
          schema: CategoryBooksResponseSchema,
        },
      },
    },
    404: {
      description: 'Category not found',
    },
  },
})

app.openapi(getCategoryBooksRoute, async (c) => {
  const { id } = c.req.valid('params')
  const { bookType, page, limit, sort, includeChildren } = c.req.valid('query')

  // Verify category exists
  const [category] = await db
    .select()
    .from(ebookCategories)
    .where(eq(ebookCategories.id, id))
    .limit(1)

  if (!category) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404)
  }

  // Get category IDs to search (include children if requested)
  let categoryIds = [id]
  if (includeChildren) {
    const children = await db
      .select({ id: ebookCategories.id })
      .from(ebookCategories)
      .where(eq(ebookCategories.parentId, id))
    categoryIds = [...categoryIds, ...children.map(c => c.id)]
  }

  const offset = (page - 1) * limit

  if (bookType === 'ebook') {
    // Get ebooks via junction table or direct categoryId
    // First try junction table
    const bookIdsFromJunction = await db
      .select({ bookId: bookCategories.bookId })
      .from(bookCategories)
      .where(
        and(
          eq(bookCategories.bookType, 'ebook'),
          inArray(bookCategories.categoryId, categoryIds)
        )
      )

    const junctionBookIds = bookIdsFromJunction.map(b => b.bookId)

    // Also get books with direct categoryId (legacy support)
    const directCategoryBooks = await db
      .select({ id: ebooks.id })
      .from(ebooks)
      .where(inArray(ebooks.categoryId, categoryIds))

    const directBookIds = directCategoryBooks.map(b => b.id)

    // Combine unique IDs
    const allBookIds = [...new Set([...junctionBookIds, ...directBookIds])]

    if (allBookIds.length === 0) {
      return c.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      })
    }

    // Build sort clause
    let orderBy
    switch (sort) {
      case 'popular':
        orderBy = desc(ebooks.viewCount)
        break
      case 'rating':
        orderBy = desc(ebooks.externalRating)
        break
      case 'newest':
      default:
        orderBy = desc(ebooks.createdAt)
    }

    // Get books
    const booksData = await db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        author: ebooks.author,
        coverUrl: ebooks.coverUrl,
        description: ebooks.description,
        paymentType: ebooks.paymentType,
        externalRating: ebooks.externalRating,
      })
      .from(ebooks)
      .where(inArray(ebooks.id, allBookIds))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    return c.json({
      data: booksData.map(b => ({
        ...b,
        externalRating: b.externalRating ? parseFloat(b.externalRating) : null,
      })),
      pagination: {
        page,
        limit,
        total: allBookIds.length,
        totalPages: Math.ceil(allBookIds.length / limit),
      },
    })
  } else {
    // Get magazines via junction table
    const bookIdsFromJunction = await db
      .select({ bookId: bookCategories.bookId })
      .from(bookCategories)
      .where(
        and(
          eq(bookCategories.bookType, 'magazine'),
          inArray(bookCategories.categoryId, categoryIds)
        )
      )

    const magazineIds = bookIdsFromJunction.map(b => b.bookId)

    if (magazineIds.length === 0) {
      return c.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      })
    }

    // Get magazines
    const magazinesData = await db
      .select({
        id: magazines.id,
        title: magazines.title,
        coverUrl: magazines.coverUrl,
        description: magazines.description,
      })
      .from(magazines)
      .where(inArray(magazines.id, magazineIds))
      .orderBy(desc(magazines.createdAt))
      .limit(limit)
      .offset(offset)

    return c.json({
      data: magazinesData.map(m => ({
        id: m.id,
        title: m.title,
        author: null,
        coverUrl: m.coverUrl,
        description: m.description,
        paymentType: null,
        externalRating: null,
      })),
      pagination: {
        page,
        limit,
        total: magazineIds.length,
        totalPages: Math.ceil(magazineIds.length / limit),
      },
    })
  }
})

// ============================================
// GET /api/ebook-categories - Legacy endpoint
// ============================================

const listEbookCategoriesRoute = createRoute({
  method: 'get',
  path: '/ebook-categories',
  tags: ['Categories'],
  summary: 'List all ebook categories (legacy)',
  responses: {
    200: {
      description: 'List of ebook categories',
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

app.openapi(listEbookCategoriesRoute, async (c) => {
  const categories = await db
    .select()
    .from(ebookCategories)
    .where(eq(ebookCategories.isActive, true))
    .orderBy(asc(ebookCategories.sortOrder), desc(ebookCategories.id))

  return c.json({
    data: categories.map(formatCategory),
  })
})

// ============================================
// Admin Routes - Category Management
// ============================================

// POST /api/categories - Create category (admin)
app.post('/categories', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json()
  const { name, displayName, nameEn, description, slug, parentId, level, icon, coverUrl, themeColor, sortOrder, bookTypes } = body

  if (!name) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Name is required' } }, 400)
  }

  const [category] = await db.insert(ebookCategories).values({
    name,
    displayName: displayName || name,
    nameEn,
    description,
    slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
    parentId: parentId || null,
    level: level || (parentId ? 2 : 1),
    icon,
    coverUrl,
    themeColor,
    sortOrder: sortOrder || 0,
    bookTypes: bookTypes || 'ebook,magazine',
    isActive: true,
  }).returning()

  return c.json({ data: formatCategory(category) }, 201)
})

// PUT /api/categories/:id - Update category (admin)
app.put('/categories/:id', requireAuth, requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()

  if (isNaN(id)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid category ID' } }, 400)
  }

  const updateData: Partial<typeof ebookCategories.$inferInsert> = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.displayName !== undefined) updateData.displayName = body.displayName
  if (body.nameEn !== undefined) updateData.nameEn = body.nameEn
  if (body.description !== undefined) updateData.description = body.description
  if (body.slug !== undefined) updateData.slug = body.slug
  if (body.parentId !== undefined) updateData.parentId = body.parentId
  if (body.level !== undefined) updateData.level = body.level
  if (body.icon !== undefined) updateData.icon = body.icon
  if (body.coverUrl !== undefined) updateData.coverUrl = body.coverUrl
  if (body.themeColor !== undefined) updateData.themeColor = body.themeColor
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder
  if (body.bookTypes !== undefined) updateData.bookTypes = body.bookTypes
  if (body.isActive !== undefined) updateData.isActive = body.isActive

  const [category] = await db
    .update(ebookCategories)
    .set(updateData)
    .where(eq(ebookCategories.id, id))
    .returning()

  if (!category) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404)
  }

  return c.json({ data: formatCategory(category) })
})

// DELETE /api/categories/:id - Delete category (admin)
app.delete('/categories/:id', requireAuth, requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid category ID' } }, 400)
  }

  // Check for child categories
  const [child] = await db
    .select({ id: ebookCategories.id })
    .from(ebookCategories)
    .where(eq(ebookCategories.parentId, id))
    .limit(1)

  if (child) {
    return c.json({
      error: {
        code: 'HAS_CHILDREN',
        message: 'Cannot delete category with child categories. Delete children first.'
      }
    }, 400)
  }

  // Delete book-category associations
  await db.delete(bookCategories).where(eq(bookCategories.categoryId, id))

  // Delete category
  const [deleted] = await db
    .delete(ebookCategories)
    .where(eq(ebookCategories.id, id))
    .returning()

  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404)
  }

  return c.json({ success: true })
})

// ============================================
// Book-Category Association Routes
// ============================================

// POST /api/books/:bookId/categories - Assign categories to a book
app.post('/books/:bookId/categories', requireAuth, requireAdmin, async (c) => {
  const bookId = parseInt(c.req.param('bookId'))
  const body = await c.req.json()
  const { bookType, categoryIds, primaryCategoryId } = body

  if (isNaN(bookId)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid book ID' } }, 400)
  }

  if (!bookType || !['ebook', 'magazine'].includes(bookType)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'bookType must be "ebook" or "magazine"' } }, 400)
  }

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'categoryIds must be a non-empty array' } }, 400)
  }

  // Remove existing associations
  await db.delete(bookCategories).where(
    and(
      eq(bookCategories.bookId, bookId),
      eq(bookCategories.bookType, bookType)
    )
  )

  // Insert new associations
  const associations = categoryIds.map((catId: number) => ({
    bookId,
    bookType,
    categoryId: catId,
    isPrimary: catId === primaryCategoryId,
  }))

  await db.insert(bookCategories).values(associations)

  // Update ebook's categoryId if it's an ebook (for legacy support)
  if (bookType === 'ebook' && primaryCategoryId) {
    await db.update(ebooks).set({ categoryId: primaryCategoryId }).where(eq(ebooks.id, bookId))
  }

  return c.json({
    success: true,
    data: { bookId, bookType, categoryIds, primaryCategoryId }
  })
})

// GET /api/books/:bookId/categories - Get categories for a book
app.get('/books/:bookId/categories', async (c) => {
  const bookId = parseInt(c.req.param('bookId'))
  const bookType = c.req.query('bookType') || 'ebook'

  if (isNaN(bookId)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid book ID' } }, 400)
  }

  const associations = await db
    .select({
      categoryId: bookCategories.categoryId,
      isPrimary: bookCategories.isPrimary,
      category: ebookCategories,
    })
    .from(bookCategories)
    .innerJoin(ebookCategories, eq(bookCategories.categoryId, ebookCategories.id))
    .where(
      and(
        eq(bookCategories.bookId, bookId),
        eq(bookCategories.bookType, bookType)
      )
    )

  return c.json({
    data: associations.map(a => ({
      ...formatCategory(a.category),
      isPrimary: a.isPrimary,
    })),
  })
})

export default app
