/**
 * Book Lists Routes - User-curated book collections
 *
 * Provides CRUD operations for book lists (similar to Douban's 豆列):
 * - Browse public lists
 * - Create/update/delete lists
 * - Add/remove books from lists
 * - Follow/unfollow lists
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { requireAuth, optionalAuth } from '../middleware/auth'
import { db } from '../db/client'
import { bookLists, bookListItems, bookListFollowers, users, ebooks, magazines } from '../db/schema'
import { eq, and, desc, sql, inArray, or, ilike } from 'drizzle-orm'

const app = new OpenAPIHono()

// ============================================
// Schemas
// ============================================

const BookListSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  bookCount: z.number(),
  followerCount: z.number(),
  isPublic: z.boolean(),
  isFeatured: z.boolean(),
  tags: z.string().nullable(),
  category: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: z.object({
    id: z.number(),
    username: z.string(),
    avatar: z.string().nullable(),
  }),
  isFollowing: z.boolean(),
  isOwner: z.boolean(),
})

const BookListItemSchema = z.object({
  id: z.number(),
  bookType: z.string(),
  bookId: z.number(),
  title: z.string(),
  author: z.string().nullable(),
  coverUrl: z.string().nullable(),
  note: z.string().nullable(),
  addedAt: z.string(),
})

const CreateBookListSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional().default(true),
  tags: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
})

const UpdateBookListSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  tags: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
})

const AddBookToListSchema = z.object({
  bookType: z.enum(['ebook', 'magazine']),
  bookId: z.number(),
  note: z.string().max(500).optional(),
})

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// ============================================
// Browse Public Lists
// ============================================

// GET /api/book-lists
const getBookListsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Book Lists'],
  summary: 'Browse public book lists',
  parameters: [
    {
      name: 'category',
      in: 'query',
      description: 'Filter by category',
      schema: { type: 'string' },
    },
    {
      name: 'search',
      in: 'query',
      description: 'Search by title or description',
      schema: { type: 'string' },
    },
    {
      name: 'featured',
      in: 'query',
      description: 'Only featured lists',
      schema: { type: 'boolean' },
    },
    {
      name: 'sort',
      in: 'query',
      description: 'Sort order',
      schema: { type: 'string', enum: ['popular', 'recent', 'books'], default: 'popular' },
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', default: 20 },
    },
    {
      name: 'offset',
      in: 'query',
      schema: { type: 'integer', default: 0 },
    },
  ],
  responses: {
    200: {
      description: 'List of book lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(BookListSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.use('/', optionalAuth)
app.openapi(getBookListsRoute, async (c) => {
  const currentUserId = c.get('userId') || 0
  const category = c.req.query('category')
  const search = c.req.query('search')
  const featured = c.req.query('featured') === 'true'
  const sort = c.req.query('sort') || 'popular'
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  // Build conditions
  const conditions = [eq(bookLists.isPublic, true)]

  if (category) {
    conditions.push(eq(bookLists.category, category))
  }

  if (featured) {
    conditions.push(eq(bookLists.isFeatured, true))
  }

  if (search) {
    conditions.push(
      or(
        ilike(bookLists.title, `%${search}%`),
        ilike(bookLists.description, `%${search}%`)
      )!
    )
  }

  // Determine sort order
  let orderBy
  switch (sort) {
    case 'recent':
      orderBy = desc(bookLists.createdAt)
      break
    case 'books':
      orderBy = desc(bookLists.bookCount)
      break
    case 'popular':
    default:
      orderBy = desc(bookLists.followerCount)
  }

  // Query lists
  const lists = await db
    .select({
      id: bookLists.id,
      userId: bookLists.userId,
      title: bookLists.title,
      description: bookLists.description,
      coverUrl: bookLists.coverUrl,
      bookCount: bookLists.bookCount,
      followerCount: bookLists.followerCount,
      isPublic: bookLists.isPublic,
      isFeatured: bookLists.isFeatured,
      tags: bookLists.tags,
      category: bookLists.category,
      createdAt: bookLists.createdAt,
      updatedAt: bookLists.updatedAt,
      creatorId: users.id,
      creatorUsername: users.username,
      creatorAvatar: users.avatar,
    })
    .from(bookLists)
    .innerJoin(users, eq(bookLists.userId, users.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit + 1)
    .offset(offset)

  const hasMore = lists.length > limit
  const result = lists.slice(0, limit)

  // Check which lists the user is following
  const listIds = result.map((l) => l.id)
  let followingSet = new Set<number>()

  if (currentUserId && listIds.length > 0) {
    const following = await db
      .select({ listId: bookListFollowers.listId })
      .from(bookListFollowers)
      .where(
        and(
          eq(bookListFollowers.userId, currentUserId),
          inArray(bookListFollowers.listId, listIds)
        )
      )
    followingSet = new Set(following.map((f) => f.listId))
  }

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookLists)
    .where(and(...conditions))

  return c.json({
    data: result.map((l) => ({
      id: l.id,
      userId: l.userId,
      title: l.title,
      description: l.description,
      coverUrl: l.coverUrl,
      bookCount: l.bookCount || 0,
      followerCount: l.followerCount || 0,
      isPublic: l.isPublic ?? true,
      isFeatured: l.isFeatured ?? false,
      tags: l.tags,
      category: l.category,
      createdAt: l.createdAt?.toISOString() || '',
      updatedAt: l.updatedAt?.toISOString() || '',
      creator: {
        id: l.creatorId,
        username: l.creatorUsername,
        avatar: l.creatorAvatar,
      },
      isFollowing: followingSet.has(l.id),
      isOwner: l.userId === currentUserId,
    })),
    total: Number(countResult?.count || 0),
    hasMore,
  }, 200)
})

// ============================================
// User's Own Lists
// ============================================

// GET /api/book-lists/my
const getMyListsRoute = createRoute({
  method: 'get',
  path: '/my',
  tags: ['Book Lists'],
  summary: 'Get current user\'s book lists',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'User\'s book lists',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(BookListSchema),
          }),
        },
      },
    },
  },
})

app.use('/my', requireAuth)
app.openapi(getMyListsRoute, async (c) => {
  const currentUserId = c.get('userId')

  const lists = await db
    .select({
      id: bookLists.id,
      userId: bookLists.userId,
      title: bookLists.title,
      description: bookLists.description,
      coverUrl: bookLists.coverUrl,
      bookCount: bookLists.bookCount,
      followerCount: bookLists.followerCount,
      isPublic: bookLists.isPublic,
      isFeatured: bookLists.isFeatured,
      tags: bookLists.tags,
      category: bookLists.category,
      createdAt: bookLists.createdAt,
      updatedAt: bookLists.updatedAt,
      creatorId: users.id,
      creatorUsername: users.username,
      creatorAvatar: users.avatar,
    })
    .from(bookLists)
    .innerJoin(users, eq(bookLists.userId, users.id))
    .where(eq(bookLists.userId, currentUserId))
    .orderBy(desc(bookLists.updatedAt))

  return c.json({
    data: lists.map((l) => ({
      id: l.id,
      userId: l.userId,
      title: l.title,
      description: l.description,
      coverUrl: l.coverUrl,
      bookCount: l.bookCount || 0,
      followerCount: l.followerCount || 0,
      isPublic: l.isPublic ?? true,
      isFeatured: l.isFeatured ?? false,
      tags: l.tags,
      category: l.category,
      createdAt: l.createdAt?.toISOString() || '',
      updatedAt: l.updatedAt?.toISOString() || '',
      creator: {
        id: l.creatorId,
        username: l.creatorUsername,
        avatar: l.creatorAvatar,
      },
      isFollowing: false,
      isOwner: true,
    })),
  }, 200)
})

// ============================================
// Get Single List
// ============================================

// GET /api/book-lists/:id
const getBookListRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Book Lists'],
  summary: 'Get book list details',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Book list details',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              list: BookListSchema,
              books: z.array(BookListItemSchema),
            }),
          }),
        },
      },
    },
    404: {
      description: 'List not found',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.use('/:id', optionalAuth)
app.openapi(getBookListRoute, async (c) => {
  const currentUserId = c.get('userId') || 0
  const listId = parseInt(c.req.param('id'))

  // Get list
  const [list] = await db
    .select({
      id: bookLists.id,
      userId: bookLists.userId,
      title: bookLists.title,
      description: bookLists.description,
      coverUrl: bookLists.coverUrl,
      bookCount: bookLists.bookCount,
      followerCount: bookLists.followerCount,
      isPublic: bookLists.isPublic,
      isFeatured: bookLists.isFeatured,
      tags: bookLists.tags,
      category: bookLists.category,
      createdAt: bookLists.createdAt,
      updatedAt: bookLists.updatedAt,
      creatorId: users.id,
      creatorUsername: users.username,
      creatorAvatar: users.avatar,
    })
    .from(bookLists)
    .innerJoin(users, eq(bookLists.userId, users.id))
    .where(eq(bookLists.id, listId))
    .limit(1)

  if (!list) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)
  }

  // Check access
  if (!list.isPublic && list.userId !== currentUserId) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)
  }

  // Check if following
  let isFollowing = false
  if (currentUserId) {
    const [follow] = await db
      .select()
      .from(bookListFollowers)
      .where(
        and(
          eq(bookListFollowers.userId, currentUserId),
          eq(bookListFollowers.listId, listId)
        )
      )
      .limit(1)
    isFollowing = Boolean(follow)
  }

  // Get books in list
  const items = await db
    .select({
      id: bookListItems.id,
      bookType: bookListItems.bookType,
      bookId: bookListItems.bookId,
      note: bookListItems.note,
      addedAt: bookListItems.addedAt,
    })
    .from(bookListItems)
    .where(eq(bookListItems.listId, listId))
    .orderBy(desc(bookListItems.addedAt))

  // Fetch book details
  const ebookIds = items.filter((i) => i.bookType === 'ebook').map((i) => i.bookId)
  const magazineIds = items.filter((i) => i.bookType === 'magazine').map((i) => i.bookId)

  let ebookDetails: Record<number, { title: string; author: string | null; coverUrl: string | null }> = {}
  let magazineDetails: Record<number, { title: string; author: string | null; coverUrl: string | null }> = {}

  if (ebookIds.length > 0) {
    const ebookData = await db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        author: ebooks.author,
        coverUrl: ebooks.coverUrl,
      })
      .from(ebooks)
      .where(inArray(ebooks.id, ebookIds))

    ebookDetails = Object.fromEntries(ebookData.map((e) => [e.id, e]))
  }

  if (magazineIds.length > 0) {
    const magazineData = await db
      .select({
        id: magazines.id,
        title: magazines.title,
        coverUrl: magazines.coverUrl,
      })
      .from(magazines)
      .where(inArray(magazines.id, magazineIds))

    magazineDetails = Object.fromEntries(
      magazineData.map((m) => [m.id, { ...m, author: null }])
    )
  }

  const books = items.map((item) => {
    const details =
      item.bookType === 'ebook'
        ? ebookDetails[item.bookId]
        : magazineDetails[item.bookId]

    return {
      id: item.id,
      bookType: item.bookType,
      bookId: item.bookId,
      title: details?.title || 'Unknown',
      author: details?.author || null,
      coverUrl: details?.coverUrl || null,
      note: item.note,
      addedAt: item.addedAt?.toISOString() || '',
    }
  })

  return c.json({
    data: {
      list: {
        id: list.id,
        userId: list.userId,
        title: list.title,
        description: list.description,
        coverUrl: list.coverUrl,
        bookCount: list.bookCount || 0,
        followerCount: list.followerCount || 0,
        isPublic: list.isPublic ?? true,
        isFeatured: list.isFeatured ?? false,
        tags: list.tags,
        category: list.category,
        createdAt: list.createdAt?.toISOString() || '',
        updatedAt: list.updatedAt?.toISOString() || '',
        creator: {
          id: list.creatorId,
          username: list.creatorUsername,
          avatar: list.creatorAvatar,
        },
        isFollowing,
        isOwner: list.userId === currentUserId,
      },
      books,
    },
  }, 200)
})

// ============================================
// Create List
// ============================================

// POST /api/book-lists
const createBookListRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Book Lists'],
  summary: 'Create a new book list',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateBookListSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'List created',
      content: {
        'application/json': {
          schema: z.object({
            data: BookListSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid input',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.openapi(createBookListRoute, async (c) => {
  const currentUserId = c.get('userId')
  const body = c.req.valid('json')

  // Create list
  const [newList] = await db
    .insert(bookLists)
    .values({
      userId: currentUserId,
      title: body.title,
      description: body.description || null,
      isPublic: body.isPublic ?? true,
      tags: body.tags || null,
      category: body.category || null,
    })
    .returning()

  // Get creator info
  const [creator] = await db
    .select({
      id: users.id,
      username: users.username,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.id, currentUserId))
    .limit(1)

  return c.json({
    data: {
      id: newList.id,
      userId: newList.userId,
      title: newList.title,
      description: newList.description,
      coverUrl: newList.coverUrl,
      bookCount: newList.bookCount || 0,
      followerCount: newList.followerCount || 0,
      isPublic: newList.isPublic ?? true,
      isFeatured: newList.isFeatured ?? false,
      tags: newList.tags,
      category: newList.category,
      createdAt: newList.createdAt?.toISOString() || '',
      updatedAt: newList.updatedAt?.toISOString() || '',
      creator: {
        id: creator.id,
        username: creator.username,
        avatar: creator.avatar,
      },
      isFollowing: false,
      isOwner: true,
    },
  }, 201)
})

// ============================================
// Update List
// ============================================

// PUT /api/book-lists/:id
const updateBookListRoute = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Book Lists'],
  summary: 'Update a book list',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateBookListSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'List updated',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({ success: z.boolean() }),
          }),
        },
      },
    },
    403: {
      description: 'Not authorized',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
    404: {
      description: 'List not found',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.use('/:id', requireAuth)
app.openapi(updateBookListRoute, async (c) => {
  const currentUserId = c.get('userId')
  const listId = parseInt(c.req.param('id'))
  const body = c.req.valid('json')

  // Check ownership
  const [list] = await db
    .select({ userId: bookLists.userId })
    .from(bookLists)
    .where(eq(bookLists.id, listId))
    .limit(1)

  if (!list) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)
  }

  if (list.userId !== currentUserId) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Not authorized' } }, 403)
  }

  // Update list
  const updateData: Record<string, any> = { updatedAt: new Date() }
  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description
  if (body.isPublic !== undefined) updateData.isPublic = body.isPublic
  if (body.tags !== undefined) updateData.tags = body.tags
  if (body.category !== undefined) updateData.category = body.category

  await db
    .update(bookLists)
    .set(updateData)
    .where(eq(bookLists.id, listId))

  return c.json({ data: { success: true as boolean } }, 200)
})

// ============================================
// Delete List
// ============================================

// DELETE /api/book-lists/:id
const deleteBookListRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Book Lists'],
  summary: 'Delete a book list',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'List deleted',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({ success: z.boolean() }),
          }),
        },
      },
    },
    403: {
      description: 'Not authorized',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
    404: {
      description: 'List not found',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.openapi(deleteBookListRoute, async (c) => {
  const currentUserId = c.get('userId')
  const listId = parseInt(c.req.param('id'))

  // Check ownership
  const [list] = await db
    .select({ userId: bookLists.userId })
    .from(bookLists)
    .where(eq(bookLists.id, listId))
    .limit(1)

  if (!list) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)
  }

  if (list.userId !== currentUserId) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Not authorized' } }, 403)
  }

  // Delete list (cascade will handle items and followers)
  await db.delete(bookLists).where(eq(bookLists.id, listId))

  return c.json({ data: { success: true as boolean } }, 200)
})

// ============================================
// Add Book to List
// ============================================

// POST /api/book-lists/:id/books
const addBookToListRoute = createRoute({
  method: 'post',
  path: '/{id}/books',
  tags: ['Book Lists'],
  summary: 'Add a book to a list',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: AddBookToListSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Book added to list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({ success: z.boolean() }),
          }),
        },
      },
    },
    400: {
      description: 'Book already in list',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
    403: {
      description: 'Not authorized',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
    404: {
      description: 'List or book not found',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.use('/:id/books', requireAuth)
app.openapi(addBookToListRoute, async (c) => {
  const currentUserId = c.get('userId')
  const listId = parseInt(c.req.param('id'))
  const body = c.req.valid('json')

  // Check ownership
  const [list] = await db
    .select({ userId: bookLists.userId })
    .from(bookLists)
    .where(eq(bookLists.id, listId))
    .limit(1)

  if (!list) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)
  }

  if (list.userId !== currentUserId) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Not authorized' } }, 403)
  }

  // Check if book exists
  let bookExists = false
  if (body.bookType === 'ebook') {
    const [book] = await db.select({ id: ebooks.id }).from(ebooks).where(eq(ebooks.id, body.bookId)).limit(1)
    bookExists = Boolean(book)
  } else {
    const [book] = await db.select({ id: magazines.id }).from(magazines).where(eq(magazines.id, body.bookId)).limit(1)
    bookExists = Boolean(book)
  }

  if (!bookExists) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Book not found' } }, 404)
  }

  // Check if already in list
  const [existing] = await db
    .select()
    .from(bookListItems)
    .where(
      and(
        eq(bookListItems.listId, listId),
        eq(bookListItems.bookType, body.bookType),
        eq(bookListItems.bookId, body.bookId)
      )
    )
    .limit(1)

  if (existing) {
    return c.json({ error: { code: 'DUPLICATE', message: 'Book already in list' } }, 400)
  }

  // Get next position
  const [maxPos] = await db
    .select({ maxPosition: sql<number>`coalesce(max(position), 0)` })
    .from(bookListItems)
    .where(eq(bookListItems.listId, listId))

  const nextPosition = (maxPos?.maxPosition || 0) + 1

  // Add book
  await db.insert(bookListItems).values({
    listId,
    bookType: body.bookType,
    bookId: body.bookId,
    note: body.note || null,
    position: nextPosition,
  })

  // Update book count
  await db
    .update(bookLists)
    .set({
      bookCount: sql`${bookLists.bookCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(bookLists.id, listId))

  return c.json({ data: { success: true as boolean } }, 201)
})

// ============================================
// Remove Book from List
// ============================================

// DELETE /api/book-lists/:id/books/:bookType/:bookId
const removeBookFromListRoute = createRoute({
  method: 'delete',
  path: '/{id}/books/{bookType}/{bookId}',
  tags: ['Book Lists'],
  summary: 'Remove a book from a list',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
    {
      name: 'bookType',
      in: 'path',
      required: true,
      schema: { type: 'string', enum: ['ebook', 'magazine'] },
    },
    {
      name: 'bookId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Book removed from list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({ success: z.boolean() }),
          }),
        },
      },
    },
    403: {
      description: 'Not authorized',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
    404: {
      description: 'List not found',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.openapi(removeBookFromListRoute, async (c) => {
  const currentUserId = c.get('userId')
  const listId = parseInt(c.req.param('id'))
  const bookType = c.req.param('bookType')
  const bookId = parseInt(c.req.param('bookId'))

  // Check ownership
  const [list] = await db
    .select({ userId: bookLists.userId })
    .from(bookLists)
    .where(eq(bookLists.id, listId))
    .limit(1)

  if (!list) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)
  }

  if (list.userId !== currentUserId) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Not authorized' } }, 403)
  }

  // Remove book
  const result = await db
    .delete(bookListItems)
    .where(
      and(
        eq(bookListItems.listId, listId),
        eq(bookListItems.bookType, bookType),
        eq(bookListItems.bookId, bookId)
      )
    )
    .returning()

  // Update book count if removed
  if (result.length > 0) {
    await db
      .update(bookLists)
      .set({
        bookCount: sql`GREATEST(${bookLists.bookCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(bookLists.id, listId))
  }

  return c.json({ data: { success: true as boolean } }, 200)
})

// ============================================
// Follow/Unfollow List
// ============================================

// POST /api/book-lists/:id/follow
const followListRoute = createRoute({
  method: 'post',
  path: '/{id}/follow',
  tags: ['Book Lists'],
  summary: 'Follow a book list',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Follow toggled',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              isFollowing: z.boolean(),
              followerCount: z.number(),
            }),
          }),
        },
      },
    },
    404: {
      description: 'List not found',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.use('/:id/follow', requireAuth)
app.openapi(followListRoute, async (c) => {
  const currentUserId = c.get('userId')
  const listId = parseInt(c.req.param('id'))

  // Check list exists and is public
  const [list] = await db
    .select({ userId: bookLists.userId, isPublic: bookLists.isPublic })
    .from(bookLists)
    .where(eq(bookLists.id, listId))
    .limit(1)

  if (!list) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)
  }

  if (!list.isPublic && list.userId !== currentUserId) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)
  }

  // Check if already following
  const [existing] = await db
    .select()
    .from(bookListFollowers)
    .where(
      and(
        eq(bookListFollowers.userId, currentUserId),
        eq(bookListFollowers.listId, listId)
      )
    )
    .limit(1)

  if (existing) {
    // Unfollow
    await db
      .delete(bookListFollowers)
      .where(
        and(
          eq(bookListFollowers.userId, currentUserId),
          eq(bookListFollowers.listId, listId)
        )
      )

    await db
      .update(bookLists)
      .set({ followerCount: sql`GREATEST(${bookLists.followerCount} - 1, 0)` })
      .where(eq(bookLists.id, listId))

    const [updated] = await db
      .select({ followerCount: bookLists.followerCount })
      .from(bookLists)
      .where(eq(bookLists.id, listId))

    return c.json({
      data: {
        isFollowing: false as boolean,
        followerCount: updated?.followerCount || 0,
      },
    }, 200)
  } else {
    // Follow
    await db.insert(bookListFollowers).values({
      userId: currentUserId,
      listId,
    })

    await db
      .update(bookLists)
      .set({ followerCount: sql`${bookLists.followerCount} + 1` })
      .where(eq(bookLists.id, listId))

    const [updated] = await db
      .select({ followerCount: bookLists.followerCount })
      .from(bookLists)
      .where(eq(bookLists.id, listId))

    return c.json({
      data: {
        isFollowing: true as boolean,
        followerCount: updated?.followerCount || 0,
      },
    }, 200)
  }
})

// ============================================
// Get List Followers
// ============================================

// GET /api/book-lists/:id/followers
const getListFollowersRoute = createRoute({
  method: 'get',
  path: '/{id}/followers',
  tags: ['Book Lists'],
  summary: 'Get followers of a book list',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', default: 20 },
    },
    {
      name: 'offset',
      in: 'query',
      schema: { type: 'integer', default: 0 },
    },
  ],
  responses: {
    200: {
      description: 'List followers',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(
              z.object({
                id: z.number(),
                username: z.string(),
                avatar: z.string().nullable(),
                followedAt: z.string(),
              })
            ),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
    404: {
      description: 'List not found',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.openapi(getListFollowersRoute, async (c) => {
  const listId = parseInt(c.req.param('id'))
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  // Check list exists
  const [list] = await db
    .select({ isPublic: bookLists.isPublic })
    .from(bookLists)
    .where(eq(bookLists.id, listId))
    .limit(1)

  if (!list || !list.isPublic) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)
  }

  // Get followers
  const followers = await db
    .select({
      id: users.id,
      username: users.username,
      avatar: users.avatar,
      followedAt: bookListFollowers.createdAt,
    })
    .from(bookListFollowers)
    .innerJoin(users, eq(bookListFollowers.userId, users.id))
    .where(eq(bookListFollowers.listId, listId))
    .orderBy(desc(bookListFollowers.createdAt))
    .limit(limit + 1)
    .offset(offset)

  const hasMore = followers.length > limit
  const result = followers.slice(0, limit)

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookListFollowers)
    .where(eq(bookListFollowers.listId, listId))

  return c.json({
    data: result.map((f) => ({
      id: f.id,
      username: f.username,
      avatar: f.avatar,
      followedAt: f.followedAt?.toISOString() || '',
    })),
    total: Number(countResult?.count || 0),
    hasMore,
  }, 200)
})

export default app
