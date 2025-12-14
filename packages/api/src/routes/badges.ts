/**
 * Badge Routes (requires authentication)
 * Handles badge queries and management
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { badgeService } from '../services/badge'

const app = new OpenAPIHono()

// Apply auth middleware to all routes
app.use('*', requireAuth)

// Schemas
const BadgeRequirementSchema = z.object({
  id: z.number(),
  description: z.string(),
  current: z.number(),
  target: z.number(),
})

const BadgeSchema = z.object({
  id: z.number(),
  category: z.string(),
  level: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  requirement: z.string().nullable(),
  iconUrl: z.string().nullable(),
  backgroundColor: z.string().nullable(),
  earnedCount: z.number(),
  // New fields for enhanced badge UI
  tier: z.string().nullable(), // gold/silver/bronze/iron
  rarity: z.string().nullable(), // legendary/epic/rare/common
  lore: z.string().nullable(), // Badge story/background text
  xpValue: z.number().nullable(), // XP points awarded
  requirements: z.array(BadgeRequirementSchema).nullable(), // Multiple requirements
})

const EarnedBadgeSchema = BadgeSchema.extend({
  earnedAt: z.string(),
  startDate: z.string().nullable(), // When user started working on this badge
})

const BadgeProgressSchema = z.object({
  badge: BadgeSchema,
  progress: z.object({
    current: z.number(),
    target: z.number(),
    percentage: z.number(),
    remaining: z.string(),
  }),
})

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// GET /api/user/badges - Get user's badges
const getUserBadgesRoute = createRoute({
  method: 'get',
  path: '/badges',
  tags: ['Badges'],
  summary: "Get current user's badges",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'User badges',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              earned: z.array(EarnedBadgeSchema),
              inProgress: z.array(BadgeProgressSchema),
              categories: z.record(
                z.object({
                  earned: z.number(),
                  total: z.number(),
                })
              ),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(getUserBadgesRoute, async (c) => {
  const userId = c.get('userId')

  try {
    const result = await badgeService.getUserBadges(userId)

    return c.json({
      data: {
        earned: result.earned.map((b) => ({
          ...b,
          earnedAt: b.earnedAt.toISOString(),
        })),
        inProgress: result.inProgress,
        categories: result.categories,
      },
    })
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'BADGE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get badges',
        },
      },
      400
    )
  }
})

// GET /api/badges - Get all available badges
const getAllBadgesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Badges'],
  summary: 'Get all available badges grouped by category',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'All badges',
      content: {
        'application/json': {
          schema: z.object({
            data: z.record(z.array(BadgeSchema)),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(getAllBadgesRoute, async (c) => {
  const result = await badgeService.getAllBadges()

  return c.json({
    data: result,
  })
})

// GET /api/badges/:id - Get badge details
const getBadgeRoute = createRoute({
  method: 'get',
  path: '/{badgeId}',
  tags: ['Badges'],
  summary: 'Get badge details',
  security: [{ Bearer: [] }],
  parameters: [
    {
      name: 'badgeId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
  responses: {
    200: {
      description: 'Badge details',
      content: {
        'application/json': {
          schema: z.object({
            data: BadgeSchema.nullable(),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(getBadgeRoute, async (c) => {
  const badgeId = parseInt(c.req.param('badgeId'))
  const badge = await badgeService.getBadge(badgeId)

  return c.json({ data: badge })
})

// POST /api/badges/check - Check and award badges
const checkBadgesRoute = createRoute({
  method: 'post',
  path: '/check',
  tags: ['Badges'],
  summary: 'Check and award new badges for current user',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Newly earned badges',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              newBadges: z.array(EarnedBadgeSchema),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(checkBadgesRoute, async (c) => {
  const userId = c.get('userId')

  const newBadges = await badgeService.checkAndAwardBadges(userId)

  return c.json({
    data: {
      newBadges: newBadges.map((b) => ({
        ...b,
        earnedAt: b.earnedAt.toISOString(),
      })),
    },
  })
})

// POST /api/badges/welcome - Award welcome badge to current user
const awardWelcomeBadgeRoute = createRoute({
  method: 'post',
  path: '/welcome',
  tags: ['Badges'],
  summary: 'Award welcome badge to current user (if not already earned)',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Welcome badge awarded',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              badge: EarnedBadgeSchema.nullable(),
              message: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(awardWelcomeBadgeRoute, async (c) => {
  const userId = c.get('userId')

  const badge = await badgeService.awardWelcomeBadge(userId)

  return c.json({
    data: {
      badge: badge
        ? {
            ...badge,
            earnedAt: badge.earnedAt.toISOString(),
          }
        : null,
      message: badge ? 'Welcome badge awarded!' : 'Welcome badge already earned or not available',
    },
  })
})

// POST /api/badges/init - Initialize default badges (admin only)
const initBadgesRoute = createRoute({
  method: 'post',
  path: '/init',
  tags: ['Badges'],
  summary: 'Initialize default badges (admin only)',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Badges initialized',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              message: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(initBadgesRoute, async (c) => {
  // TODO: Add admin check
  await badgeService.initializeDefaultBadges()

  return c.json({
    data: { message: 'Badges initialized successfully' },
  })
})

export default app
