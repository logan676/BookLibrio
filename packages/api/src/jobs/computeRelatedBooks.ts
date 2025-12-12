/**
 * Compute Related Books Job
 *
 * Calculates relationships between books based on:
 * - Same author
 * - Same publisher
 * - Same category/genre
 * - Co-read patterns (users who read this also read that)
 *
 * Results are stored in the related_books table for fast retrieval.
 * Runs weekly as relationships change slowly.
 */

import { db } from '../db/client'
import { ebooks, magazines, relatedBooks, userBookshelves, publishers } from '../db/schema'
import { log } from '../utils/logger'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

// Relationship types and their weights
const RELATION_WEIGHTS = {
  same_author: 100,
  same_publisher: 50,
  same_category: 30,
  co_read: 20,
} as const

// Maximum related books to store per book
const MAX_RELATED_PER_BOOK = 20

interface RelatedBookCandidate {
  bookType: string
  bookId: number
  relationType: string
  score: number
}

/**
 * Compute related books for all books in the catalog
 */
export async function computeRelatedBooks(): Promise<void> {
  logger.debug('Starting related books computation...')

  try {
    // Get all ebooks with their metadata
    const allEbooks = await db
      .select({
        id: ebooks.id,
        author: ebooks.author,
        publisher: ebooks.publisher,
        categoryId: ebooks.categoryId,
      })
      .from(ebooks)

    // Get all magazines with their publishers
    const allMagazines = await db
      .select({
        id: magazines.id,
        publisherId: magazines.publisherId,
      })
      .from(magazines)

    // Get publisher names for matching
    const publishersList = await db.select().from(publishers)
    const publisherNames = new Map(publishersList.map((p) => [p.id, p.name]))

    logger.debug(`Processing ${allEbooks.length} ebooks and ${allMagazines.length} magazines`)

    // Build indexes for faster lookups
    const authorIndex = new Map<string, number[]>()
    const publisherIndex = new Map<string, Array<{ type: string; id: number }>>()
    const categoryIndex = new Map<number, number[]>()

    // Index ebooks
    for (const book of allEbooks) {
      if (book.author) {
        const authorBooks = authorIndex.get(book.author) || []
        authorBooks.push(book.id)
        authorIndex.set(book.author, authorBooks)
      }

      if (book.publisher) {
        const publisherBooks = publisherIndex.get(book.publisher) || []
        publisherBooks.push({ type: 'ebook', id: book.id })
        publisherIndex.set(book.publisher, publisherBooks)
      }

      if (book.categoryId) {
        const catBooks = categoryIndex.get(book.categoryId) || []
        catBooks.push(book.id)
        categoryIndex.set(book.categoryId, catBooks)
      }
    }

    // Index magazines by publisher
    for (const mag of allMagazines) {
      if (mag.publisherId) {
        const publisherName = publisherNames.get(mag.publisherId)
        if (publisherName) {
          const publisherBooks = publisherIndex.get(publisherName) || []
          publisherBooks.push({ type: 'magazine', id: mag.id })
          publisherIndex.set(publisherName, publisherBooks)
        }
      }
    }

    // Compute co-read patterns
    const coReadMap = await computeCoReadPatterns()

    // Clear existing related books
    await db.delete(relatedBooks)

    let totalRelations = 0

    // Process each ebook
    for (const book of allEbooks) {
      const candidates: RelatedBookCandidate[] = []

      // Same author
      if (book.author) {
        const sameAuthor = authorIndex.get(book.author) || []
        for (const relatedId of sameAuthor) {
          if (relatedId !== book.id) {
            candidates.push({
              bookType: 'ebook',
              bookId: relatedId,
              relationType: 'same_author',
              score: RELATION_WEIGHTS.same_author,
            })
          }
        }
      }

      // Same publisher
      if (book.publisher) {
        const samePublisher = publisherIndex.get(book.publisher) || []
        for (const related of samePublisher) {
          if (!(related.type === 'ebook' && related.id === book.id)) {
            candidates.push({
              bookType: related.type,
              bookId: related.id,
              relationType: 'same_publisher',
              score: RELATION_WEIGHTS.same_publisher,
            })
          }
        }
      }

      // Same category
      if (book.categoryId) {
        const sameCat = categoryIndex.get(book.categoryId) || []
        for (const relatedId of sameCat) {
          if (relatedId !== book.id) {
            candidates.push({
              bookType: 'ebook',
              bookId: relatedId,
              relationType: 'same_category',
              score: RELATION_WEIGHTS.same_category,
            })
          }
        }
      }

      // Co-read patterns
      const coReadKey = `ebook:${book.id}`
      const coRead = coReadMap.get(coReadKey) || []
      for (const related of coRead) {
        candidates.push({
          bookType: related.type,
          bookId: related.id,
          relationType: 'co_read',
          score: RELATION_WEIGHTS.co_read * related.count,
        })
      }

      // Aggregate candidates by book (combine scores from multiple relation types)
      const aggregated = aggregateCandidates(candidates)

      // Sort by score and take top N
      const topRelated = aggregated
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RELATED_PER_BOOK)

      // Insert related books
      if (topRelated.length > 0) {
        await db.insert(relatedBooks).values(
          topRelated.map((r) => ({
            sourceBookType: 'ebook',
            sourceBookId: book.id,
            relatedBookType: r.bookType,
            relatedBookId: r.bookId,
            relationType: r.relationType,
            similarityScore: (r.score / 100).toFixed(4), // Normalize to 0-1 range
          }))
        )
        totalRelations += topRelated.length
      }
    }

    // Process each magazine (simpler - only publisher matching)
    for (const mag of allMagazines) {
      const candidates: RelatedBookCandidate[] = []

      if (mag.publisherId) {
        const publisherName = publisherNames.get(mag.publisherId)
        if (publisherName) {
          const samePublisher = publisherIndex.get(publisherName) || []
          for (const related of samePublisher) {
            if (!(related.type === 'magazine' && related.id === mag.id)) {
              candidates.push({
                bookType: related.type,
                bookId: related.id,
                relationType: 'same_publisher',
                score: RELATION_WEIGHTS.same_publisher,
              })
            }
          }
        }
      }

      // Co-read patterns for magazines
      const coReadKey = `magazine:${mag.id}`
      const coRead = coReadMap.get(coReadKey) || []
      for (const related of coRead) {
        candidates.push({
          bookType: related.type,
          bookId: related.id,
          relationType: 'co_read',
          score: RELATION_WEIGHTS.co_read * related.count,
        })
      }

      const aggregated = aggregateCandidates(candidates)
      const topRelated = aggregated
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RELATED_PER_BOOK)

      if (topRelated.length > 0) {
        await db.insert(relatedBooks).values(
          topRelated.map((r) => ({
            sourceBookType: 'magazine',
            sourceBookId: mag.id,
            relatedBookType: r.bookType,
            relatedBookId: r.bookId,
            relationType: r.relationType,
            similarityScore: (r.score / 100).toFixed(4),
          }))
        )
        totalRelations += topRelated.length
      }
    }

    logger.info(`Computed ${totalRelations} related book relationships`)
  } catch (error) {
    logger.error('Failed to compute related books:', error)
    throw error
  }
}

