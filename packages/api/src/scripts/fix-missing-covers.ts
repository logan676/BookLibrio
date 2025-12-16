/**
 * Fix Missing Covers Script
 * Fetches covers for books that are missing them
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { execSync } from 'child_process'
import { ebooks, ebookCategories } from '../db/schema'
import { eq, sql } from 'drizzle-orm'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const db = drizzle(pool)

const categorySlug = process.argv[2] || 'artificial-intelligence'

/**
 * Search Google Books for cover
 */
function searchGoogleBooksCover(title: string, author?: string): string | null {
  try {
    const cleanTitle = title
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50)

    let query = `intitle:${encodeURIComponent(cleanTitle)}`
    if (author && author !== 'Unknown') {
      const cleanAuthor = author.split(/[,;]/)[0].trim()
      query += `+inauthor:${encodeURIComponent(cleanAuthor)}`
    }

    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=3`
    const response = execSync(`curl -s "${url}"`, { encoding: 'utf-8', timeout: 10000 })
    const data = JSON.parse(response)

    if (data.items?.[0]?.volumeInfo?.imageLinks) {
      const links = data.items[0].volumeInfo.imageLinks
      const coverUrl = links.large || links.medium || links.small || links.thumbnail
      if (coverUrl) {
        return coverUrl.replace('http://', 'https://').replace('zoom=1', 'zoom=0')
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Search OpenLibrary for cover
 */
function searchOpenLibraryCover(title: string): string | null {
  try {
    const cleanTitle = title.replace(/[^\w\s]/g, ' ').trim()
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&limit=1`
    const response = execSync(`curl -s "${url}"`, { encoding: 'utf-8', timeout: 10000 })
    const data = JSON.parse(response)

    if (data.docs?.[0]?.cover_i) {
      return `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-L.jpg`
    }
    return null
  } catch {
    return null
  }
}

/**
 * Search Douban for cover (Chinese books)
 */
function searchDoubanCover(title: string): string | null {
  try {
    // Extract main title
    const mainTitle = title
      .replace(/[（(][^)）]*[)）]/g, '')
      .replace(/[:：].*$/, '')
      .trim()

    const url = `https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(mainTitle)}`
    const response = execSync(`curl -s "${url}"`, { encoding: 'utf-8', timeout: 10000 })
    const data = JSON.parse(response)

    if (data?.[0]?.pic) {
      // Convert to large image
      return data[0].pic.replace('/s/', '/l/')
    }
    return null
  } catch {
    return null
  }
}

/**
 * Generate placeholder cover URL using a book cover API
 */
function generatePlaceholderCover(title: string): string {
  // Use a simple placeholder service
  const encodedTitle = encodeURIComponent(title.substring(0, 30))
  return `https://placehold.co/300x450/333/fff?text=${encodedTitle}`
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              FIX MISSING COVERS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Category: ${categorySlug}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Get category
  const [category] = await db
    .select()
    .from(ebookCategories)
    .where(eq(ebookCategories.slug, categorySlug))

  if (!category) {
    console.error(`Category not found: ${categorySlug}`)
    await pool.end()
    return
  }

  // Find books without covers
  const booksWithoutCovers = await db
    .select()
    .from(ebooks)
    .where(sql`category_id = ${category.id} AND (cover_url IS NULL OR cover_url = '')`)

  console.log(`📚 Found ${booksWithoutCovers.length} books without covers\n`)

  let fixed = 0
  let failed = 0

  for (const book of booksWithoutCovers) {
    console.log(`\n[${fixed + failed + 1}/${booksWithoutCovers.length}] 📖 ${book.title.substring(0, 50)}...`)

    let coverUrl: string | null = null

    // Try Google Books
    console.log('  → Trying Google Books...')
    coverUrl = searchGoogleBooksCover(book.title, book.author || undefined)

    // Try OpenLibrary
    if (!coverUrl) {
      console.log('  → Trying OpenLibrary...')
      coverUrl = searchOpenLibraryCover(book.title)
    }

    // Try Douban for Chinese titles
    if (!coverUrl && /[\u4e00-\u9fff]/.test(book.title)) {
      console.log('  → Trying Douban...')
      coverUrl = searchDoubanCover(book.title)
    }

    if (coverUrl) {
      console.log(`  ✅ Found cover`)
      await db.update(ebooks).set({ coverUrl }).where(eq(ebooks.id, book.id))
      fixed++
    } else {
      console.log('  ❌ No cover found from any source')
      failed++
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                         SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`✅ Fixed: ${fixed}`)
  console.log(`❌ Not found: ${failed}`)
  console.log('═══════════════════════════════════════════════════════════════')

  await pool.end()
}

main().catch(async (err) => {
  console.error('Error:', err)
  await pool.end()
  process.exit(1)
})
