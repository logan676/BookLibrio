/**
 * Pre-generate Thumbnails Script
 *
 * This script generates thumbnails for all book covers in R2 storage.
 * Thumbnails are stored at covers/thumbs/... and are 300px width, JPEG 80% quality.
 *
 * This is critical for iOS app performance - the app requests thumbnails directly
 * from R2 public URLs, bypassing the server's on-demand generation.
 *
 * Usage:
 *   npx tsx src/scripts/generate-thumbnails.ts [type]
 *
 * Arguments:
 *   type - Cover type to process: 'ebooks', 'magazines', 'rankings', or 'all' (default)
 *
 * Examples:
 *   npx tsx src/scripts/generate-thumbnails.ts          # Process all types
 *   npx tsx src/scripts/generate-thumbnails.ts ebooks   # Process only ebooks
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks, magazines } from '../db/schema'
import { isNotNull } from 'drizzle-orm'
import { downloadFromR2, uploadToR2, existsInR2 } from '../services/storage'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const db = drizzle(pool)

// Sharp is a CommonJS module - use dynamic import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSharp = async (): Promise<typeof import('sharp')> => {
  const module = await import('sharp')
  return (module as any).default || module
}

// Thumbnail configuration (must match covers.ts)
const THUMBNAIL_WIDTH = 300
const JPEG_QUALITY = 80

interface CoverInfo {
  id: number
  title: string
  coverUrl: string | null
}

/**
 * Extract R2 key from cover URL
 * /api/r2-covers/ebooks/book.jpg → covers/ebooks/book.jpg
 */
function extractR2Key(coverUrl: string): string | null {
  if (coverUrl.startsWith('/api/r2-covers/')) {
    const filename = coverUrl.replace('/api/r2-covers/', '')
    return `covers/${filename}`
  }
  // Already an R2 key
  if (coverUrl.startsWith('covers/')) {
    return coverUrl
  }
  // External URL - skip
  if (coverUrl.startsWith('http')) {
    return null
  }
  return null
}

/**
 * Get thumbnail key from original cover key
 * covers/ebooks/book.jpg → covers/thumbs/ebooks/book.jpg
 */
function getThumbnailKey(originalKey: string): string {
  return originalKey.replace('covers/', 'covers/thumbs/')
}

/**
 * Generate thumbnail for a single cover
 */
