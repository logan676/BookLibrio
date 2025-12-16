/**
 * Enrich Ebooks Metadata Script
 * Fetches metadata from multiple sources: Google Books, OpenLibrary, Douban, AI
 *
 * Run with:
 *   npx tsx src/scripts/enrich-ebooks-metadata.ts [options]
 *
 * Options:
 *   --dry-run           Preview without saving
 *   --category=slug     Only enrich books in specific category
 *   --limit=N           Limit to N books
 *   --missing-only      Only enrich books missing descriptions or covers
 *   --aggressive        Try multiple search strategies (Google, Douban, OpenLibrary)
 *   --use-ai            Use DeepSeek AI to generate descriptions for unfound books
 *
 * Environment:
 *   DEEPSEEK_API_KEY    Required for --use-ai option
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { execSync } from 'child_process'
import * as fs from 'fs'
import { ebooks, ebookCategories } from '../db/schema'
import { eq, isNull, or, sql, and } from 'drizzle-orm'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const db = drizzle(pool)

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const missingOnly = args.includes('--missing-only')
const aggressive = args.includes('--aggressive')
const useAI = args.includes('--use-ai')
const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1]
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0')

// API endpoints
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes'
const OPEN_LIBRARY_API = 'https://openlibrary.org/search.json'
const DOUBAN_SEARCH_API = 'https://www.douban.com/j/search' // Douban search endpoint

// AI API (DeepSeek - OpenAI compatible)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

interface GoogleBookInfo {
  title?: string
  authors?: string[]
  description?: string
  publisher?: string
  publishedDate?: string
  pageCount?: number
  categories?: string[]
  imageLinks?: {
    thumbnail?: string
    smallThumbnail?: string
    small?: string
    medium?: string
    large?: string
  }
  industryIdentifiers?: Array<{ type: string; identifier: string }>
  language?: string
}

/**
 * Make HTTPS GET request using curl
 */
function httpsGet(url: string): string {
  try {
    const result = execSync(`curl -s "${url}"`, {
      encoding: 'utf-8',
      timeout: 10000,
    })
    return result
  } catch (error) {
    throw new Error(`curl failed: ${error}`)
  }
}

/**
 * Extract main title from Chinese title (before parentheses)
 */
function extractMainTitle(title: string): string {
  // Remove content in parentheses (Chinese and English)
  let main = title
    .replace(/[（(][^)）]*[)）]/g, '')
    .replace(/[:：].*$/, '') // Remove subtitle after colon
    .trim()
  return main || title
}

/**
 * Search Google Books API
 */
function searchGoogleBooks(title: string, author?: string): GoogleBookInfo | null {
  try {
    // Clean title for search (remove special chars, limit length)
    const cleanTitle = title
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50)

    // Build search query
    let query = `intitle:${encodeURIComponent(cleanTitle)}`
    if (author && author !== 'Unknown' && !/[\u4e00-\u9fff]/.test(author)) {
      // Only add author if it's not Chinese
      const cleanAuthor = author.split(/[,;]/)[0].trim() // Take first author
      query += `+inauthor:${encodeURIComponent(cleanAuthor)}`
    }

    const url = `${GOOGLE_BOOKS_API}?q=${query}&maxResults=3`
    const responseText = httpsGet(url)
    const data = JSON.parse(responseText)

    if (!data.items || data.items.length === 0) {
      return null
    }

    // Find best match
    const item = data.items[0]
    return item.volumeInfo as GoogleBookInfo
  } catch (error) {
    console.error(`  ❌ Error searching Google Books: ${error}`)
    return null
  }
}

/**
 * Search Douban for Chinese books
 */
function searchDouban(title: string, author?: string): GoogleBookInfo | null {
  try {
    // Extract main title for Chinese books
    const mainTitle = extractMainTitle(title)
    const searchQuery = encodeURIComponent(mainTitle)

    // Use Douban's search API
    const url = `https://book.douban.com/j/subject_suggest?q=${searchQuery}`
    const responseText = httpsGet(url)
    const data = JSON.parse(responseText)

    if (!data || data.length === 0) {
      return null
    }

    // Find best match
    const book = data[0]

    // Now fetch book detail page for description
    const detailUrl = `https://book.douban.com/subject/${book.id}/`
    let description = ''

    try {
      const detailHtml = httpsGet(detailUrl)
      // Extract description from HTML (简介/内容简介)
      const introMatch = detailHtml.match(/class="intro"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i)
      if (introMatch) {
        description = introMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
      }
    } catch {}

    const result: GoogleBookInfo = {
      title: book.title,
      authors: book.author ? [book.author] : undefined,
      description: description || undefined,
      publisher: book.publisher,
    }

    // Get cover
    if (book.pic) {
      result.imageLinks = {
        thumbnail: book.pic,
        medium: book.pic.replace('/s/', '/l/'),
      }
    }

    return result
  } catch (error) {
    return null
  }
}

/**
 * Generate description using AI (DeepSeek)
 */
