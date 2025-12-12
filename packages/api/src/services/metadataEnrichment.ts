/**
 * Metadata Enrichment Service
 *
 * Combines Google Books and Open Library APIs to enrich book metadata.
 * Uses Google Books as primary source, Open Library as fallback.
 */

import * as googleBooks from './googleBooks'
import * as openLibrary from './openLibrary'
import { log } from '../utils/logger'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

export interface EnrichedMetadata {
  author: string | null
  translator: string | null
  description: string | null
  publisher: string | null
  publicationDate: string | null
  pageCount: number | null
  wordCount: number | null
  isbn: string | null
  language: string | null
  coverUrl: string | null
  categories: string[] | null
  source: 'google_books' | 'open_library' | 'none'
  sourceId: string | null
}

/**
 * Enrich book metadata from external sources
 * @param title - Book title
 * @param existingISBN - Existing ISBN if available
 * @param existingAuthor - Existing author if available
 * @returns Enriched metadata
 */
export async function enrichBookMetadata(
  title: string,
  existingISBN?: string | null,
  existingAuthor?: string | null
): Promise<EnrichedMetadata> {
  const emptyResult: EnrichedMetadata = {
    author: null,
    translator: null,
    description: null,
    publisher: null,
    publicationDate: null,
    pageCount: null,
    wordCount: null,
    isbn: null,
    language: null,
    coverUrl: null,
    categories: null,
    source: 'none',
    sourceId: null,
  }

  // Strategy 1: Try ISBN lookup first (most accurate)
  if (existingISBN) {
    logger.debug(`Enriching by ISBN: ${existingISBN}`)

    // Try Google Books first
    const googleResult = await googleBooks.searchByISBN(existingISBN)
    if (googleResult) {
      return {
        author: googleResult.author,
        translator: googleResult.translator,
        description: googleResult.description,
        publisher: googleResult.publisher,
        publicationDate: googleResult.publishedDate,
        pageCount: googleResult.pageCount,
        wordCount: googleResult.pageCount
          ? googleBooks.estimateWordCount(googleResult.pageCount, googleResult.language || 'zh')
          : null,
        isbn: googleResult.isbn13 || googleResult.isbn10,
        language: googleResult.language,
        coverUrl: googleResult.coverUrl,
        categories: googleResult.categories,
        source: 'google_books',
        sourceId: googleResult.googleBooksId,
      }
    }

    // Fallback to Open Library
    const openLibResult = await openLibrary.searchByISBN(existingISBN)
    if (openLibResult) {
      return {
        author: openLibResult.author,
        translator: null,
        description: openLibResult.description,
        publisher: openLibResult.publisher,
        publicationDate: openLibResult.publishedDate,
        pageCount: openLibResult.pageCount,
        wordCount: openLibResult.pageCount
          ? googleBooks.estimateWordCount(openLibResult.pageCount, 'en')
          : null,
        isbn: openLibResult.isbn13 || openLibResult.isbn10,
        language: null,
        coverUrl: openLibResult.coverUrl,
        categories: openLibResult.subjects,
        source: 'open_library',
        sourceId: openLibResult.openLibraryKey,
      }
    }
  }

  // Strategy 2: Try title + author search
  logger.debug(`Enriching by title: ${title}`)

  // Try Google Books
  const googleResult = await googleBooks.searchByTitle(title, existingAuthor || undefined)
  if (googleResult) {
    return {
      author: googleResult.author,
      translator: googleResult.translator,
      description: googleResult.description,
      publisher: googleResult.publisher,
      publicationDate: googleResult.publishedDate,
      pageCount: googleResult.pageCount,
      wordCount: googleResult.pageCount
        ? googleBooks.estimateWordCount(googleResult.pageCount, googleResult.language || 'zh')
        : null,
      isbn: googleResult.isbn13 || googleResult.isbn10,
      language: googleResult.language,
      coverUrl: googleResult.coverUrl,
      categories: googleResult.categories,
      source: 'google_books',
      sourceId: googleResult.googleBooksId,
    }
  }

  // Fallback to Open Library
  const openLibResult = await openLibrary.searchByTitle(title, existingAuthor || undefined)
  if (openLibResult) {
    return {
      author: openLibResult.author,
      translator: null,
      description: openLibResult.description,
      publisher: openLibResult.publisher,
      publicationDate: openLibResult.publishedDate,
      pageCount: openLibResult.pageCount,
      wordCount: openLibResult.pageCount
        ? googleBooks.estimateWordCount(openLibResult.pageCount, 'en')
        : null,
      isbn: openLibResult.isbn13 || openLibResult.isbn10,
      language: null,
      coverUrl: openLibResult.coverUrl,
      categories: openLibResult.subjects,
      source: 'open_library',
      sourceId: openLibResult.openLibraryKey,
    }
  }

  logger.debug(`No metadata found for: ${title}`)
  return emptyResult
}

/**
 * Merge enriched metadata with existing data
 * Only fills in missing fields, doesn't overwrite existing data
 */
export function mergeMetadata<T extends Record<string, any>>(
  existing: T,
  enriched: EnrichedMetadata
): Partial<T> {
  const updates: Record<string, any> = {}

  // Only update fields that are currently null/empty
  if (!existing.author && enriched.author) {
    updates.author = enriched.author
  }
  if (!existing.translator && enriched.translator) {
    updates.translator = enriched.translator
  }
  if (!existing.description && enriched.description) {
    updates.description = enriched.description
  }
  if (!existing.publisher && enriched.publisher) {
    updates.publisher = enriched.publisher
  }
  if (!existing.publicationDate && enriched.publicationDate) {
    // Parse date string to Date object if needed
    const dateStr = enriched.publicationDate
    if (dateStr.match(/^\d{4}$/)) {
      // Year only: assume January 1st
      updates.publicationDate = `${dateStr}-01-01`
    } else if (dateStr.match(/^\d{4}-\d{2}$/)) {
      // Year-month: assume 1st of month
      updates.publicationDate = `${dateStr}-01`
    } else {
      updates.publicationDate = dateStr
    }
  }
  if (!existing.pageCount && enriched.pageCount) {
    updates.pageCount = enriched.pageCount
  }
  if (!existing.wordCount && enriched.wordCount) {
    updates.wordCount = enriched.wordCount
  }
  if (!existing.isbn && enriched.isbn) {
    updates.isbn = enriched.isbn
  }
  if (!existing.language && enriched.language) {
    updates.language = enriched.language
  }

  return updates as Partial<T>
}
