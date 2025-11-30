import express from 'express'
import { getQueueStatus, pauseQueue, resumeQueue } from '../services/backgroundTaskQueue.js'
import { requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/tasks/status
 * Get background task queue status
 */
router.get('/status', (req, res) => {
  const status = getQueueStatus()
  res.json({
    success: true,
    data: {
      running: status.running,
      paused: status.paused,
      type: status.type,
      stats: {
        total: status.stats.total,
        processed: status.stats.processed,
        success: status.stats.success,
        failed: status.stats.failed,
        current: status.stats.current,
        startedAt: status.stats.startedAt,
        // Only include last 10 errors to avoid large responses
        recentErrors: status.stats.errors.slice(-10)
      },
      progress: status.stats.total > 0
        ? Math.round((status.stats.processed / status.stats.total) * 100)
        : 0
    }
  })
})

/**
 * POST /api/tasks/pause
 * Pause the background task queue (admin only)
 */
router.post('/pause', requireAdmin, (req, res) => {
  pauseQueue()
  res.json({
    success: true,
    message: 'Task queue paused'
  })
})

/**
 * POST /api/tasks/resume
 * Resume the background task queue (admin only)
 */
router.post('/resume', requireAdmin, (req, res) => {
  resumeQueue()
  res.json({
    success: true,
    message: 'Task queue resumed'
  })
})

export default router
