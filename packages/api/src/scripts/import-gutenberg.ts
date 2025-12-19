/**
 * Import Public Domain Books from Project Gutenberg
 *
 * This script:
 * 1. Downloads the Gutenberg catalog
 * 2. Extracts book metadata
 * 3. Downloads EPUB files
 * 4. Uploads to Cloudflare R2
 * 5. Creates ebook records in the database
 *
 * Gutenberg has ~70,000 public domain books available.
 *
 * Run with:
 *   npx tsx src/scripts/import-gutenberg.ts [options]
 *
 * Options:
 *   --dry-run              Preview without saving
 *   --limit=N              Limit to N books (default: 100 for testing)
 *   --offset=N             Start from book N (for resuming)
 *   --language=en          Filter by language (default: en)
 *   --category=slug        Assign to specific category
 *   --skip-existing        Skip books already in database
 *   --concurrency=N        Parallel downloads (default: 5)
 *
 * Examples:
 *   npx tsx src/scripts/import-gutenberg.ts --limit=10 --dry-run
 *   npx tsx src/scripts/import-gutenberg.ts --limit=1000 --language=en
 *   npx tsx src/scripts/import-gutenberg.ts --offset=1000 --limit=500
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks, ebookCategories, bookCategories } from '../db/schema'
import { eq, ilike, and, sql } from 'drizzle-orm'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
})
const db = drizzle(pool)

// R2 Client
const r2Client = process.env.R2_ACCOUNT_ID ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
}) : null

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bookpost-media'
const API_BASE_URL = process.env.API_BASE_URL || 'https://booklibrio-api.fly.dev'

// Gutenberg URLs
const GUTENBERG_CATALOG_URL = 'https://www.gutenberg.org/cache/epub/feeds/rdf-files.tar.bz2'
const GUTENBERG_MIRROR = 'https://www.gutenberg.org'

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipExisting = args.includes('--skip-existing')
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '100')
const offset = parseInt(args.find(a => a.startsWith('--offset='))?.split('=')[1] || '0')
const language = args.find(a => a.startsWith('--language='))?.split('=')[1] || 'en'
const categorySlug = args.find(a => a.startsWith('--category='))?.split('=')[1] || 'public-domain'
const concurrency = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '5')

interface GutenbergBook {
  id: number
  title: string
  author: string
  language: string
  subjects: string[]
  downloads: number
  epubUrl?: string
  coverUrl?: string
}

/**
 * Fetch Gutenberg catalog using their JSON API
 * Note: Gutenberg provides a JSON API for browsing books
 */
async function fetchGutenbergBooks(page: number = 1, lang: string = 'en'): Promise<{ books: GutenbergBook[], hasMore: boolean }> {
  const url = `https://gutendex.com/books/?page=${page}&languages=${lang}`

  console.log(`  Fetching page ${page}...`)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'BookLibrio/1.0 (https://booklibrio.com)',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch catalog: ${response.status}`)
  }

  const data = await response.json()

  const books: GutenbergBook[] = data.results.map((book: any) => {
    // Find EPUB URL (prefer epub.images, then epub.noimages)
    let epubUrl = book.formats['application/epub+zip']
    if (!epubUrl) {
      epubUrl = book.formats['application/epub+zip; charset=utf-8']
    }

    // Find cover URL
    const coverUrl = book.formats['image/jpeg']

    // Get author name
    const author = book.authors?.[0]?.name || 'Unknown'

    return {
      id: book.id,
      title: book.title,
      author,
      language: book.languages?.[0] || lang,
      subjects: book.subjects || [],
      downloads: book.download_count || 0,
      epubUrl,
      coverUrl,
    }
  })

  return {
    books,
    hasMore: !!data.next,
  }
}

/**
 * Download file with retry logic
 */
async function downloadFile(url: string, retries = 3): Promise<Buffer | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'BookLibrio/1.0 (https://booklibrio.com)',
        },
      })

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`HTTP ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      console.log(`    Retry ${i + 1}/${retries}: ${error instanceof Error ? error.message : error}`)
      if (i === retries - 1) return null
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
  return null
}

