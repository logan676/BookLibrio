/**
 * Google Books API Service
 *
 * Provides book metadata enrichment from Google Books API.
 * Primary source for: author, description, publisher, ISBN, page count
 *
 * Rate Limits: 1,000 requests/day (free tier)
 * Docs: https://developers.google.com/books/docs/v1/using
 */

import { log } from '../utils/logger'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes'

export interface GoogleBooksMetadata {
  title: string
  author: string | null
  translator: string | null
  description: string | null
  publisher: string | null
  publishedDate: string | null
  pageCount: number | null
  isbn10: string | null
  isbn13: string | null
  language: string | null
  categories: string[] | null
  coverUrl: string | null
  googleBooksId: string
}

interface GoogleBooksVolume {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    industryIdentifiers?: Array<{
      type: string
      identifier: string
    }>
    pageCount?: number
    categories?: string[]
    language?: string
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
      medium?: string
      large?: string
    }
  }
}

interface GoogleBooksResponse {
  totalItems: number
  items?: GoogleBooksVolume[]
}

/**
 * Search Google Books by ISBN
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Book metadata or null if not found
 */
export async function searchByISBN(isbn: string): Promise<GoogleBooksMetadata | null> {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '')
    const url = `${GOOGLE_BOOKS_API_URL}?q=isbn:${cleanISBN}&maxResults=1`

    const response = await fetch(url)
    if (!response.ok) {
      logger.error(`Google Books API error: ${response.status}`)
      return null
    }

    const data: GoogleBooksResponse = await response.json()

    if (!data.items || data.items.length === 0) {
      logger.debug(`No results found for ISBN: ${isbn}`)
      return null
    }

    return parseVolumeToMetadata(data.items[0])
  } catch (error) {
    logger.error('Google Books API error:', error)
    return null
  }
}

/**
 * Search Google Books by title and author
 * @param title - Book title
 * @param author - Optional author name
 * @returns Book metadata or null if not found
 */
export async function searchByTitle(title: string, author?: string): Promise<GoogleBooksMetadata | null> {
  try {
    let query = `intitle:${encodeURIComponent(title)}`
    if (author) {
      query += `+inauthor:${encodeURIComponent(author)}`
    }

    const url = `${GOOGLE_BOOKS_API_URL}?q=${query}&maxResults=5&langRestrict=zh`

    const response = await fetch(url)
    if (!response.ok) {
      logger.error(`Google Books API error: ${response.status}`)
      return null
    }

    const data: GoogleBooksResponse = await response.json()

    if (!data.items || data.items.length === 0) {
      logger.debug(`No results found for title: ${title}`)
      return null
    }

    // Find best match - prefer exact title match
    const normalizedTitle = normalizeTitle(title)
    const bestMatch = data.items.find(item =>
      normalizeTitle(item.volumeInfo.title) === normalizedTitle
    ) || data.items[0]

    return parseVolumeToMetadata(bestMatch)
  } catch (error) {
    logger.error('Google Books API error:', error)
    return null
  }
}

/**
 * Search Google Books with generic query
 * @param query - Search query string
 * @param limit - Maximum results to return
 * @returns Array of book metadata
 */
export async function searchBooks(query: string, limit: number = 10): Promise<GoogleBooksMetadata[]> {
  try {
    const url = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query)}&maxResults=${limit}`

    const response = await fetch(url)
    if (!response.ok) {
      logger.error(`Google Books API error: ${response.status}`)
      return []
    }

    const data: GoogleBooksResponse = await response.json()

    if (!data.items || data.items.length === 0) {
      return []
    }

    return data.items.map(parseVolumeToMetadata)
  } catch (error) {
    logger.error('Google Books API error:', error)
    return []
  }
}

/**
 * Parse Google Books API volume response to our metadata format
 */
function parseVolumeToMetadata(volume: GoogleBooksVolume): GoogleBooksMetadata {
  const info = volume.volumeInfo
  const identifiers = info.industryIdentifiers || []

  const isbn10 = identifiers.find(i => i.type === 'ISBN_10')?.identifier || null
  const isbn13 = identifiers.find(i => i.type === 'ISBN_13')?.identifier || null

  // Get the best available cover image
  let coverUrl: string | null = null
  if (info.imageLinks) {
    coverUrl = info.imageLinks.large
      || info.imageLinks.medium
      || info.imageLinks.thumbnail
      || info.imageLinks.smallThumbnail
      || null

    // Convert to HTTPS
    if (coverUrl && coverUrl.startsWith('http://')) {
      coverUrl = coverUrl.replace('http://', 'https://')
    }
  }

  // Parse authors - first one is primary author, rest might include translator
  const authors = info.authors || []
  const author = authors[0] || null

  // Try to detect translator from author list (common pattern: "Author / Translator译")
  let translator: string | null = null
  if (authors.length > 1) {
    const possibleTranslator = authors.find(a =>
      a.includes('译') || a.includes('翻译') || a.toLowerCase().includes('translator')
    )
    if (possibleTranslator) {
      translator = possibleTranslator.replace(/\s*[译翻译]+$/, '')
    }
  }

  return {
    title: info.title,
    author,
    translator,
    description: info.description || null,
    publisher: info.publisher || null,
    publishedDate: info.publishedDate || null,
    pageCount: info.pageCount || null,
    isbn10,
    isbn13,
    language: info.language || null,
    categories: info.categories || null,
    coverUrl,
    googleBooksId: volume.id,
  }
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[《》「」『』【】\[\]()（）]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Estimate word count from page count
 * Chinese books: ~500 chars per page
 * English books: ~250 words per page
 */
export function estimateWordCount(pageCount: number, language: string = 'zh'): number {
  if (language === 'zh' || language === 'zh-CN' || language === 'zh-TW') {
    return pageCount * 500
  }
  return pageCount * 250
}
