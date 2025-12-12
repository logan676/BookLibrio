/**
 * Background Jobs Scheduler
 *
 * Manages periodic tasks for data aggregation and maintenance:
 * - Popular highlights refresh (hourly)
 * - Book stats aggregation (hourly)
 * - Metadata enrichment (daily)
 * - Related books computation (weekly)
 * - AI cache cleanup (daily)
 *
 * Uses simple interval-based scheduling suitable for single-instance deployment.
 * For multi-instance deployments, consider using a distributed job queue like BullMQ.
 */

import { log } from '../utils/logger'
const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }
import { refreshPopularHighlights } from './refreshPopularHighlights'
import { aggregateBookStats } from './aggregateBookStats'
import { enrichBookMetadata } from './enrichBookMetadata'
import { computeRelatedBooks } from './computeRelatedBooks'
import { cleanupExpiredAiCache } from './cleanupExpiredAiCache'

// Timing constants (in milliseconds)
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

// Track running jobs to prevent overlap
const runningJobs = new Set<string>()

// Track interval IDs for cleanup
const intervals: NodeJS.Timeout[] = []

/**
 * Run a job with overlap prevention and error handling
 */
async function runJob(name: string, job: () => Promise<void>): Promise<void> {
  if (runningJobs.has(name)) {
    logger.warn(`Job ${name} is already running, skipping`)
    return
  }

  runningJobs.add(name)
  const startTime = Date.now()

  try {
    logger.info(`Starting job: ${name}`)
    await job()
    const duration = Date.now() - startTime
    logger.info(`Completed job: ${name} (${duration}ms)`)
  } catch (error) {
    logger.error(`Job ${name} failed:`, error)
  } finally {
    runningJobs.delete(name)
  }
}

/**
 * Schedule a job to run at regular intervals
 */
function scheduleJob(name: string, job: () => Promise<void>, intervalMs: number, runImmediately = false): void {
  if (runImmediately) {
    // Run after a short delay to allow server startup
    setTimeout(() => runJob(name, job), 5000)
  }

  const interval = setInterval(() => runJob(name, job), intervalMs)
  intervals.push(interval)

  logger.info(`Scheduled job: ${name} (every ${formatDuration(intervalMs)})`)
}

/**
 * Format duration for logging
 */
function formatDuration(ms: number): string {
  if (ms >= WEEK) return `${ms / WEEK} week(s)`
  if (ms >= DAY) return `${ms / DAY} day(s)`
  if (ms >= HOUR) return `${ms / HOUR} hour(s)`
  if (ms >= MINUTE) return `${ms / MINUTE} minute(s)`
  return `${ms / 1000} second(s)`
}

/**
 * Initialize all scheduled jobs
 */
export function initializeJobs(): void {
  logger.info('Initializing background jobs...')

  // Skip job initialization in development unless explicitly enabled
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_JOBS !== 'true') {
    logger.info('Skipping job initialization in development mode. Set ENABLE_JOBS=true to enable.')
    return
  }

  // Hourly jobs
  scheduleJob('refresh_popular_highlights', refreshPopularHighlights, HOUR, true)
  scheduleJob('aggregate_book_stats', aggregateBookStats, HOUR, true)

  // Daily jobs (run at different offsets to spread load)
  scheduleJob('enrich_book_metadata', enrichBookMetadata, DAY, false)
  scheduleJob('cleanup_expired_ai_cache', cleanupExpiredAiCache, DAY, false)

  // Weekly job
  scheduleJob('compute_related_books', computeRelatedBooks, WEEK, false)

  logger.info('Background jobs initialized')
}

/**
 * Stop all scheduled jobs
 */
export function stopJobs(): void {
  logger.info('Stopping background jobs...')
  intervals.forEach(clearInterval)
  intervals.length = 0
  logger.info('Background jobs stopped')
}

/**
 * Manually trigger a specific job (for testing/admin purposes)
 */
export async function triggerJob(jobName: string): Promise<boolean> {
  const jobs: Record<string, () => Promise<void>> = {
    'refresh_popular_highlights': refreshPopularHighlights,
    'aggregate_book_stats': aggregateBookStats,
    'enrich_book_metadata': enrichBookMetadata,
    'compute_related_books': computeRelatedBooks,
    'cleanup_expired_ai_cache': cleanupExpiredAiCache,
  }

  const job = jobs[jobName]
  if (!job) {
    logger.error(`Unknown job: ${jobName}`)
    return false
  }

  await runJob(jobName, job)
  return true
}

/**
 * Get status of all jobs
 */
export function getJobStatus(): Record<string, { running: boolean; lastRun?: Date }> {
  return {
    'refresh_popular_highlights': { running: runningJobs.has('refresh_popular_highlights') },
    'aggregate_book_stats': { running: runningJobs.has('aggregate_book_stats') },
    'enrich_book_metadata': { running: runningJobs.has('enrich_book_metadata') },
    'compute_related_books': { running: runningJobs.has('compute_related_books') },
    'cleanup_expired_ai_cache': { running: runningJobs.has('cleanup_expired_ai_cache') },
  }
}