/**
 * Upload file to R2
 */
async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string | null> {
  if (!r2Client || dryRun) {
    console.log(`    [${dryRun ? 'DRY RUN' : 'NO R2'}] Would upload: ${key}`)
    return `${API_BASE_URL}/api/r2/${key}`
  }

  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }))
    return `${API_BASE_URL}/api/r2/${key}`
  } catch (error) {
    console.error(`    R2 upload failed: ${error instanceof Error ? error.message : error}`)
    return null
  }
}

/**
 * Check if book exists in database
 */
async function bookExists(gutenbergId: number): Promise<boolean> {
  const [existing] = await db
    .select({ id: ebooks.id })
    .from(ebooks)
    .where(eq(ebooks.externalId, `gutenberg:${gutenbergId}`))
    .limit(1)
  return !!existing
}

/**
 * Get category ID
 */
async function getCategoryId(slug: string): Promise<number | null> {
  const [category] = await db
    .select()
    .from(ebookCategories)
    .where(eq(ebookCategories.slug, slug))
    .limit(1)
  return category?.id || null
}

/**
 * Create public-domain category if it doesn't exist
 */
async function ensureCategory(): Promise<number> {
  let [category] = await db
    .select()
    .from(ebookCategories)
    .where(eq(ebookCategories.slug, 'public-domain'))
    .limit(1)

  if (!category && !dryRun) {
    [category] = await db.insert(ebookCategories).values({
      name: 'Public Domain',
      slug: 'public-domain',
      description: 'Classic books in the public domain from Project Gutenberg',
    }).returning()
    console.log(`  Created category: Public Domain (ID: ${category.id})`)
  }

  return category?.id || 0
}

/**
 * Process a single book
 */
async function processBook(book: GutenbergBook, categoryId: number): Promise<{ success: boolean; skipped?: boolean }> {
  console.log(`\n[${book.id}] ${book.title}`)
  console.log(`    Author: ${book.author}`)

  // Check if already exists
  if (skipExisting) {
    const exists = await bookExists(book.id)
    if (exists) {
      console.log(`    Skipped: Already in database`)
      return { success: true, skipped: true }
    }
  }

  // Skip if no EPUB available
  if (!book.epubUrl) {
    console.log(`    Skipped: No EPUB available`)
    return { success: true, skipped: true }
  }

  // Generate R2 keys
  const sanitizedTitle = book.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
  const epubKey = `ebooks/gutenberg/${book.id}_${sanitizedTitle}.epub`
  const coverKey = `covers/ebooks/gutenberg/${book.id}_${sanitizedTitle}.jpg`

  if (dryRun) {
    console.log(`    [DRY RUN] Would process:`)
    console.log(`      - EPUB: ${book.epubUrl}`)
    console.log(`      - Cover: ${book.coverUrl || 'N/A'}`)
    console.log(`      - R2 Key: ${epubKey}`)
    return { success: true }
  }

  // Download EPUB
  console.log(`    Downloading EPUB...`)
  const epubBuffer = await downloadFile(book.epubUrl)
  if (!epubBuffer) {
    console.log(`    Failed: Could not download EPUB`)
    return { success: false }
  }
  console.log(`    Downloaded: ${(epubBuffer.length / 1024 / 1024).toFixed(2)} MB`)

  // Upload EPUB to R2
  const epubUrl = await uploadToR2(epubKey, epubBuffer, 'application/epub+zip')
  if (!epubUrl) {
    return { success: false }
  }
  console.log(`    Uploaded EPUB to R2`)

  // Download and upload cover if available
  let coverUrl: string | null = null
  if (book.coverUrl) {
    const coverBuffer = await downloadFile(book.coverUrl)
    if (coverBuffer) {
      coverUrl = await uploadToR2(coverKey, coverBuffer, 'image/jpeg')
      if (coverUrl) {
        console.log(`    Uploaded cover to R2`)
      }
    }
  }

  // Create ebook record
  const [insertedEbook] = await db.insert(ebooks).values({
    title: book.title,
    author: book.author,
    language: book.language,
    description: book.subjects.join(', '),
    categoryId,
    s3Key: epubKey,
    filePath: epubUrl,
    fileSize: epubBuffer.length,
    fileType: 'epub',
    coverUrl,
    paymentType: 'free',
    externalId: `gutenberg:${book.id}`,
    externalSource: 'gutenberg',
    externalUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
  }).returning()

  console.log(`    Created ebook record: ID ${insertedEbook.id}`)

  // Create book-category relationship
  if (categoryId) {
    await db.insert(bookCategories).values({
      bookId: insertedEbook.id,
      bookType: 'ebook',
      categoryId,
      isPrimary: true,
    }).onConflictDoNothing()
  }

  return { success: true }
}

