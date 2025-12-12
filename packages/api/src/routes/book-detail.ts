/**
 * Book Detail Routes - Unified detail endpoint for ebooks and magazines
 * Provides enhanced metadata, stats, reviews, and user bookshelf status
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import {
  ebooks,
  magazines,
  bookStats,
  bookReviews,
  userBookshelves,
  users
} from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { optionalAuth } from '../middleware/auth'

const app = new OpenAPIHono()

// Schemas
const BookMetadataSchema = z.object({
  id: z.number(),
  type: z.enum(['ebook', 'magazine']),
  title: z.string(),
  coverUrl: z.string().nullable(),
  author: z.string().nullable(),
  translator: z.string().nullable(),
  description: z.string().nullable(),
  wordCount: z.number().nullable(),
  pageCount: z.number().nullable(),
  publicationDate: z.string().nullable(),
  publisher: z.string().nullable(),
  isbn: z.string().nullable(),
  language: z.string().nullable(),
  fileType: z.string().nullable(),
  fileSize: z.number().nullable(),
  // Magazine specific
  issueNumber: z.string().nullable().optional(),
  issn: z.string().nullable().optional(),
  // External IDs
  doubanId: z.string().nullable().optional(),
  goodreadsId: z.string().nullable().optional(),
  createdAt: z.string().nullable(),
})

const BookStatsSchema = z.object({
  totalReaders: z.number(),
  currentReaders: z.number(),
  finishedReaders: z.number(),
  totalHighlights: z.number(),
  totalReviews: z.number(),
  totalNotes: z.number(),
  averageRating: z.number().nullable(),
  ratingCount: z.number(),
  recommendPercent: z.number().nullable(),
})

const ReviewUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  avatar: z.string().nullable(),
})

const ReviewSchema = z.object({
  id: z.number(),
  user: ReviewUserSchema,
  rating: z.number().nullable(),
  recommendType: z.string().nullable(),
  title: z.string().nullable(),
  content: z.string(),
  likesCount: z.number(),
  isFeatured: z.boolean(),
  readingProgress: z.number().nullable(),
  createdAt: z.string().nullable(),
})

const UserBookshelfStatusSchema = z.object({
  status: z.enum(['want_to_read', 'reading', 'finished', 'abandoned']).nullable(),
  progress: z.number().nullable(),
  currentPage: z.number().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  addedAt: z.string().nullable(),
})

const BookDetailResponseSchema = z.object({
  book: BookMetadataSchema,
  stats: BookStatsSchema,
  recentReviews: z.array(ReviewSchema),
  userStatus: UserBookshelfStatusSchema.nullable(),
})

// GET /api/book-detail/:type/:id - Get book detail with stats and reviews
const getBookDetailRoute = createRoute({
  method: 'get',
  path: '/:type/:id',
  tags: ['Book Detail'],
  summary: 'Get detailed book information with stats and reviews',
  description: 'Returns enhanced book metadata, community stats, recent reviews, and user bookshelf status (if authenticated)',
  request: {
    params: z.object({
      type: z.enum(['ebook', 'magazine']),
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      description: 'Book detail with stats and reviews',
      content: {
        'application/json': {
          schema: z.object({ data: BookDetailResponseSchema }),
        },
      },
    },
    404: {
      description: 'Book not found',
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

// Apply optional auth - allows both authenticated and anonymous access
app.use('*', optionalAuth)

app.openapi(getBookDetailRoute, async (c) => {
  const { type, id } = c.req.valid('param')
  const userId = c.get('userId') // Will be undefined if not authenticated

  // Fetch book based on type
  let book: any = null

  if (type === 'ebook') {
    const [result] = await db.select().from(ebooks).where(eq(ebooks.id, id)).limit(1)
    if (result) {
      book = {
        id: result.id,
        type: 'ebook' as const,
        title: result.title,
        coverUrl: result.coverUrl,
        author: result.author,
        translator: result.translator,
        description: result.description,
        wordCount: result.wordCount,
        pageCount: result.pageCount,
        publicationDate: result.publicationDate,
        publisher: result.publisher,
        isbn: result.isbn,
        language: result.language,
        fileType: result.fileType,
        fileSize: result.fileSize,
        doubanId: result.doubanId,
        goodreadsId: result.goodreadsId,
        createdAt: result.createdAt?.toISOString() ?? null,
      }
    }
  } else {
    const [result] = await db.select().from(magazines).where(eq(magazines.id, id)).limit(1)
    if (result) {
      book = {
        id: result.id,
        type: 'magazine' as const,
        title: result.title,
        coverUrl: result.coverUrl,
        author: null, // Magazines don't have authors
        translator: null,
        description: result.description,
        wordCount: null,
        pageCount: result.pageCount,
        publicationDate: result.publicationDate,
        publisher: null,
        isbn: null,
        language: result.language,
        fileType: 'pdf', // Magazines are typically PDF
        fileSize: result.fileSize,
        issueNumber: result.issueNumber,
        issn: result.issn,
        createdAt: result.createdAt?.toISOString() ?? null,
      }
    }
  }

  if (!book) {
    return c.json({
      error: { code: 'NOT_FOUND', message: `${type === 'ebook' ? 'Ebook' : 'Magazine'} not found` },
    }, 404)
  }

  // Fetch book stats (create default if not exists)
  let stats = await db
    .select()
    .from(bookStats)
    .where(and(eq(bookStats.bookType, type), eq(bookStats.bookId, id)))
    .limit(1)
    .then(rows => rows[0])

  // Default stats if none exist
  const statsResponse = {
    totalReaders: stats?.totalReaders ?? 0,
    currentReaders: stats?.currentReaders ?? 0,
    finishedReaders: stats?.finishedReaders ?? 0,
    totalHighlights: stats?.totalHighlights ?? 0,
    totalReviews: stats?.totalReviews ?? 0,
    totalNotes: stats?.totalNotes ?? 0,
    averageRating: stats?.averageRating ? parseFloat(stats.averageRating) : null,
    ratingCount: stats?.ratingCount ?? 0,
    recommendPercent: stats?.recommendPercent ? parseFloat(stats.recommendPercent) : null,
  }

  // Fetch recent reviews with user info
  const reviewsWithUsers = await db
    .select({
      review: bookReviews,
      user: {
        id: users.id,
        username: users.username,
        avatar: users.avatar,
      },
    })
    .from(bookReviews)
    .innerJoin(users, eq(bookReviews.userId, users.id))
    .where(
      and(
        eq(bookReviews.bookType, type),
        eq(bookReviews.bookId, id),
        eq(bookReviews.isHidden, false)
      )
    )
    .orderBy(desc(bookReviews.isFeatured), desc(bookReviews.createdAt))
    .limit(5)

  const recentReviews = reviewsWithUsers.map(({ review, user }) => ({
    id: review.id,
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    },
    rating: review.rating,
    recommendType: review.recommendType,
    title: review.title,
    content: review.content,
    likesCount: review.likesCount ?? 0,
    isFeatured: review.isFeatured ?? false,
    readingProgress: review.readingProgress ? parseFloat(review.readingProgress) : null,
    createdAt: review.createdAt?.toISOString() ?? null,
  }))

  // Fetch user's bookshelf status if authenticated
  let userStatus: any = null
  if (userId) {
    const [bookshelfEntry] = await db
      .select()
      .from(userBookshelves)
      .where(
        and(
          eq(userBookshelves.userId, userId),
          eq(userBookshelves.bookType, type),
          eq(userBookshelves.bookId, id)
        )
      )
      .limit(1)

    if (bookshelfEntry) {
      userStatus = {
        status: bookshelfEntry.status as any,
        progress: bookshelfEntry.progress ? parseFloat(bookshelfEntry.progress) : null,
        currentPage: bookshelfEntry.currentPage,
        startedAt: bookshelfEntry.startedAt?.toISOString() ?? null,
        finishedAt: bookshelfEntry.finishedAt?.toISOString() ?? null,
        addedAt: bookshelfEntry.addedAt?.toISOString() ?? null,
      }
    }
  }

  return c.json({
    data: {
      book,
      stats: statsResponse,
      recentReviews,
      userStatus,
    },
  })
})

// GET /api/book-detail/:type/:id/reviews - Get all reviews with pagination
const getBookReviewsRoute = createRoute({
  method: 'get',
  path: '/:type/:id/reviews',
  tags: ['Book Detail'],
  summary: 'Get paginated reviews for a book',
  request: {
    params: z.object({
      type: z.enum(['ebook', 'magazine']),
      id: z.coerce.number(),
    }),
    query: z.object({
      limit: z.coerce.number().default(20),
      offset: z.coerce.number().default(0),
      sort: z.enum(['newest', 'oldest', 'highest', 'lowest', 'helpful']).default('newest'),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of reviews',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ReviewSchema),
            total: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
  },
})

app.openapi(getBookReviewsRoute, async (c) => {
  const { type, id } = c.req.valid('param')
  const { limit, offset, sort } = c.req.valid('query')

  // Determine sort order
  let orderBy
  switch (sort) {
    case 'oldest':
      orderBy = bookReviews.createdAt
      break
    case 'highest':
      orderBy = desc(bookReviews.rating)
      break
    case 'lowest':
      orderBy = bookReviews.rating
      break
    case 'helpful':
      orderBy = desc(bookReviews.likesCount)
      break
    default: // newest
      orderBy = desc(bookReviews.createdAt)
  }

  const reviewsWithUsers = await db
    .select({
      review: bookReviews,
      user: {
        id: users.id,
        username: users.username,
        avatar: users.avatar,
      },
    })
    .from(bookReviews)
    .innerJoin(users, eq(bookReviews.userId, users.id))
    .where(
      and(
        eq(bookReviews.bookType, type),
        eq(bookReviews.bookId, id),
        eq(bookReviews.isHidden, false)
      )
    )
    .orderBy(orderBy)
    .limit(limit + 1) // Fetch one extra to determine hasMore
    .offset(offset)

  const hasMore = reviewsWithUsers.length > limit
  const reviews = reviewsWithUsers.slice(0, limit).map(({ review, user }) => ({
    id: review.id,
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    },
    rating: review.rating,
    recommendType: review.recommendType,
    title: review.title,
    content: review.content,
    likesCount: review.likesCount ?? 0,
    isFeatured: review.isFeatured ?? false,
    readingProgress: review.readingProgress ? parseFloat(review.readingProgress) : null,
    createdAt: review.createdAt?.toISOString() ?? null,
  }))

  // Get total count
  const [countResult] = await db
    .select({ count: db.$count(bookReviews) })
    .from(bookReviews)
    .where(
      and(
        eq(bookReviews.bookType, type),
        eq(bookReviews.bookId, id),
        eq(bookReviews.isHidden, false)
      )
    )

  return c.json({
    data: reviews,
    total: countResult?.count ?? 0,
    hasMore,
  })
})

export { app as bookDetailRoutes }
