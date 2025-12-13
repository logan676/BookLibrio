/**
 * Book Metadata Enrichment Service
 *
 * Fetches book metadata from external APIs:
 * - Google Books API (primary)
 * - Open Library API (fallback)
 */

import { db } from '../db/client'
import { ebooks } from '../db/schema'
import { eq } from 'drizzle-orm'

// Types
export interface BookMetadata {
  title?: string
  author?: string
  description?: string
  publisher?: string
  publishedDate?: string
  pageCount?: number
  language?: string
  isbn10?: string
  isbn13?: string
  categories?: string[]
  imageLinks?: {
    thumbnail?: string
    small?: string
    medium?: string
    large?: string
  }
  // Google Books ratings
  averageRating?: number
  ratingsCount?: number
}

export interface EnrichmentResult {
  success: boolean
  source?: 'google_books' | 'open_library' | 'epub_metadata'
  metadata?: BookMetadata
  error?: string
}

// Google Books API
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes'

interface GoogleBooksResponse {
  totalItems: number
  items?: Array<{
    volumeInfo: {
      title: string
      subtitle?: string
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
        smallThumbnail?: string
        thumbnail?: string
        small?: string
        medium?: string
        large?: string
      }
      // Ratings from Google Books
      averageRating?: number
      ratingsCount?: number
    }
  }>
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function titleSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const aNorm = normalize(a)
  const bNorm = normalize(b)

  if (aNorm === bNorm) return 1
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return 0.8

  // Simple word overlap
  const aWords = new Set(a.toLowerCase().split(/\s+/))
  const bWords = new Set(b.toLowerCase().split(/\s+/))
  const intersection = [...aWords].filter(w => bWords.has(w))
  const union = new Set([...aWords, ...bWords])
  return intersection.length / union.size
}

/**
 * Score a Google Books result for relevance
 */
function scoreGoogleBooksResult(volumeInfo: GoogleBooksResponse['items'][0]['volumeInfo'], searchTitle: string): number {
  let score = 0

  // Must have authors - this is critical for our use case
  if (volumeInfo.authors && volumeInfo.authors.length > 0) {
    score += 50
  } else {
    return 0 // Disqualify results without authors
  }

  // Title similarity (0-30 points)
  const similarity = titleSimilarity(searchTitle, volumeInfo.title)
  score += similarity * 30

  // Recent publication year bonus (0-15 points)
  if (volumeInfo.publishedDate) {
    const year = parseInt(volumeInfo.publishedDate.substring(0, 4))
    if (!isNaN(year)) {
      if (year >= 2020) score += 15
      else if (year >= 2010) score += 10
      else if (year >= 2000) score += 5
    }
  }

  // Has description (5 points)
  if (volumeInfo.description) score += 5

  // Has ISBN (5 points)
  if (volumeInfo.industryIdentifiers?.some(id => id.type.includes('ISBN'))) score += 5

  // Has page count and it's reasonable for a book (0-5 points)
  if (volumeInfo.pageCount) {
    if (volumeInfo.pageCount >= 100 && volumeInfo.pageCount <= 1500) score += 5
    else if (volumeInfo.pageCount >= 50) score += 2
  }

  // Has ratings - prefer books with community feedback (0-10 points)
  if (volumeInfo.averageRating && volumeInfo.ratingsCount) {
    score += 5 // Has ratings at all
    if (volumeInfo.ratingsCount >= 10) score += 3 // More than 10 ratings
    if (volumeInfo.ratingsCount >= 100) score += 2 // More than 100 ratings
  }

  return score
}

/**
 * Search Google Books API by title
 */
