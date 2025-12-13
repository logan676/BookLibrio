/**
 * Rankings API Routes
 *
 * Provides endpoints for accessing pre-computed book rankings.
 * Rankings are computed by background jobs and cached in memory.
 */

import { Hono } from 'hono'
import {
  getRanking,
  getAllRankings,
  needsRefresh,
  computeBookRankings,
  RankingType,
} from '../jobs/computeBookRankings'

const app = new Hono()

// Valid ranking types
const VALID_RANKING_TYPES: RankingType[] = [
  'trending',
  'top_rated',
  'most_read',
  'new_releases',
  'popular_this_week',
  'hidden_gems',
]

/**
 * GET /rankings
 * Get all available rankings (summary)
 */
app.get('/', async (c) => {
  const rankings = getAllRankings()

  const summary = VALID_RANKING_TYPES.map(type => {
    const ranking = rankings.get(type)
    return {
      type,
      available: !!ranking,
      bookCount: ranking?.books.length || 0,
      computedAt: ranking?.computedAt || null,
      nextUpdate: ranking?.nextUpdate || null,
    }
  })

  return c.json({
    data: summary,
    availableTypes: VALID_RANKING_TYPES,
  })
})

/**
 * GET /rankings/:type
 * Get a specific ranking list
 */
app.get('/:type', async (c) => {
  const type = c.req.param('type') as RankingType
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')

  // Validate ranking type
  if (!VALID_RANKING_TYPES.includes(type)) {
    return c.json(
      {
        error: 'Invalid ranking type',
        validTypes: VALID_RANKING_TYPES,
      },
      400
    )
  }

  // Check if we need to compute rankings first
  if (needsRefresh(type)) {
    // Trigger async computation but don't wait (first request gets stale/empty data)
    computeBookRankings().catch(err => {
      console.error('Background rankings computation failed:', err)
    })
  }

  const ranking = getRanking(type)

  if (!ranking) {
    return c.json({
      data: [],
      type,
      total: 0,
      computedAt: null,
      message: 'Rankings not yet computed. Please try again shortly.',
    })
  }

  // Apply pagination
  const paginatedBooks = ranking.books.slice(offset, offset + limit)

  return c.json({
    data: paginatedBooks,
    type,
    total: ranking.books.length,
    limit,
    offset,
    computedAt: ranking.computedAt,
    nextUpdate: ranking.nextUpdate,
  })
})

/**
 * GET /rankings/:type/top
 * Get top N books from a ranking (convenience endpoint)
 */
app.get('/:type/top', async (c) => {
  const type = c.req.param('type') as RankingType
  const count = Math.min(parseInt(c.req.query('count') || '10'), 50)

  if (!VALID_RANKING_TYPES.includes(type)) {
    return c.json({ error: 'Invalid ranking type' }, 400)
  }

  const ranking = getRanking(type)

  if (!ranking) {
    return c.json({
      data: [],
      type,
      message: 'Rankings not yet computed',
    })
  }

  return c.json({
    data: ranking.books.slice(0, count),
    type,
    computedAt: ranking.computedAt,
  })
})

export default app