async function generateDescriptionWithAI(title: string, author?: string): Promise<string | null> {
  if (!DEEPSEEK_API_KEY) {
    console.log(`    ⚠️ DEEPSEEK_API_KEY not set`)
    return null
  }

  try {
    const prompt = `Generate a brief, informative book description (2-3 sentences, ~100-150 characters) for:

Title: ${title}
${author ? `Author: ${author}` : ''}

Write a concise description that captures what the book is likely about based on the title. Be factual and avoid marketing language. If the title is in Chinese, write the description in Chinese. If in English, write in English.

Return ONLY the description text, nothing else.`

    const requestBody = JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    })

    // Write request body to temp file to avoid shell escaping issues
    const tempFile = `/tmp/deepseek-request-${Date.now()}.json`
    fs.writeFileSync(tempFile, requestBody)

    const response = execSync(`curl -s "${DEEPSEEK_API_URL}" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${DEEPSEEK_API_KEY}" \
      -d @${tempFile}`, {
      encoding: 'utf-8',
      timeout: 30000,
    })

    // Clean up temp file
    try { fs.unlinkSync(tempFile) } catch {}

    const data = JSON.parse(response)
    if (data.choices?.[0]?.message?.content) {
      const desc = data.choices[0].message.content.trim()
      return desc.length > 20 ? desc : null
    }
    if (data.error) {
      console.error(`    DeepSeek error: ${data.error.message}`)
    }
    return null
  } catch (error) {
    console.error(`    AI generation failed: ${error}`)
    return null
  }
}

/**
 * Search OpenLibrary API (fallback)
 */
function searchOpenLibrary(title: string, author?: string): GoogleBookInfo | null {
  try {
    const cleanTitle = title
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50)

    let url = `${OPEN_LIBRARY_API}?title=${encodeURIComponent(cleanTitle)}&limit=3`
    if (author && author !== 'Unknown') {
      const cleanAuthor = author.split(/[,;]/)[0].trim()
      url += `&author=${encodeURIComponent(cleanAuthor)}`
    }

    const responseText = httpsGet(url)
    const data = JSON.parse(responseText)

    if (!data.docs || data.docs.length === 0) {
      return null
    }

    const doc = data.docs[0]

    // Convert OpenLibrary format to GoogleBookInfo format
    const result: GoogleBookInfo = {
      title: doc.title,
      authors: doc.author_name,
      description: doc.first_sentence?.join(' '),
      publisher: doc.publisher?.[0],
      publishedDate: doc.first_publish_year?.toString(),
    }

    // Get ISBN
    if (doc.isbn) {
      result.industryIdentifiers = doc.isbn.map((isbn: string) => ({
        type: isbn.length === 13 ? 'ISBN_13' : 'ISBN_10',
        identifier: isbn
      }))
    }

    // Get cover from OpenLibrary
    if (doc.cover_i) {
      result.imageLinks = {
        thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
        medium: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
      }
    }

    return result
  } catch (error) {
    return null
  }
}

/**
 * Check if title contains Chinese characters
 */
function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}

/**
 * Multi-strategy search for better coverage
 */
async function searchMultiStrategy(title: string, author?: string, isbn?: string): Promise<GoogleBookInfo | null> {
  // Strategy 1: Google Books with full title
  let result = searchGoogleBooks(title, author)
  if (result?.description) return result

  // Strategy 2: Google Books with main title only (for Chinese books with subtitles)
  const mainTitle = extractMainTitle(title)
  if (mainTitle !== title) {
    console.log(`    → Trying main title: ${mainTitle.substring(0, 30)}...`)
    result = searchGoogleBooks(mainTitle, author)
    if (result?.description) return result
  }

  // Strategy 3: Search by ISBN if available
  if (isbn) {
    console.log(`    → Trying ISBN: ${isbn}`)
    try {
      const url = `${GOOGLE_BOOKS_API}?q=isbn:${isbn}`
      const responseText = httpsGet(url)
      const data = JSON.parse(responseText)
      if (data.items?.[0]) {
        result = data.items[0].volumeInfo as GoogleBookInfo
        if (result?.description) return result
      }
    } catch {}
  }

  // Strategy 4: Douban for Chinese books
  if (hasChinese(title)) {
    console.log(`    → Trying Douban (豆瓣)...`)
    result = searchDouban(title, author)
    if (result?.description) return result
  }

  // Strategy 5: OpenLibrary fallback
  console.log(`    → Trying OpenLibrary...`)
  result = searchOpenLibrary(title, author)
  if (result?.description) return result

  // Strategy 6: OpenLibrary with main title
  if (mainTitle !== title) {
    result = searchOpenLibrary(mainTitle, author)
    if (result?.description) return result
  }

  // Strategy 7: AI generation (if enabled and no description found)
  if (useAI && !result?.description) {
    console.log(`    → Generating with AI...`)
    const aiDesc = await generateDescriptionWithAI(title, author)
    if (aiDesc) {
      return {
        ...result,
        description: aiDesc,
      }
    }
  }

  // Return whatever we found (even without description)
  return searchGoogleBooks(title, author) || searchOpenLibrary(title, author)
}