/**
 * Compute co-read patterns from user bookshelves
 */
async function computeCoReadPatterns(): Promise<Map<string, Array<{ type: string; id: number; count: number }>>> {
  const coReadMap = new Map<string, Array<{ type: string; id: number; count: number }>>()

  try {
    // Get users with multiple books
    const userBooks = await db
      .select({
        userId: userBookshelves.userId,
        bookType: userBookshelves.bookType,
        bookId: userBookshelves.bookId,
      })
      .from(userBookshelves)
      .orderBy(userBookshelves.userId)

    // Group by user
    const userBooksMap = new Map<number, Array<{ type: string; id: number }>>()
    for (const ub of userBooks) {
      const books = userBooksMap.get(ub.userId) || []
      books.push({ type: ub.bookType, id: ub.bookId })
      userBooksMap.set(ub.userId, books)
    }

    // Find co-read pairs (books read by the same user)
    for (const [_userId, books] of userBooksMap) {
      if (books.length < 2) continue

      for (let i = 0; i < books.length; i++) {
        const key = `${books[i].type}:${books[i].id}`

        for (let j = 0; j < books.length; j++) {
          if (i === j) continue

          const coReadList = coReadMap.get(key) || []
          const existing = coReadList.find(
            (r) => r.type === books[j].type && r.id === books[j].id
          )

          if (existing) {
            existing.count++
          } else {
            coReadList.push({ type: books[j].type, id: books[j].id, count: 1 })
          }

          coReadMap.set(key, coReadList)
        }
      }
    }
  } catch (error) {
    logger.error('Failed to compute co-read patterns:', error)
  }

  return coReadMap
}

/**
 * Aggregate candidates by book, combining scores
 */
function aggregateCandidates(candidates: RelatedBookCandidate[]): RelatedBookCandidate[] {
  const aggregated = new Map<string, RelatedBookCandidate>()

  for (const candidate of candidates) {
    const key = `${candidate.bookType}:${candidate.bookId}`
    const existing = aggregated.get(key)

    if (existing) {
      existing.score += candidate.score
      // Keep the highest-weight relation type
      const existingWeight = RELATION_WEIGHTS[existing.relationType as keyof typeof RELATION_WEIGHTS] || 0
      const candidateWeight = RELATION_WEIGHTS[candidate.relationType as keyof typeof RELATION_WEIGHTS] || 0
      if (candidateWeight > existingWeight) {
        existing.relationType = candidate.relationType
      }
    } else {
      aggregated.set(key, { ...candidate })
    }
  }

  return Array.from(aggregated.values())
}