/**
 * Process books with concurrency control
 */
async function processWithConcurrency(
  books: GutenbergBook[],
  categoryId: number,
  maxConcurrent: number
): Promise<{ success: number; failed: number; skipped: number }> {
  let success = 0
  let failed = 0
  let skipped = 0

  // Process in batches
  for (let i = 0; i < books.length; i += maxConcurrent) {
    const batch = books.slice(i, i + maxConcurrent)

    const results = await Promise.all(
      batch.map(book => processBook(book, categoryId))
    )

    for (const result of results) {
      if (result.skipped) {
        skipped++
      } else if (result.success) {
        success++
      } else {
        failed++
      }
    }

    // Progress update
    const processed = i + batch.length
    console.log(`\n--- Progress: ${processed}/${books.length} (${Math.round(processed / books.length * 100)}%) ---\n`)

    // Small delay between batches to be polite to Gutenberg servers
    if (i + maxConcurrent < books.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  return { success, failed, skipped }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('        IMPORT PUBLIC DOMAIN BOOKS FROM GUTENBERG')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`R2 configured: ${!!r2Client}`)
  console.log(`Language: ${language}`)
  console.log(`Limit: ${limit}`)
  console.log(`Offset: ${offset}`)
  console.log(`Concurrency: ${concurrency}`)
  console.log(`Skip existing: ${skipExisting}`)
  console.log('═══════════════════════════════════════════════════════════════')

  // Ensure category exists
  const categoryId = await ensureCategory()
  console.log(`\nUsing category ID: ${categoryId}`)

  // Fetch books from Gutenberg API
  console.log('\nFetching book catalog from Gutenberg...')

  const allBooks: GutenbergBook[] = []
  let page = Math.floor(offset / 32) + 1  // Gutenberg API returns 32 books per page
  let skipCount = offset % 32

  while (allBooks.length < limit) {
    const { books, hasMore } = await fetchGutenbergBooks(page, language)

    // Skip books based on offset within the page
    const booksToAdd = skipCount > 0 ? books.slice(skipCount) : books
    skipCount = 0

    // Add books up to the limit
    const remaining = limit - allBooks.length
    allBooks.push(...booksToAdd.slice(0, remaining))

    if (!hasMore || allBooks.length >= limit) break
    page++

    // Small delay between API calls
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\nFound ${allBooks.length} books to process`)

  if (allBooks.length === 0) {
    console.log('\nNo books to process.')
    await pool.end()
    process.exit(0)
  }

  // Filter books that have EPUB available
  const booksWithEpub = allBooks.filter(b => b.epubUrl)
  console.log(`Books with EPUB available: ${booksWithEpub.length}`)

  // Process books
  const results = await processWithConcurrency(booksWithEpub, categoryId, concurrency)

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                         SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`✅ Imported: ${results.success}`)
  console.log(`⏭️ Skipped: ${results.skipped}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to actually import.\n')
  }

  // Show next offset for resuming
  const nextOffset = offset + results.success + results.skipped + results.failed
  console.log(`\n💡 To continue from where you left off, use: --offset=${nextOffset}\n`)

  await pool.end()
  process.exit(0)
}

main().catch(async (error) => {
  console.error('❌ Error:', error)
  await pool.end()
  process.exit(1)
})