async function searchGoogleBooks(title: string, author?: string): Promise<BookMetadata | null> {
  try {
    // Build search query
    let query = `intitle:${encodeURIComponent(title)}`
    if (author) {
      query += `+inauthor:${encodeURIComponent(author)}`
    }

    const url = `${GOOGLE_BOOKS_API}?q=${query}&maxResults=10&printType=books`
    console.log(`[BookMetadata] Searching Google Books: ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[BookMetadata] Google Books API error: ${response.status}`)
      return null
    }

    const data: GoogleBooksResponse = await response.json()

    if (!data.items || data.items.length === 0) {
      console.log(`[BookMetadata] No results found for: ${title}`)
      return null
    }

    // Score all results and find the best match
    const scoredResults = data.items.map(item => ({
      volumeInfo: item.volumeInfo,
      score: scoreGoogleBooksResult(item.volumeInfo, title)
    }))

    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score)

    // Log scoring for debugging
    console.log(`[BookMetadata] Scored ${scoredResults.length} results for "${title}":`)
    scoredResults.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i + 1}. "${r.volumeInfo.title}" by ${r.volumeInfo.authors?.join(', ') || 'Unknown'} (${r.volumeInfo.publishedDate || 'no date'}) - Score: ${r.score}`)
    })

    // Only accept results with a minimum score (must have author)
    const bestMatch = scoredResults[0]
    if (bestMatch.score < 50) {
      console.log(`[BookMetadata] Best match score ${bestMatch.score} below threshold for: ${title}`)
      return null
    }

    const volumeInfo = bestMatch.volumeInfo

    // Extract ISBNs
    let isbn10: string | undefined
    let isbn13: string | undefined
    if (volumeInfo.industryIdentifiers) {
      for (const id of volumeInfo.industryIdentifiers) {
        if (id.type === 'ISBN_10') isbn10 = id.identifier
        if (id.type === 'ISBN_13') isbn13 = id.identifier
      }
    }

    return {
      title: volumeInfo.title + (volumeInfo.subtitle ? `: ${volumeInfo.subtitle}` : ''),
      author: volumeInfo.authors?.join(', '),
      description: volumeInfo.description,
      publisher: volumeInfo.publisher,
      publishedDate: volumeInfo.publishedDate,
      pageCount: volumeInfo.pageCount,
      language: volumeInfo.language,
      isbn10,
      isbn13,
      categories: volumeInfo.categories,
      imageLinks: volumeInfo.imageLinks ? {
        thumbnail: volumeInfo.imageLinks.thumbnail?.replace('http://', 'https://'),
        small: volumeInfo.imageLinks.small?.replace('http://', 'https://'),
        medium: volumeInfo.imageLinks.medium?.replace('http://', 'https://'),
        large: volumeInfo.imageLinks.large?.replace('http://', 'https://'),
      } : undefined,
      // Include Google Books ratings if available
      averageRating: volumeInfo.averageRating,
      ratingsCount: volumeInfo.ratingsCount
    }
  } catch (error) {
    console.error('[BookMetadata] Google Books search failed:', error)
    return null
  }
}

// Open Library API (fallback)
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'
const OPEN_LIBRARY_RATINGS = 'https://openlibrary.org/works'

interface OpenLibraryRatingsResponse {
  summary: {
    average: number
    count: number
  }
  counts?: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

interface OpenLibrarySearchResponse {
  numFound: number
  docs: Array<{
    key: string // e.g., "/works/OL12345W"
    title: string
    author_name?: string[]
    publisher?: string[]
    first_publish_year?: number
    number_of_pages_median?: number
    isbn?: string[]
    language?: string[]
    subject?: string[]
    cover_i?: number
    ratings_average?: number
    ratings_count?: number
  }>
}

/**
 * Fetch ratings from Open Library using Work ID
 */
export async function getOpenLibraryRatings(workId: string): Promise<{ rating: number; count: number } | null> {
  try {
    // workId should be like "OL12345W" or "/works/OL12345W"
    const cleanId = workId.replace('/works/', '')
    const url = `${OPEN_LIBRARY_RATINGS}/${cleanId}/ratings.json`

    console.log(`[BookMetadata] Fetching Open Library ratings: ${url}`)

    const response = await fetch(url, {
      headers: { 'User-Agent': 'BookPost/1.0 (+https://bookpost.app)' }
    })

    if (!response.ok) {
      console.log(`[BookMetadata] Open Library ratings not found for ${cleanId}`)
      return null
    }

    const data: OpenLibraryRatingsResponse = await response.json()

    if (data.summary && data.summary.count > 0) {
      return {
        rating: data.summary.average,
        count: data.summary.count
      }
    }

    return null
  } catch (error) {
    console.error('[BookMetadata] Open Library ratings fetch failed:', error)
    return null
  }
}

/**
 * Search Open Library and get ratings
 */
export async function searchOpenLibraryWithRatings(title: string, author?: string): Promise<{
  metadata: BookMetadata
  rating?: number
  ratingCount?: number
  workId?: string
} | null> {
  try {
    // Build search query with title and optionally author
    let query = `title=${encodeURIComponent(title)}`
    if (author) {
      query += `&author=${encodeURIComponent(author)}`
    }

    const url = `${OPEN_LIBRARY_SEARCH}?${query}&limit=10&fields=key,title,author_name,publisher,first_publish_year,number_of_pages_median,isbn,language,subject,cover_i,ratings_average,ratings_count`
    console.log(`[BookMetadata] Searching Open Library with ratings: ${url}`)

    const response = await fetch(url, {
      headers: { 'User-Agent': 'BookPost/1.0 (+https://bookpost.app)' }
    })

    if (!response.ok) {
      console.error(`[BookMetadata] Open Library API error: ${response.status}`)
      return null
    }

    const data: OpenLibrarySearchResponse = await response.json()

    if (data.numFound === 0 || !data.docs.length) {
      console.log(`[BookMetadata] No Open Library results for: ${title}`)
      return null
    }

    // Score results and prefer ones with ratings
    const scoredResults = data.docs.map(doc => {
      let score = scoreOpenLibraryResult(doc as any, title)
      // Bonus for having ratings
      if (doc.ratings_count && doc.ratings_count > 0) {
        score += 10
        if (doc.ratings_count >= 10) score += 5
        if (doc.ratings_count >= 100) score += 5
      }
      return { doc, score }
    })

    scoredResults.sort((a, b) => b.score - a.score)

    const bestMatch = scoredResults[0]
    if (bestMatch.score < 50) {
      return null
    }

    const book = bestMatch.doc

    // Get cover image if available
    const imageLinks = book.cover_i ? {
      thumbnail: `https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`,
      small: `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`,
      medium: `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`,
    } : undefined

    // Try to get more accurate ratings from the dedicated endpoint
    let rating = book.ratings_average
    let ratingCount = book.ratings_count

    if (book.key && (!rating || ratingCount === 0)) {
      const dedicatedRatings = await getOpenLibraryRatings(book.key)
      if (dedicatedRatings) {
        rating = dedicatedRatings.rating
        ratingCount = dedicatedRatings.count
      }
    }

    return {
      metadata: {
        title: book.title,
        author: book.author_name?.join(', '),
        publisher: book.publisher?.[0],
        publishedDate: book.first_publish_year?.toString(),
        pageCount: book.number_of_pages_median,
        language: book.language?.[0],
        isbn13: book.isbn?.find(i => i.length === 13),
        isbn10: book.isbn?.find(i => i.length === 10),
        categories: book.subject?.slice(0, 5),
        imageLinks,
        averageRating: rating,
        ratingsCount: ratingCount
      },
      rating,
      ratingCount,
      workId: book.key
    }
  } catch (error) {
    console.error('[BookMetadata] Open Library search with ratings failed:', error)
    return null
  }
}

interface OpenLibraryResponse {
  numFound: number
  docs: Array<{
    title: string
    author_name?: string[]
    publisher?: string[]
    first_publish_year?: number
    number_of_pages_median?: number
    isbn?: string[]
    language?: string[]
    subject?: string[]
    cover_i?: number
  }>
}

/**
 * Score an Open Library result for relevance
 */
function scoreOpenLibraryResult(doc: OpenLibraryResponse['docs'][0], searchTitle: string): number {
  let score = 0

  // Must have authors - this is critical for our use case
  if (doc.author_name && doc.author_name.length > 0) {
    score += 50
  } else {
    return 0 // Disqualify results without authors
  }

  // Title similarity (0-30 points)
  const similarity = titleSimilarity(searchTitle, doc.title)
  score += similarity * 30

  // Recent publication year bonus (0-15 points)
  if (doc.first_publish_year) {
    if (doc.first_publish_year >= 2020) score += 15
    else if (doc.first_publish_year >= 2010) score += 10
    else if (doc.first_publish_year >= 2000) score += 5
  }

  // Has ISBN (5 points)
  if (doc.isbn && doc.isbn.length > 0) score += 5

  // Has page count and it's reasonable (0-5 points)
  if (doc.number_of_pages_median) {
    if (doc.number_of_pages_median >= 100 && doc.number_of_pages_median <= 1500) score += 5
    else if (doc.number_of_pages_median >= 50) score += 2
  }

  return score
}

/**
 * Search Open Library API by title
 */
async function searchOpenLibrary(title: string): Promise<BookMetadata | null> {
  try {
    const url = `${OPEN_LIBRARY_SEARCH}?title=${encodeURIComponent(title)}&limit=10`
    console.log(`[BookMetadata] Searching Open Library: ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[BookMetadata] Open Library API error: ${response.status}`)
      return null
    }

    const data: OpenLibraryResponse = await response.json()

    if (data.numFound === 0 || !data.docs.length) {
      console.log(`[BookMetadata] No Open Library results for: ${title}`)
      return null
    }

    // Score all results and find the best match
    const scoredResults = data.docs.map(doc => ({
      doc,
      score: scoreOpenLibraryResult(doc, title)
    }))

    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score)

    // Log scoring for debugging
    console.log(`[BookMetadata] Scored ${scoredResults.length} Open Library results for "${title}":`)
    scoredResults.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i + 1}. "${r.doc.title}" by ${r.doc.author_name?.join(', ') || 'Unknown'} (${r.doc.first_publish_year || 'no year'}) - Score: ${r.score}`)
    })

    // Only accept results with a minimum score (must have author)
    const bestMatch = scoredResults[0]
    if (bestMatch.score < 50) {
      console.log(`[BookMetadata] Best Open Library match score ${bestMatch.score} below threshold for: ${title}`)
      return null
    }

    const book = bestMatch.doc

    // Get cover image if available
    const imageLinks = book.cover_i ? {
      thumbnail: `https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`,
      small: `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`,
      medium: `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`,
    } : undefined

    return {
      title: book.title,
      author: book.author_name?.join(', '),
      publisher: book.publisher?.[0],
      publishedDate: book.first_publish_year?.toString(),
      pageCount: book.number_of_pages_median,
      language: book.language?.[0],
      isbn13: book.isbn?.find(i => i.length === 13),
      isbn10: book.isbn?.find(i => i.length === 10),
      categories: book.subject?.slice(0, 5),
      imageLinks
    }
  } catch (error) {
    console.error('[BookMetadata] Open Library search failed:', error)
    return null
  }
}

