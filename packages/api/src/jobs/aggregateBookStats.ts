/**
 * Aggregate Book Stats Job
 *
 * Calculates and updates comprehensive statistics for each book:
 * - Total unique readers
 * - Average rating
 * - Review count
 * - Total reading time
 * - Highlight count
 *
 * Runs hourly to keep stats current.
 */

import { db } from '../db/client'
import { bookStats, bookReviews, readingSessions, ebookUnderlines, magazineUnderlines, userBookshelves, ebooks, magazines } from '../db/schema'
import { sql, eq, and } from 'drizzle-orm'
import { log } from '../utils/logger'
const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

/**
 * Aggregate all statistics for books
 */
export async function aggregateBookStats(): Promise<void> {
  logger.debug('Starting book stats aggregation...')

  try {
    // Get all ebooks
    const allEbooks = await db
      .select({ id: ebooks.id })
      .from(ebooks)

    // Get all magazines
    const allMagazines = await db
      .select({ id: magazines.id })
      .from(magazines)

    const booksToUpdate: Array<{ type: string; id: number }> = [
      ...allEbooks.map((e) => ({ type: 'ebook', id: e.id })),
      ...allMagazines.map((m) => ({ type: 'magazine', id: m.id })),
    ]

    logger.debug(`Processing stats for ${booksToUpdate.length} books`)

    let updatedCount = 0

    for (const book of booksToUpdate) {
      try {
        // Get unique readers (from bookshelves)
        const [readersResult] = await db
          .select({
            count: sql<number>`count(distinct user_id)`,
          })
          .from(userBookshelves)
          .where(
            and(
              eq(userBookshelves.bookType, book.type),
              eq(userBookshelves.bookId, book.id)
            )
          )

        const totalReaders = Number(readersResult?.count || 0)

        // Get review stats
        const [reviewResult] = await db
          .select({
            count: sql<number>`count(*)`,
            avgRating: sql<number>`coalesce(avg(rating), 0)`,
          })
          .from(bookReviews)
          .where(
            and(
              eq(bookReviews.bookType, book.type),
              eq(bookReviews.bookId, book.id)
            )
          )

        const reviewCount = Number(reviewResult?.count || 0)
        const averageRating = Number(reviewResult?.avgRating || 0)

        // Get total reading time
        const [readingResult] = await db
          .select({
            totalTime: sql<number>`coalesce(sum(duration_seconds), 0)`,
          })
          .from(readingSessions)
          .where(
            and(
              eq(readingSessions.bookType, book.type),
              eq(readingSessions.bookId, book.id)
            )
          )

        const totalReadingTime = Number(readingResult?.totalTime || 0)

        // Get highlight count based on book type
        let highlightCount = 0
        if (book.type === 'ebook') {
          const [highlightResult] = await db
            .select({
              count: sql<number>`count(*)`,
            })
            .from(ebookUnderlines)
            .where(eq(ebookUnderlines.ebookId, book.id))

          highlightCount = Number(highlightResult?.count || 0)
        } else {
          const [highlightResult] = await db
            .select({
              count: sql<number>`count(*)`,
            })
            .from(magazineUnderlines)
            .where(eq(magazineUnderlines.magazineId, book.id))

          highlightCount = Number(highlightResult?.count || 0)
        }

        // Skip if all stats are zero
        if (totalReaders === 0 && reviewCount === 0 && totalReadingTime === 0 && highlightCount === 0) {
          continue
        }

        // Round average rating to 2 decimal places
        const roundedRating = Math.round(averageRating * 100) / 100

        // Upsert book stats
        const [existing] = await db
          .select({ id: bookStats.id })
          .from(bookStats)
          .where(
            and(
              eq(bookStats.bookType, book.type),
              eq(bookStats.bookId, book.id)
            )
          )
          .limit(1)

        if (existing) {
          await db
            .update(bookStats)
            .set({
              totalReaders,
              averageRating: roundedRating.toFixed(2),
              totalReviews: reviewCount,
              totalHighlights: highlightCount,
              updatedAt: new Date(),
            })
            .where(eq(bookStats.id, existing.id))
        } else {
          await db.insert(bookStats).values({
            bookType: book.type,
            bookId: book.id,
            totalReaders,
            averageRating: roundedRating.toFixed(2),
            totalReviews: reviewCount,
            totalHighlights: highlightCount,
          })
        }

        updatedCount++
      } catch (bookError) {
        logger.error(`Failed to aggregate stats for ${book.type}:${book.id}:`, bookError)
      }
    }

    logger.info(`Aggregated stats for ${updatedCount} books`)
  } catch (error) {
    logger.error('Failed to aggregate book stats:', error)
    throw error
  }
}
