/**
 * Admin Routes - System Management
 *
 * Provides administrative endpoints for:
 * - Manual job triggering
 * - Job status monitoring
 * - System health checks
 *
 * Protected by admin authentication (requires ADMIN_API_KEY env var)
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { triggerJob, getJobStatus } from '../jobs'

const app = new OpenAPIHono()

// Simple admin key middleware
app.use('*', async (c, next) => {
  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey) {
    return c.json({ error: { code: 'DISABLED', message: 'Admin API not configured' } }, 503)
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid admin key' } }, 401)
  }

  await next()
})

// ============================================
// Schemas
// ============================================

const JobStatusSchema = z.object({
  running: z.boolean(),
  lastRun: z.string().optional(),
})

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// ============================================
// Job Management Routes
// ============================================

// GET /api/admin/jobs
const getJobsStatusRoute = createRoute({
  method: 'get',
  path: '/jobs',
  tags: ['Admin'],
  summary: 'Get status of all background jobs',
  security: [{ AdminKey: [] }],
  responses: {
    200: {
      description: 'Job statuses',
      content: {
        'application/json': {
          schema: z.object({
            data: z.record(z.string(), JobStatusSchema),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.openapi(getJobsStatusRoute, async (c) => {
  const status = getJobStatus()
  return c.json({ data: status }, 200)
})

// POST /api/admin/jobs/:jobName/trigger
const triggerJobRoute = createRoute({
  method: 'post',
  path: '/jobs/{jobName}/trigger',
  tags: ['Admin'],
  summary: 'Manually trigger a background job',
  security: [{ AdminKey: [] }],
  parameters: [
    {
      name: 'jobName',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        enum: [
          'refresh_popular_highlights',
          'aggregate_book_stats',
          'enrich_book_metadata',
          'compute_related_books',
          'cleanup_expired_ai_cache',
        ],
      },
      description: 'Name of the job to trigger',
    },
  ],
  responses: {
    200: {
      description: 'Job triggered',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              triggered: z.boolean(),
              jobName: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
    400: {
      description: 'Unknown job',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.openapi(triggerJobRoute, async (c) => {
  const jobName = c.req.param('jobName')

  const triggered = await triggerJob(jobName)

  if (!triggered) {
    return c.json({
      error: { code: 'UNKNOWN_JOB', message: `Unknown job: ${jobName}` },
    }, 400)
  }

  return c.json({
    data: {
      triggered: true as boolean,
      jobName,
      message: `Job ${jobName} has been triggered`,
    },
  }, 200)
})

// GET /api/admin/system
const getSystemInfoRoute = createRoute({
  method: 'get',
  path: '/system',
  tags: ['Admin'],
  summary: 'Get system information',
  security: [{ AdminKey: [] }],
  responses: {
    200: {
      description: 'System information',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              nodeVersion: z.string(),
              platform: z.string(),
              uptime: z.number(),
              memory: z.object({
                heapUsed: z.number(),
                heapTotal: z.number(),
                external: z.number(),
              }),
              environment: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': { schema: ErrorSchema },
      },
    },
  },
})

app.openapi(getSystemInfoRoute, async (c) => {
  const memUsage = process.memoryUsage()

  return c.json({
    data: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
      environment: process.env.NODE_ENV || 'development',
    },
  }, 200)
})

export default app