/**
 * Clean and normalize title for better search results
 */
function normalizeTitle(title: string): string {
  return title
    // Remove common file extensions
    .replace(/\.(epub|pdf|mobi|azw3?)$/i, '')
    // Remove leading numbers (like "1." or "01 -")
    .replace(/^\d+[\.\-\s]+/, '')
    // Remove underscores and multiple spaces
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    // Remove content in parentheses at the end (often edition info)
    .replace(/\s*\([^)]*\)\s*$/, '')
    // Remove content in brackets at the end
    .replace(/\s*\[[^\]]*\]\s*$/, '')
    .trim()
}

/**
 * Main enrichment function - enriches a single ebook
 */
export async function enrichEbookMetadata(ebookId: number): Promise<EnrichmentResult> {
  try {
    // Get ebook from database
    const [ebook] = await db.select().from(ebooks).where(eq(ebooks.id, ebookId)).limit(1)

    if (!ebook) {
      return { success: false, error: 'Ebook not found' }
    }

    // Normalize the title for search
    const searchTitle = normalizeTitle(ebook.title)
    console.log(`[BookMetadata] Enriching ebook ${ebookId}: "${ebook.title}" -> "${searchTitle}"`)

    // Try Google Books first
    let metadata = await searchGoogleBooks(searchTitle)
    let source: 'google_books' | 'open_library' = 'google_books'

    // Fallback to Open Library if Google Books fails
    if (!metadata) {
      metadata = await searchOpenLibrary(searchTitle)
      source = 'open_library'
    }

    if (!metadata) {
      return { success: false, error: 'No metadata found from any source' }
    }

    // Update database with enriched metadata
    const updateData: Record<string, unknown> = {}

    if (metadata.author && !ebook.author) {
      updateData.author = metadata.author
    }
    if (metadata.description && !ebook.description) {
      updateData.description = metadata.description
    }
    if (metadata.publisher && !ebook.publisher) {
      updateData.publisher = metadata.publisher
    }
    if (metadata.pageCount && !ebook.pageCount) {
      updateData.pageCount = metadata.pageCount
    }
    if (metadata.isbn13 || metadata.isbn10) {
      if (!ebook.isbn) {
        updateData.isbn = metadata.isbn13 || metadata.isbn10
      }
    }
    if (metadata.language) {
      // Map language codes
      const langMap: Record<string, string> = {
        'en': 'en',
        'zh': 'zh',
        'zh-CN': 'zh',
        'zh-TW': 'zh',
        'ja': 'ja',
        'ko': 'ko',
        'fr': 'fr',
        'de': 'de',
        'es': 'es',
      }
      const lang = langMap[metadata.language] || metadata.language
      if (lang !== ebook.language) {
        updateData.language = lang
      }
    }
    if (metadata.publishedDate) {
      // Try to parse the date
      try {
        const date = new Date(metadata.publishedDate)
        if (!isNaN(date.getTime()) && !ebook.publicationDate) {
          updateData.publicationDate = date.toISOString().split('T')[0]
        }
      } catch {
        // If date parsing fails, skip
      }
    }

    // Update external ratings if available (from Google Books)
    if (metadata.averageRating && metadata.ratingsCount) {
      updateData.externalRating = metadata.averageRating.toString()
      updateData.externalRatingsCount = metadata.ratingsCount
      updateData.externalRatingSource = source
    }

    // Only update if we have new data
    if (Object.keys(updateData).length > 0) {
      await db.update(ebooks).set(updateData).where(eq(ebooks.id, ebookId))
      console.log(`[BookMetadata] Updated ebook ${ebookId} with:`, Object.keys(updateData))
    } else {
      console.log(`[BookMetadata] No new data to update for ebook ${ebookId}`)
    }

    return {
      success: true,
      source,
      metadata
    }

  } catch (error) {
    console.error(`[BookMetadata] Failed to enrich ebook ${ebookId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Batch enrichment function - enriches multiple ebooks
 */
export async function enrichEbooksBatch(
  ebookIds: number[],
  options: { delayMs?: number; onProgress?: (processed: number, total: number) => void } = {}
): Promise<{ processed: number; succeeded: number; failed: number; results: Record<number, EnrichmentResult> }> {
  const { delayMs = 500, onProgress } = options
  const results: Record<number, EnrichmentResult> = {}
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < ebookIds.length; i++) {
    const ebookId = ebookIds[i]

    // Add delay between requests to avoid rate limiting
    if (i > 0 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    const result = await enrichEbookMetadata(ebookId)
    results[ebookId] = result

    if (result.success) {
      succeeded++
    } else {
      failed++
    }

    if (onProgress) {
      onProgress(i + 1, ebookIds.length)
    }
  }

  return {
    processed: ebookIds.length,
    succeeded,
    failed,
    results
  }
}

/**
 * Get ebooks that need enrichment (missing metadata)
 */
export async function getEbooksNeedingEnrichment(limit = 100): Promise<number[]> {
  const results = await db
    .select({ id: ebooks.id })
    .from(ebooks)
    .where(eq(ebooks.author, null as unknown as string))
    .limit(limit)

  return results.map(r => r.id)
}

/**
 * Re-enrich a single ebook specifically for ratings (forces update regardless of existing data)
 */
export async function enrichEbookRatings(ebookId: number): Promise<EnrichmentResult> {
  try {
    // Get ebook from database
    const [ebook] = await db.select().from(ebooks).where(eq(ebooks.id, ebookId)).limit(1)

    if (!ebook) {
      return { success: false, error: 'Ebook not found' }
    }

    // Normalize the title for search
    const searchTitle = normalizeTitle(ebook.title)
    console.log(`[BookMetadata] Re-enriching ratings for ebook ${ebookId}: "${ebook.title}"`)

    // Try Google Books first
    const googleMetadata = await searchGoogleBooks(searchTitle, ebook.author || undefined)

    if (googleMetadata?.averageRating && googleMetadata?.ratingsCount) {
      await db.update(ebooks).set({
        externalRating: googleMetadata.averageRating.toString(),
        externalRatingsCount: googleMetadata.ratingsCount,
        externalRatingSource: 'google_books'
      }).where(eq(ebooks.id, ebookId))

      console.log(`[BookMetadata] Updated ratings from Google Books for ebook ${ebookId}: ${googleMetadata.averageRating}/5 (${googleMetadata.ratingsCount} ratings)`)

      return {
        success: true,
        source: 'google_books',
        metadata: googleMetadata
      }
    }

    // Fallback to Open Library if Google Books has no ratings
    console.log(`[BookMetadata] No Google Books ratings, trying Open Library for ebook ${ebookId}`)
    const openLibraryResult = await searchOpenLibraryWithRatings(searchTitle, ebook.author || undefined)

    if (openLibraryResult?.rating && openLibraryResult?.ratingCount) {
      await db.update(ebooks).set({
        externalRating: openLibraryResult.rating.toString(),
        externalRatingsCount: openLibraryResult.ratingCount,
        externalRatingSource: 'open_library'
      }).where(eq(ebooks.id, ebookId))

      console.log(`[BookMetadata] Updated ratings from Open Library for ebook ${ebookId}: ${openLibraryResult.rating}/5 (${openLibraryResult.ratingCount} ratings)`)

      return {
        success: true,
        source: 'open_library',
        metadata: openLibraryResult.metadata
      }
    }

    // Mark as checked so we don't re-process this book
    await db.update(ebooks).set({
      externalRatingSource: 'none'
    }).where(eq(ebooks.id, ebookId))

    return { success: false, error: 'No ratings available from Google Books or Open Library' }

  } catch (error) {
    console.error(`[BookMetadata] Failed to enrich ratings for ebook ${ebookId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Batch re-enrichment for ratings
 */
export async function enrichRatingsBatch(
  ebookIds: number[],
  options: { delayMs?: number; onProgress?: (processed: number, total: number) => void } = {}
): Promise<{ processed: number; succeeded: number; failed: number; results: Record<number, EnrichmentResult> }> {
  const { delayMs = 500, onProgress } = options
  const results: Record<number, EnrichmentResult> = {}
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < ebookIds.length; i++) {
    const ebookId = ebookIds[i]

    // Add delay between requests to avoid rate limiting
    if (i > 0 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    const result = await enrichEbookRatings(ebookId)
    results[ebookId] = result

    if (result.success) {
      succeeded++
    } else {
      failed++
    }

    if (onProgress) {
      onProgress(i + 1, ebookIds.length)
    }
  }

  return {
    processed: ebookIds.length,
    succeeded,
    failed,
    results
  }
}
