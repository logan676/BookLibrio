/**
 * Validate Curated List Cover URLs
 *
 * Validates externalCoverUrl in curatedListItems table:
 * - Detects Open Library placeholder images (1x1 transparent or "no cover" images)
 * - Clears invalid URLs to let the app show proper placeholders
 *
 * Run with:
 *   npx tsx src/scripts/validate-curated-list-covers.ts [options]
 *
 * Options:
 *   --dry-run     Preview changes without updating database
 *   --limit=N     Process only N items (default: all)
 *   --list-id=N   Only process items from specific list ID
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { curatedListItems, curatedLists } from '../db/schema'
import { eq, isNotNull, sql, and } from 'drizzle-orm'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
const db = drizzle(pool)

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined
const listIdArg = args.find(a => a.startsWith('--list-id='))
const listId = listIdArg ? parseInt(listIdArg.split('=')[1]) : undefined

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Minimum valid image size in bytes
// Open Library placeholders are typically < 1KB
const MIN_IMAGE_SIZE = 1000

interface ValidationResult {
  itemId: number
  listId: number
  externalTitle: string | null
  coverUrl: string
  status: 'valid' | 'placeholder' | 'broken' | 'timeout' | 'error'
  httpStatus?: number
  contentLength?: number
  reason?: string
}

/**
 * Validate a cover URL - detect placeholders and broken images
 */
async function validateCoverUrl(url: string): Promise<{
  valid: boolean
  status?: number
  contentLength?: number
  reason?: string
}> {
  try {
    // Use GET with range header to get actual image data for size check
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(30000), // 30 seconds timeout for slow servers
      headers: {
        'User-Agent': 'BookPost/1.0 (Cover Validator)',
        'Range': 'bytes=0-2000' // Only get first 2KB
      }
    })

    const contentType = response.headers.get('content-type') || ''
    const isImage = contentType.startsWith('image/')

    if (!response.ok && response.status !== 206) {
      return {
        valid: false,
        status: response.status,
        reason: `HTTP ${response.status}`
      }
    }

    if (!isImage) {
      return {
        valid: false,
        status: response.status,
        reason: 'Not an image'
      }
    }

    // Get actual content to check size
    const buffer = await response.arrayBuffer()
    const contentLength = buffer.byteLength

    // Check content-length from header (for full image size)
    const headerLength = response.headers.get('content-range')
    let fullSize = contentLength
    if (headerLength) {
      // Format: "bytes 0-2000/12345"
      const match = headerLength.match(/\/(\d+)/)
      if (match) {
        fullSize = parseInt(match[1])
      }
    }

    // Open Library returns very small images (< 1KB) for missing covers
    if (fullSize < MIN_IMAGE_SIZE) {
      return {
        valid: false,
        status: response.status,
        contentLength: fullSize,
        reason: `Image too small (${fullSize} bytes) - likely placeholder`
      }
    }

    return {
      valid: true,
      status: response.status,
      contentLength: fullSize
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return { valid: false, reason: 'Timeout' }
      }
      return { valid: false, reason: error.message }
    }
    return { valid: false, reason: 'Unknown error' }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('     VALIDATE CURATED LIST COVER URLS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (limit) console.log(`Limit: ${limit} items`)
  if (listId) console.log(`List ID: ${listId}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Build query conditions
  const conditions = [isNotNull(curatedListItems.externalCoverUrl)]
  if (listId) {
    conditions.push(eq(curatedListItems.listId, listId))
  }

  // Get items with external cover URLs
  let query = db.select({
    id: curatedListItems.id,
    listId: curatedListItems.listId,
    externalTitle: curatedListItems.externalTitle,
    externalCoverUrl: curatedListItems.externalCoverUrl,
  })
    .from(curatedListItems)
    .where(and(...conditions))
    .orderBy(curatedListItems.id)

  const items = limit
    ? await query.limit(limit)
    : await query

  console.log(`Found ${items.length} items with external cover URLs\n`)

  const results: ValidationResult[] = []
  let validCount = 0
  let invalidCount = 0
  let errorCount = 0

  // Process items
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const url = item.externalCoverUrl!

    process.stdout.write(`[${i + 1}/${items.length}] Checking item ${item.id}... `)

    const validation = await validateCoverUrl(url)

    if (validation.valid) {
      console.log(`✅ Valid (${validation.contentLength} bytes)`)
      validCount++
      results.push({
        itemId: item.id,
        listId: item.listId,
        externalTitle: item.externalTitle,
        coverUrl: url,
        status: 'valid',
        httpStatus: validation.status,
        contentLength: validation.contentLength,
      })
    } else {
      const reason = validation.reason || 'Unknown'
      const isPlaceholder = reason.includes('placeholder') || reason.includes('too small')

      if (isPlaceholder) {
        console.log(`⚠️  Placeholder detected: ${reason}`)
        invalidCount++
        results.push({
          itemId: item.id,
          listId: item.listId,
          externalTitle: item.externalTitle,
          coverUrl: url,
          status: 'placeholder',
          httpStatus: validation.status,
          contentLength: validation.contentLength,
          reason,
        })

        // Clear the invalid URL
        if (!dryRun) {
          await db.update(curatedListItems)
            .set({ externalCoverUrl: null })
            .where(eq(curatedListItems.id, item.id))
          console.log(`   → Cleared externalCoverUrl`)
        } else {
          console.log(`   → Would clear externalCoverUrl (dry run)`)
        }
      } else {
        console.log(`❌ Error: ${reason}`)
        errorCount++
        results.push({
          itemId: item.id,
          listId: item.listId,
          externalTitle: item.externalTitle,
          coverUrl: url,
          status: 'error',
          httpStatus: validation.status,
          reason,
        })
      }
    }

    // Rate limit: 100ms between requests
    if (i < items.length - 1) {
      await delay(100)
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                        SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`✅ Valid:       ${validCount}`)
  console.log(`⚠️  Placeholder: ${invalidCount} ${dryRun ? '(would be cleared)' : '(cleared)'}`)
  console.log(`❌ Errors:      ${errorCount}`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.')
  }

  // Show affected lists
  if (invalidCount > 0) {
    const affectedLists = [...new Set(results.filter(r => r.status === 'placeholder').map(r => r.listId))]

    if (affectedLists.length > 0) {
      console.log('\n📋 Affected lists:')
      const listsData = await db.select({
        id: curatedLists.id,
        title: curatedLists.title,
        listType: curatedLists.listType,
      })
        .from(curatedLists)
        .where(sql`${curatedLists.id} IN ${affectedLists}`)

      for (const list of listsData) {
        const count = results.filter(r => r.listId === list.id && r.status === 'placeholder').length
        console.log(`   - [${list.id}] ${list.title} (${list.listType}): ${count} invalid covers`)
      }
    }
  }

  await pool.end()
}

main().catch(async (err) => {
  console.error('Error:', err)
  await pool.end()
  process.exit(1)
})
