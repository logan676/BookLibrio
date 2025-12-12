/**
 * Cleanup Expired AI Cache Job
 *
 * Removes expired AI-generated summaries from the database.
 * AI summaries have a configurable TTL (default 30 days) after which
 * they should be regenerated if requested again.
 *
 * This keeps storage costs down and ensures summaries stay fresh
 * as AI models improve.
 *
 * Runs daily.
 */

import { db } from '../db/client'
import { aiBookSummaries } from '../db/schema'
import { sql, lt } from 'drizzle-orm'
import { log } from '../utils/logger'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

/**
 * Clean up expired AI summaries
 */
export async function cleanupExpiredAiCache(): Promise<void> {
  logger.debug('Starting AI cache cleanup...')

  try {
    const now = new Date()

    // Delete summaries where expiresAt has passed
    const result = await db
      .delete(aiBookSummaries)
      .where(lt(aiBookSummaries.expiresAt, now))
      .returning({ id: aiBookSummaries.id })

    const deletedCount = result.length

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} expired AI summaries`)
    } else {
      logger.debug('No expired AI summaries to clean up')
    }

    // Log storage stats
    const [statsResult] = await db
      .select({
        totalCount: sql<number>`count(*)`,
        totalSize: sql<number>`coalesce(sum(length(content::text)), 0)`,
      })
      .from(aiBookSummaries)

    const totalCount = Number(statsResult?.totalCount || 0)
    const totalSizeKb = Math.round(Number(statsResult?.totalSize || 0) / 1024)

    logger.debug(`AI cache stats: ${totalCount} summaries, ${totalSizeKb}KB total`)
  } catch (error) {
    logger.error('Failed to cleanup AI cache:', error)
    throw error
  }
}
