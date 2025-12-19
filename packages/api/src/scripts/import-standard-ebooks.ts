/**
 * Import Premium Public Domain Books from Standard Ebooks
 *
 * Standard Ebooks (https://standardebooks.org) provides the highest quality
 * public domain ebooks with:
 * - Professional typography and formatting
 * - Carefully designed covers
 * - Semantic EPUB3 markup
 * - Accessibility features
 *
 * Run with:
 *   npx tsx src/scripts/import-standard-ebooks.ts [options]
 *
 * Options:
 *   --dry-run              Preview without saving
 *   --limit=N              Limit to N books (default: all)
 *   --skip-existing        Skip books already in database
 *   --category=slug        Assign to specific category (default: classics)
 *
 * Examples:
 *   npx tsx src/scripts/import-standard-ebooks.ts --dry-run
 *   npx tsx src/scripts/import-standard-ebooks.ts --limit=50
 *   npx tsx src/scripts/import-standard-ebooks.ts --skip-existing
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks, ebookCategories, bookCategories } from '../db/schema'
import { eq } from 'drizzle-orm'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

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

// Standard Ebooks OPDS feed
const OPDS_URL = 'https://standardebooks.org/feeds/opds'
const SE_BASE_URL = 'https://standardebooks.org'

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipExisting = args.includes('--skip-existing')
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0') || Infinity
const categorySlug = args.find(a => a.startsWith('--category='))?.split('=')[1] || 'classics'

interface StandardEbook {
  id: string
  title: string
  author: string
  description: string
  language: string
  subjects: string[]
  published: string
  modified: string
  epubUrl: string
  kindleUrl?: string
  coverUrl: string
  thumbnailUrl: string
  wordCount?: number
  readingTime?: string
  sourceUrl: string
}

/**
 * Parse OPDS XML feed
 */
function parseOPDS(xml: string): StandardEbook[] {
  const books: StandardEbook[] = []

  // Extract entries using regex (simple but effective for this feed)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1]

    // Extract fields
    const getId = (tag: string) => {
      const m = entry.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))
      return m ? m[1].trim() : ''
    }

    const getAttr = (tag: string, attr: string) => {
      const m = entry.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`))
      return m ? m[1] : ''
    }

    const getLink = (rel: string, type?: string) => {
      const typeFilter = type ? `type="${type}"` : ''
      const regex = new RegExp(`<link[^>]*rel="${rel}"[^>]*${typeFilter}[^>]*href="([^"]*)"[^>]*>`)
      const m = entry.match(regex)
      return m ? m[1] : ''
    }

    // Get all links
    const epubLink = getLink('http://opds-spec.org/acquisition/open-access', 'application/epub+zip')
      || getLink('http://opds-spec.org/acquisition', 'application/epub+zip')

    const coverLink = getLink('http://opds-spec.org/image')
    const thumbnailLink = getLink('http://opds-spec.org/image/thumbnail')

    // Extract ID from the ebook URL path
    const idMatch = entry.match(/href="\/ebooks\/([^"]+)"/)
    const id = idMatch ? idMatch[1] : ''

    if (!id || !epubLink) continue

    // Get title and author
    const title = getId('title')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')

    // Author might be in <author><name> or <dc:creator>
    let author = ''
    const authorMatch = entry.match(/<author>\s*<name>([^<]*)<\/name>/)
    if (authorMatch) {
      author = authorMatch[1].trim()
    } else {
      const creatorMatch = entry.match(/<dc:creator[^>]*>([^<]*)<\/dc:creator>/)
      if (creatorMatch) {
        author = creatorMatch[1].trim()
      }
    }

    // Get description/summary
    let description = ''
    const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)
    if (summaryMatch) {
      description = summaryMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
    }

    // Get subjects/categories
    const subjects: string[] = []
    const categoryRegex = /<category[^>]*term="([^"]*)"[^>]*>/g
    let catMatch
    while ((catMatch = categoryRegex.exec(entry)) !== null) {
      subjects.push(catMatch[1])
    }

    // Get dates
    const published = getId('published') || getId('dc:date')
    const modified = getId('updated')

    // Get language
    const language = getId('dc:language') || 'en'

    books.push({
      id,
      title,
      author,
      description,
      language,
      subjects,
      published,
      modified,
      epubUrl: epubLink.startsWith('http') ? epubLink : `${SE_BASE_URL}${epubLink}`,
      coverUrl: coverLink.startsWith('http') ? coverLink : `${SE_BASE_URL}${coverLink}`,
      thumbnailUrl: thumbnailLink.startsWith('http') ? thumbnailLink : `${SE_BASE_URL}${thumbnailLink}`,
      sourceUrl: `${SE_BASE_URL}/ebooks/${id}`,
    })
  }

  return books
}

/**
 * Fetch all books from Standard Ebooks OPDS feed
 */
async function fetchStandardEbooks(): Promise<StandardEbook[]> {
  console.log('Fetching Standard Ebooks catalog...')

  // Fetch the main feed which links to all books
  const response = await fetch(`${OPDS_URL}/all`, {
    headers: {
      'User-Agent': 'BookLibrio/1.0 (https://booklibrio.com)',
      'Accept': 'application/atom+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch OPDS feed: ${response.status}`)
  }

  const xml = await response.text()
  const books = parseOPDS(xml)

  console.log(`Found ${books.length} books in catalog`)
  return books
}

/**
 * Download file with retry logic
 */
async function downloadFile(url: string, retries = 3): Promise<Buffer | null> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`    Downloading: ${url.substring(0, 80)}...`)
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
    console.log(`    ✅ Uploaded: ${key}`)
    return `${API_BASE_URL}/api/r2/${key}`
  } catch (error) {
    console.error(`    ❌ R2 upload failed: ${error instanceof Error ? error.message : error}`)
    return null
  }
}

