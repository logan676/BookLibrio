/**
 * Open Library API Service
 *
 * Fallback book metadata source when Google Books fails.
 * Provides: author, description, publisher, ISBN, subjects
 *
 * Rate Limits: Unlimited (free, open source)
 * Docs: https://openlibrary.org/developers/api
 */

import { log } from '../utils/logger'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

const OPEN_LIBRARY_API_URL = 'https://openlibrary.org'

export interface OpenLibraryMetadata {
  title: string
  author: string | null
  description: string | null
  publisher: string | null
  publishedDate: string | null
  pageCount: number | null
  isbn10: string | null
  isbn13: string | null
  subjects: string[] | null
  coverUrl: string | null
  openLibraryKey: string
}

interface OpenLibraryWork {
  key: string
  title: string
  authors?: Array<{ author: { key: string } }>
  description?: string | { value: string }
  subjects?: string[]
  covers?: number[]
}

interface OpenLibraryEdition {
  key: string
  title: string
  publishers?: string[]
  publish_date?: string
  number_of_pages?: number
  isbn_10?: string[]
  isbn_13?: string[]
  covers?: number[]
}

interface OpenLibraryAuthor {
  name: string
  personal_name?: string
}

interface OpenLibrarySearchResult {
  numFound: number
  docs: Array<{
    key: string
    title: string
    author_name?: string[]
    first_publish_year?: number
    publisher?: string[]
    isbn?: string[]
    cover_i?: number
    number_of_pages_median?: number
    subject?: string[]
  }>
}

/**
 * Search Open Library by ISBN
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Book metadata or null if not found
 */
export async function searchByISBN(isbn: string): Promise<OpenLibraryMetadata | null> {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '')
    const url = `${OPEN_LIBRARY_API_URL}/isbn/${cleanISBN}.json`

    const response = await fetch(url)
    if (!response.ok) {
      if (response.status === 404) {
        logger.debug(`Open Library: No results for ISBN: ${isbn}`)
        return null
      }
      logger.error(`Open Library API error: ${response.status}`)
      return null
    }

    const edition: OpenLibraryEdition = await response.json()
    return await parseEditionToMetadata(edition)
  } catch (error) {
    logger.error('Open Library API error:', error)
    return null
  }
}

/**
 * Search Open Library by title
 * @param title - Book title
 * @param author - Optional author name
 * @returns Book metadata or null if not found
 */
export async function searchByTitle(title: string, author?: string): Promise<OpenLibraryMetadata | null> {
  try {
    let query = `title=${encodeURIComponent(title)}`
    if (author) {
      query += `&author=${encodeURIComponent(author)}`
    }

    const url = `${OPEN_LIBRARY_API_URL}/search.json?${query}&limit=5`

    const response = await fetch(url)
    if (!response.ok) {
      logger.error(`Open Library API error: ${response.status}`)
      return null
    }

    const data: OpenLibrarySearchResult = await response.json()

    if (data.numFound === 0 || !data.docs.length) {
      logger.debug(`Open Library: No results for title: ${title}`)
      return null
    }

    // Get best match
    const doc = data.docs[0]

    return {
      title: doc.title,
      author: doc.author_name?.[0] || null,
      description: null, // Search results don't include description
      publisher: doc.publisher?.[0] || null,
      publishedDate: doc.first_publish_year?.toString() || null,
      pageCount: doc.number_of_pages_median || null,
      isbn10: doc.isbn?.find(i => i.length === 10) || null,
      isbn13: doc.isbn?.find(i => i.length === 13) || null,
      subjects: doc.subject?.slice(0, 10) || null,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
      openLibraryKey: doc.key,
    }
  } catch (error) {
    logger.error('Open Library API error:', error)
    return null
  }
}

/**
 * Get detailed work information
 * @param workKey - Open Library work key (e.g., /works/OL123W)
 * @returns Work details
 */
export async function getWork(workKey: string): Promise<OpenLibraryWork | null> {
  try {
    const url = `${OPEN_LIBRARY_API_URL}${workKey}.json`
    const response = await fetch(url)

    if (!response.ok) {
      logger.error(`Open Library API error: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    logger.error('Open Library API error:', error)
    return null
  }
}

/**
 * Get author details
 * @param authorKey - Open Library author key (e.g., /authors/OL123A)
 * @returns Author name
 */
export async function getAuthor(authorKey: string): Promise<string | null> {
  try {
    const url = `${OPEN_LIBRARY_API_URL}${authorKey}.json`
    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    const author: OpenLibraryAuthor = await response.json()
    return author.name || author.personal_name || null
  } catch (error) {
    logger.error('Open Library get author error:', error)
    return null
  }
}

/**
 * Parse Open Library edition to our metadata format
 */
async function parseEditionToMetadata(edition: OpenLibraryEdition): Promise<OpenLibraryMetadata> {
  // Get cover URL
  let coverUrl: string | null = null
  if (edition.covers && edition.covers.length > 0) {
    coverUrl = `https://covers.openlibrary.org/b/id/${edition.covers[0]}-L.jpg`
  }

  return {
    title: edition.title,
    author: null, // Need to fetch from work
    description: null, // Need to fetch from work
    publisher: edition.publishers?.[0] || null,
    publishedDate: edition.publish_date || null,
    pageCount: edition.number_of_pages || null,
    isbn10: edition.isbn_10?.[0] || null,
    isbn13: edition.isbn_13?.[0] || null,
    subjects: null, // Need to fetch from work
    coverUrl,
    openLibraryKey: edition.key,
  }
}

/**
 * Extract description text from Open Library description field
 * (Can be string or object with 'value' key)
 */
export function extractDescription(description: string | { value: string } | undefined): string | null {
  if (!description) return null
  if (typeof description === 'string') return description
  if (typeof description === 'object' && 'value' in description) return description.value
  return null
}
