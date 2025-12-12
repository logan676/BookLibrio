/**
 * Enrich Book Metadata Job
 *
 * Fetches missing metadata from external APIs:
 * - Google Books (primary)
 * - Open Library (fallback)
 *
 * Fills in missing fields like:
 * - Author
 * - Description
 * - Publisher
 * - Publication date
 * - Page count
 * - ISBN
 * - Categories
 *
 * Runs daily to process newly added books.
 */

import { db } from '../db/client'
import { ebooks } from '../db/schema'
import { isNull, or, and, eq } from 'drizzle-orm'
import { log } from '../utils/logger'
import { enrichBookMetadata as fetchMetadata, mergeMetadata } from '../services/metadataEnrichment'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

// Process books in batches to avoid API rate limits
const BATCH_SIZE = 10
const DELAY_BETWEEN_REQUESTS = 1000 // 1 second

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Enrich metadata for books missing information
 */
export async function enrichBookMetadata(): Promise<void> {
  logger.debug('Starting metadata enrichment...')

  try {
    // Find books with missing metadata (no author OR no description)
    const booksNeedingEnrichment = await db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        author: ebooks.author,
        isbn: ebooks.isbn,
        description: ebooks.description,
        publisher: ebooks.publisher,
        publicationDate: ebooks.publicationDate,
        pageCount: ebooks.pageCount,
        language: ebooks.language,
      })
      .from(ebooks)
      .where(
        or(
          isNull(ebooks.author),
          isNull(ebooks.description),
          and(
            isNull(ebooks.publisher),
            isNull(ebooks.publicationDate)
          )
        )
      )
      .limit(BATCH_SIZE * 5) // Get a larger batch to process over time

    if (booksNeedingEnrichment.length === 0) {
      logger.info('No books need metadata enrichment')
      return
    }

    logger.info(`Found ${booksNeedingEnrichment.length} books needing enrichment`)

    let enrichedCount = 0
    let failedCount = 0

    for (let i = 0; i < Math.min(booksNeedingEnrichment.length, BATCH_SIZE); i++) {
      const book = booksNeedingEnrichment[i]

      try {
        logger.debug(`Enriching metadata for: ${book.title}`)

        // Fetch metadata from external sources
        const enrichedData = await fetchMetadata(
          book.title,
          book.isbn,
          book.author
        )

        if (enrichedData.source === 'none') {
          logger.debug(`No metadata found for: ${book.title}`)
          failedCount++
          continue
        }

        // Merge with existing data (only fill missing fields)
        const updates = mergeMetadata(book, enrichedData)

        if (Object.keys(updates).length > 0) {
          // Apply updates
          await db
            .update(ebooks)
            .set(updates)
            .where(eq(ebooks.id, book.id))

          enrichedCount++
          logger.debug(`Updated metadata for: ${book.title} (source: ${enrichedData.source})`)
        }

        // Rate limiting
        await sleep(DELAY_BETWEEN_REQUESTS)
      } catch (bookError) {
        logger.error(`Failed to enrich metadata for book ${book.id}:`, bookError)
        failedCount++
      }
    }

    logger.info(`Metadata enrichment complete: ${enrichedCount} enriched, ${failedCount} failed`)
  } catch (error) {
    logger.error('Failed to enrich book metadata:', error)
    throw error
  }
}