/**
 * Check if book exists in database
 */
async function bookExists(externalId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: ebooks.id })
    .from(ebooks)
    .where(eq(ebooks.externalId, externalId))
    .limit(1)
  return !!existing
}

/**
 * Ensure category exists
 */
async function ensureCategory(slug: string, name: string, description: string): Promise<number> {
  let [category] = await db
    .select()
    .from(ebookCategories)
    .where(eq(ebookCategories.slug, slug))
    .limit(1)

  if (!category && !dryRun) {
    [category] = await db.insert(ebookCategories).values({
      name,
      slug,
      description,
    }).returning()
    console.log(`  Created category: ${name} (ID: ${category.id})`)
  }

  return category?.id || 0
}

/**
 * Process a single book
 */
async function processBook(book: StandardEbook, categoryId: number): Promise<{ success: boolean; skipped?: boolean }> {
  const externalId = `standard-ebooks:${book.id}`

  console.log(`\n📖 ${book.title}`)
  console.log(`   Author: ${book.author}`)
  console.log(`   ID: ${book.id}`)

  // Check if already exists
  if (skipExisting && !dryRun) {
    const exists = await bookExists(externalId)
    if (exists) {
      console.log(`   ⏭️ Skipped: Already in database`)
      return { success: true, skipped: true }
    }
  }

  // Generate R2 keys
  const sanitizedId = book.id.replace(/[^a-zA-Z0-9-]/g, '_')
  const epubKey = `ebooks/standard-ebooks/${sanitizedId}.epub`
  const coverKey = `covers/ebooks/standard-ebooks/${sanitizedId}.jpg`

  if (dryRun) {
    console.log(`   [DRY RUN] Would process:`)
    console.log(`     - EPUB: ${book.epubUrl}`)
    console.log(`     - Cover: ${book.coverUrl}`)
    console.log(`     - R2 Key: ${epubKey}`)
    return { success: true }
  }

  // Download EPUB
  const epubBuffer = await downloadFile(book.epubUrl)
  if (!epubBuffer) {
    console.log(`   ❌ Failed: Could not download EPUB`)
    return { success: false }
  }
  console.log(`   Downloaded EPUB: ${(epubBuffer.length / 1024 / 1024).toFixed(2)} MB`)

  // Upload EPUB to R2
  const epubUrl = await uploadToR2(epubKey, epubBuffer, 'application/epub+zip')
  if (!epubUrl) {
    return { success: false }
  }

  // Download and upload cover
  let coverUrl: string | null = null
  if (book.coverUrl) {
    const coverBuffer = await downloadFile(book.coverUrl)
    if (coverBuffer) {
      coverUrl = await uploadToR2(coverKey, coverBuffer, 'image/jpeg')
    }
  }

  // Create ebook record
  const [insertedEbook] = await db.insert(ebooks).values({
    title: book.title,
    author: book.author,
    description: book.description,
    language: book.language,
    categoryId,
    s3Key: epubKey,
    filePath: epubUrl,
    fileSize: epubBuffer.length,
    fileType: 'epub',
    coverUrl,
    paymentType: 'free',
    externalId,
    externalSource: 'standard-ebooks',
    externalUrl: book.sourceUrl,
  }).returning()

  console.log(`   ✅ Created ebook record: ID ${insertedEbook.id}`)

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

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('      IMPORT PREMIUM BOOKS FROM STANDARD EBOOKS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`R2 configured: ${!!r2Client}`)
  console.log(`Limit: ${limit === Infinity ? 'All' : limit}`)
  console.log(`Skip existing: ${skipExisting}`)
  console.log(`Category: ${categorySlug}`)
  console.log('═══════════════════════════════════════════════════════════════')

  // Ensure category exists
  const categoryId = await ensureCategory(
    'classics',
    'Classics',
    'Timeless literary classics from Standard Ebooks'
  )
  console.log(`\nUsing category ID: ${categoryId}`)

  // Fetch all books from Standard Ebooks
  const allBooks = await fetchStandardEbooks()

  if (allBooks.length === 0) {
    console.log('\n❌ No books found in catalog.')
    await pool.end()
    process.exit(1)
  }

  // Apply limit
  const booksToProcess = limit === Infinity ? allBooks : allBooks.slice(0, limit)
  console.log(`\nProcessing ${booksToProcess.length} books...`)

  let success = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < booksToProcess.length; i++) {
    const book = booksToProcess[i]

    try {
      const result = await processBook(book, categoryId)

      if (result.skipped) {
        skipped++
      } else if (result.success) {
        success++
      } else {
        failed++
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : error}`)
      failed++
    }

    // Progress update every 10 books
    if ((i + 1) % 10 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${booksToProcess.length} (${Math.round((i + 1) / booksToProcess.length * 100)}%) ---`)
      console.log(`    Success: ${success}, Skipped: ${skipped}, Failed: ${failed}\n`)
    }

    // Small delay to be polite to Standard Ebooks servers
    if (!dryRun && i < booksToProcess.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                         SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`✅ Imported: ${success}`)
  console.log(`⏭️ Skipped: ${skipped}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📚 Total processed: ${success + skipped + failed}`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to actually import.\n')
  }

  await pool.end()
  process.exit(0)
}

main().catch(async (error) => {
  console.error('❌ Error:', error)
  await pool.end()
  process.exit(1)
})