/**
 * Get high-res cover URL from Google Books
 */
function getBestCoverUrl(imageLinks?: GoogleBookInfo['imageLinks']): string | null {
  if (!imageLinks) return null

  // Prefer larger images
  const url = imageLinks.large || imageLinks.medium || imageLinks.small || imageLinks.thumbnail
  if (!url) return null

  // Convert to HTTPS and remove zoom parameter for higher quality
  return url.replace('http://', 'https://').replace('&edge=curl', '').replace('zoom=1', 'zoom=0')
}

/**
 * Clean description text
 */
function cleanDescription(desc?: string): string | null {
  if (!desc) return null

  // Remove HTML tags
  let clean = desc.replace(/<[^>]*>/g, ' ')
  // Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim()
  // Truncate if too long
  if (clean.length > 2000) {
    clean = clean.substring(0, 1997) + '...'
  }
  return clean
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              ENRICH EBOOKS METADATA')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Missing only: ${missingOnly}`)
  console.log(`Aggressive search: ${aggressive}`)
  console.log(`AI generation: ${useAI ? 'DeepSeek' : 'disabled'}`)
  if (categoryFilter) console.log(`Category filter: ${categoryFilter}`)
  if (limit > 0) console.log(`Limit: ${limit}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Build query conditions
  const conditions = []

  if (categoryFilter) {
    const [category] = await db
      .select()
      .from(ebookCategories)
      .where(eq(ebookCategories.slug, categoryFilter))
      .limit(1)

    if (!category) {
      console.error(`Category not found: ${categoryFilter}`)
      await pool.end()
      return
    }
    conditions.push(eq(ebooks.categoryId, category.id))
  }

  if (missingOnly) {
    conditions.push(
      or(
        isNull(ebooks.description),
        eq(ebooks.description, ''),
        isNull(ebooks.coverUrl),
        eq(ebooks.coverUrl, '')
      )
    )
  }

  // Fetch books to enrich
  let query = db.select().from(ebooks)
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any
  }
  if (limit > 0) {
    query = query.limit(limit) as any
  }

  const booksToEnrich = await query

  console.log(`📚 Found ${booksToEnrich.length} books to enrich\n`)

  let enrichedCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (let i = 0; i < booksToEnrich.length; i++) {
    const book = booksToEnrich[i]
    console.log(`\n[${i + 1}/${booksToEnrich.length}] 📖 ${book.title.substring(0, 50)}...`)

    // Skip if already has description and cover (unless forced)
    if (!missingOnly && book.description && book.coverUrl) {
      console.log(`  ⏭️ Already has metadata`)
      skippedCount++
      continue
    }

    // Search for metadata
    const googleInfo = aggressive
      ? await searchMultiStrategy(book.title, book.author || undefined, book.isbn || undefined)
      : searchGoogleBooks(book.title, book.author || undefined)

    if (!googleInfo) {
      console.log(`  ⚠️ No results from any source`)
      failedCount++
      // Add delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500))
      continue
    }

    // Prepare updates
    const updates: Partial<typeof book> = {}

    // Update description if missing
    if (!book.description || book.description === '') {
      const newDesc = cleanDescription(googleInfo.description)
      if (newDesc) {
        updates.description = newDesc
        console.log(`  ✅ Found description (${newDesc.length} chars)`)
      }
    }

    // Update cover if missing
    if (!book.coverUrl || book.coverUrl === '') {
      const newCover = getBestCoverUrl(googleInfo.imageLinks)
      if (newCover) {
        updates.coverUrl = newCover
        console.log(`  ✅ Found cover URL`)
      }
    }

    // Update publisher if missing
    if (!book.publisher && googleInfo.publisher) {
      updates.publisher = googleInfo.publisher
      console.log(`  ✅ Found publisher: ${googleInfo.publisher}`)
    }

    // Update ISBN if missing
    if (!book.isbn && googleInfo.industryIdentifiers) {
      const isbn = googleInfo.industryIdentifiers.find(
        id => id.type === 'ISBN_13' || id.type === 'ISBN_10'
      )
      if (isbn) {
        updates.isbn = isbn.identifier
        console.log(`  ✅ Found ISBN: ${isbn.identifier}`)
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log(`  ⏭️ No new data to update`)
      skippedCount++
      continue
    }

    // Apply updates
    if (!dryRun) {
      await db.update(ebooks).set(updates).where(eq(ebooks.id, book.id))
    }

    enrichedCount++

    // Rate limiting - 1 request per second
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                         SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`✅ Enriched: ${enrichedCount}`)
  console.log(`⏭️ Skipped: ${skippedCount}`)
  console.log(`❌ No results: ${failedCount}`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to save changes')
  }

  await pool.end()
}

main().catch(async (err) => {
  console.error('Error:', err)
  await pool.end()
  process.exit(1)
})
