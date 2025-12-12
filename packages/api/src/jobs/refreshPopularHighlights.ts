/**
 * Refresh Popular Highlights Job
 *
 * Aggregates highlights (underlines) from all users to identify the most commonly
 * highlighted passages in each book. This powers the "popular highlights"
 * feature on book detail pages.
 *
 * Runs hourly to keep data fresh.
 */

import { db } from '../db/client'
import { ebookUnderlines, magazineUnderlines, bookStats } from '../db/schema'
import { sql, eq, and, desc } from 'drizzle-orm'
import { log } from '../utils/logger'
const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

/**
 * Find the most popular highlights across all books
 */
export async function refreshPopularHighlights(): Promise<void> {
  logger.debug('Starting popular highlights refresh...')

  try {
    // Aggregate ebook underlines by content
    const ebookHighlights = await db
      .select({
        ebookId: ebookUnderlines.ebookId,
        text: ebookUnderlines.text,
        highlightCount: sql<number>`count(*)`,
      })
      .from(ebookUnderlines)
      .groupBy(ebookUnderlines.ebookId, ebookUnderlines.text)
      .having(sql`count(*) >= 2`) // Only highlights from 2+ users
      .orderBy(desc(sql`count(*)`))

    logger.debug(`Found ${ebookHighlights.length} popular ebook highlights`)

    // Aggregate magazine underlines by content
    const magazineHighlights = await db
      .select({
        magazineId: magazineUnderlines.magazineId,
        text: magazineUnderlines.text,
        highlightCount: sql<number>`count(*)`,
      })
      .from(magazineUnderlines)
      .groupBy(magazineUnderlines.magazineId, magazineUnderlines.text)
      .having(sql`count(*) >= 2`)
      .orderBy(desc(sql`count(*)`))

    logger.debug(`Found ${magazineHighlights.length} popular magazine highlights`)

    // Group by book for stats update
    const bookHighlightCounts = new Map<string, number>()

    for (const h of ebookHighlights) {
      const key = `ebook:${h.ebookId}`
      const current = bookHighlightCounts.get(key) || 0
      bookHighlightCounts.set(key, current + 1)
    }

    for (const h of magazineHighlights) {
      const key = `magazine:${h.magazineId}`
      const current = bookHighlightCounts.get(key) || 0
      bookHighlightCounts.set(key, current + 1)
    }

    // Update book stats with popular highlight counts
    for (const [key, count] of bookHighlightCounts.entries()) {
      const [bookType, bookIdStr] = key.split(':')
      const bookId = parseInt(bookIdStr)

      // Check if book stats entry exists
      const [existing] = await db
        .select({ id: bookStats.id })
        .from(bookStats)
        .where(and(eq(bookStats.bookType, bookType), eq(bookStats.bookId, bookId)))
        .limit(1)

      if (existing) {
        // Update existing stats
        await db
          .update(bookStats)
          .set({
            totalHighlights: count,
            updatedAt: new Date(),
          })
          .where(eq(bookStats.id, existing.id))
      } else {
        // Create new stats entry
        await db.insert(bookStats).values({
          bookType,
          bookId,
          totalHighlights: count,
          totalReaders: 0,
        })
      }
    }

    logger.info(`Updated popular highlights for ${bookHighlightCounts.size} books`)
  } catch (error) {
    logger.error('Failed to refresh popular highlights:', error)
    throw error
  }
}