async function generateThumbnail(originalKey: string): Promise<boolean> {
  const thumbnailKey = getThumbnailKey(originalKey)

  // Check if thumbnail already exists
  const exists = await existsInR2(thumbnailKey)
  if (exists) {
    return true // Already generated
  }

  // Download original
  const originalBuffer = await downloadFromR2(originalKey)
  if (!originalBuffer) {
    console.log(`    ⚠️ Original not found in R2: ${originalKey}`)
    return false
  }

  // Generate thumbnail
  const sharp = await getSharp()
  const thumbnailBuffer = await sharp(originalBuffer)
    .resize(THUMBNAIL_WIDTH, null, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()

  // Upload thumbnail
  await uploadToR2(thumbnailKey, thumbnailBuffer, 'image/jpeg')

  return true
}

/**
 * Process ebook covers
 */
async function processEbooks(): Promise<{ processed: number; generated: number; failed: number; skipped: number }> {
  console.log('\n📚 Processing Ebook Covers...\n')

  const books = await db
    .select({ id: ebooks.id, title: ebooks.title, coverUrl: ebooks.coverUrl })
    .from(ebooks)
    .where(isNotNull(ebooks.coverUrl))

  console.log(`Found ${books.length} ebooks with covers\n`)

  let processed = 0
  let generated = 0
  let failed = 0
  let skipped = 0

  for (const book of books) {
    processed++

    if (!book.coverUrl) {
      skipped++
      continue
    }

    const r2Key = extractR2Key(book.coverUrl)
    if (!r2Key) {
      // External URL, skip
      skipped++
      continue
    }

    const thumbnailKey = getThumbnailKey(r2Key)
    const exists = await existsInR2(thumbnailKey)

    if (exists) {
      // Already has thumbnail
      if (processed % 100 === 0) {
        console.log(`[${processed}/${books.length}] Progress... (${generated} generated, ${skipped} skipped)`)
      }
      skipped++
      continue
    }

    console.log(`[${processed}/${books.length}] 📖 ${book.title.substring(0, 40)}...`)

    try {
      const success = await generateThumbnail(r2Key)
      if (success) {
        console.log(`    ✅ Thumbnail generated`)
        generated++
      } else {
        failed++
      }
    } catch (error) {
      console.log(`    ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failed++
    }

    // Rate limiting to avoid overwhelming R2
    await new Promise(r => setTimeout(r, 50))
  }

  return { processed, generated, failed, skipped }
}

/**
 * Process magazine covers
 */
async function processMagazines(): Promise<{ processed: number; generated: number; failed: number; skipped: number }> {
  console.log('\n📰 Processing Magazine Covers...\n')

  const mags = await db
    .select({ id: magazines.id, title: magazines.title, coverUrl: magazines.coverUrl })
    .from(magazines)
    .where(isNotNull(magazines.coverUrl))

  console.log(`Found ${mags.length} magazines with covers\n`)

  let processed = 0
  let generated = 0
  let failed = 0
  let skipped = 0

  for (const mag of mags) {
    processed++

    if (!mag.coverUrl) {
      skipped++
      continue
    }

    const r2Key = extractR2Key(mag.coverUrl)
    if (!r2Key) {
      skipped++
      continue
    }

    const thumbnailKey = getThumbnailKey(r2Key)
    const exists = await existsInR2(thumbnailKey)

    if (exists) {
      skipped++
      continue
    }

    console.log(`[${processed}/${mags.length}] 📰 ${mag.title.substring(0, 40)}...`)

    try {
      const success = await generateThumbnail(r2Key)
      if (success) {
        console.log(`    ✅ Thumbnail generated`)
        generated++
      } else {
        failed++
      }
    } catch (error) {
      console.log(`    ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failed++
    }

    await new Promise(r => setTimeout(r, 50))
  }

  return { processed, generated, failed, skipped }
}


async function main() {
  const type = process.argv[2] || 'all'

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('           PRE-GENERATE THUMBNAILS FOR R2 COVERS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Type: ${type}`)
  console.log(`Thumbnail size: ${THUMBNAIL_WIDTH}px width, JPEG ${JPEG_QUALITY}%`)
  console.log('═══════════════════════════════════════════════════════════════')

  const stats = {
    ebooks: { processed: 0, generated: 0, failed: 0, skipped: 0 },
    magazines: { processed: 0, generated: 0, failed: 0, skipped: 0 },
  }

  if (type === 'all' || type === 'ebooks') {
    stats.ebooks = await processEbooks()
  }

  if (type === 'all' || type === 'magazines') {
    stats.magazines = await processMagazines()
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                         SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')

  const totalGenerated = stats.ebooks.generated + stats.magazines.generated
  const totalSkipped = stats.ebooks.skipped + stats.magazines.skipped
  const totalFailed = stats.ebooks.failed + stats.magazines.failed

  if (type === 'all' || type === 'ebooks') {
    console.log(`\n📚 Ebooks:`)
    console.log(`   Generated: ${stats.ebooks.generated}`)
    console.log(`   Skipped (already exists/external): ${stats.ebooks.skipped}`)
    console.log(`   Failed: ${stats.ebooks.failed}`)
  }

  if (type === 'all' || type === 'magazines') {
    console.log(`\n📰 Magazines:`)
    console.log(`   Generated: ${stats.magazines.generated}`)
    console.log(`   Skipped: ${stats.magazines.skipped}`)
    console.log(`   Failed: ${stats.magazines.failed}`)
  }

  console.log('\n───────────────────────────────────────────────────────────────')
  console.log(`✅ Total Generated: ${totalGenerated}`)
  console.log(`⏭️ Total Skipped: ${totalSkipped}`)
  console.log(`❌ Total Failed: ${totalFailed}`)
  console.log('═══════════════════════════════════════════════════════════════')

  await pool.end()
}

main().catch(async (err) => {
  console.error('Error:', err)
  await pool.end()
  process.exit(1)
})
