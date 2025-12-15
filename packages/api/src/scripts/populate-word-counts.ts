/**
 * Populate Word Counts for Ebooks
 *
 * This script:
 * 1. Finds EPUB files from local directory (matching by s3Key path)
 * 2. Parses chapters and counts words
 * 3. Updates the database with word counts
 *
 * Run with:
 *   npx tsx src/scripts/populate-word-counts.ts [options]
 *
 * Options:
 *   --dry-run         Preview without saving
 *   --limit=N         Process only N books (default: all)
 *   --force           Update even if word count exists
 *   --local=PATH      Local directory containing EPUB files
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks } from '../db/schema'
import { eq, isNull, and, isNotNull, sql } from 'drizzle-orm'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

// ES modules don't have __dirname, so we need to derive it
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined
const localArg = args.find(a => a.startsWith('--local='))
const localDir = localArg ? localArg.split('=')[1] : '/Volumes/杂志/【基础版】英文书单2024年全年更新'

// Build a map of all local EPUB files for quick lookup
let localEpubMap: Map<string, string> = new Map()

function buildLocalEpubMap(dir: string) {
  console.log(`Building local EPUB index from: ${dir}`)
  try {
    // Use find command for faster recursive search
    const result = execSync(`find "${dir}" -name "*.epub" -type f 2>/dev/null`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024
    })
    const files = result.trim().split('\n').filter(f => f.length > 0)

    for (const filePath of files) {
      // Extract filename and create normalized key for matching
      const fileName = path.basename(filePath, '.epub').toLowerCase()
      // Also store by relative path from base dir
      const relativePath = filePath.replace(dir + '/', '')
      localEpubMap.set(fileName, filePath)
      localEpubMap.set(relativePath.toLowerCase(), filePath)
    }
    console.log(`Found ${files.length} EPUB files locally\n`)
  } catch (error) {
    console.error('Warning: Could not index local EPUB files:', error)
  }
}

/**
 * Find local EPUB file matching the book's s3Key or title
 */
function findLocalEpub(s3Key: string | null, title: string): string | null {
  if (!s3Key && !title) return null

  // Try to match by s3Key path
  if (s3Key) {
    const s3KeyLower = s3Key.toLowerCase()
    // Try exact path match (without 'ebooks/' prefix)
    const relativePath = s3Key.replace(/^ebooks\//, '')
    if (localEpubMap.has(relativePath.toLowerCase())) {
      return localEpubMap.get(relativePath.toLowerCase())!
    }

    // Try by filename from s3Key
    const s3FileName = path.basename(s3Key, '.epub').toLowerCase()
    if (localEpubMap.has(s3FileName)) {
      return localEpubMap.get(s3FileName)!
    }
  }

  // Try to match by title
  const titleKey = title.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const [key, filePath] of localEpubMap.entries()) {
    const normalizedKey = key.replace(/[^a-z0-9]/g, '')
    if (normalizedKey.includes(titleKey) || titleKey.includes(normalizedKey)) {
      return filePath
    }
  }

  return null
}

/**
 * Download file from R2 to temp directory
 */
async function downloadFromR2(key: string): Promise<string | null> {
  if (!r2Client) {
    console.log('  ⚠️ R2 client not configured')
    return null
  }

  try {
    const response = await r2Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }))

    if (!response.Body) {
      console.log('  ⚠️ Empty response from R2')
      return null
    }

    // Create temp file
    const tempDir = os.tmpdir()
    const tempFile = path.join(tempDir, `epub_${Date.now()}.epub`)

    // Convert stream to buffer and write to file
    const stream = response.Body as Readable
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }
    const buffer = Buffer.concat(chunks)
    fs.writeFileSync(tempFile, buffer)

    return tempFile
  } catch (error) {
    console.error(`  ❌ R2 download failed:`, error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Extract word count from EPUB file using isolated subprocess
 * This prevents malformed EPUBs from crashing the main process
 */
async function getEpubWordCount(filePath: string): Promise<number | null> {
  const scriptPath = path.join(__dirname, 'epub-word-counter.ts')

  try {
    // Run word counter in isolated subprocess with timeout
    const result = execSync(
      `npx tsx "${scriptPath}" "${filePath}"`,
      {
        encoding: 'utf-8',
        timeout: 120000,  // 2 minute timeout
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    )

    // Parse JSON output from subprocess
    const output = result.trim().split('\n').pop() || ''
    const data = JSON.parse(output)

    if (data.error) {
      console.error(`  ⚠️ EPUB parse error: ${data.error}`)
      return null
    }

    return data.wordCount > 0 ? data.wordCount : null
  } catch (error) {
    // Subprocess crashed or timed out - this is expected for malformed EPUBs
    console.error(`  ⚠️ EPUB processing failed (subprocess):`, error instanceof Error ? error.message.split('\n')[0] : 'Unknown error')
    return null
  }
}

/**
 * Estimate word count from page count
 * Average: ~250 words per page for fiction, ~300 for non-fiction
 */
function estimateWordCountFromPages(pageCount: number): number {
  return pageCount * 275  // Use average of 275 words/page
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              POPULATE WORD COUNTS FOR EBOOKS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Force update: ${force}`)
  console.log(`Local directory: ${localDir}`)
  console.log(`R2 fallback: ${!!r2Client}`)
  console.log(`Limit: ${limit || 'all'}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Build local EPUB index first
  if (fs.existsSync(localDir)) {
    buildLocalEpubMap(localDir)
  } else {
    console.log(`⚠️ Local directory not found: ${localDir}`)
    console.log('Will fall back to R2 downloads\n')
  }

  try {
    // Build query - find books without word count (unless --force)
    const whereClause = force
      ? isNotNull(ebooks.s3Key)  // All books with EPUB files
      : and(
          isNull(ebooks.wordCount),
          isNotNull(ebooks.s3Key)
        )

    let query = db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        s3Key: ebooks.s3Key,
        pageCount: ebooks.pageCount,
        wordCount: ebooks.wordCount,
        fileType: ebooks.fileType,
      })
      .from(ebooks)
      .where(whereClause)

    if (limit) {
      query = query.limit(limit) as typeof query
    }

    const booksToProcess = await query

    console.log(`Found ${booksToProcess.length} books to process\n`)

    if (booksToProcess.length === 0) {
      console.log('✅ All books already have word counts!')
      await pool.end()
      process.exit(0)
    }

    let successCount = 0
    let estimatedCount = 0
    let failCount = 0
    let skipCount = 0

    for (let i = 0; i < booksToProcess.length; i++) {
      const book = booksToProcess[i]
      console.log(`[${i + 1}/${booksToProcess.length}] Processing: ${book.title}`)

      // Skip non-EPUB files
      if (book.fileType !== 'epub') {
        if (book.pageCount) {
          const estimated = estimateWordCountFromPages(book.pageCount)
          console.log(`  📄 PDF file - estimating from ${book.pageCount} pages: ${estimated.toLocaleString()} words`)

          if (!dryRun) {
            await db.update(ebooks)
              .set({ wordCount: estimated })
              .where(eq(ebooks.id, book.id))
            console.log(`  ✅ Updated with estimated word count`)
          } else {
            console.log(`  🔸 Would update (dry run)`)
          }
          estimatedCount++
        } else {
          console.log(`  ⏭️ Non-EPUB without page count - skipping`)
          skipCount++
        }
        continue
      }

      // Try to get actual word count from EPUB
      // First try local file, then fall back to R2
      let epubFile: string | null = null
      let needsCleanup = false

      // Try to find local EPUB file
      const localFile = findLocalEpub(book.s3Key, book.title)
      if (localFile) {
        console.log(`  📂 Found local file: ${path.basename(localFile)}`)
        epubFile = localFile
      } else if (book.s3Key) {
        // Fall back to R2 download
        console.log(`  📥 Downloading from R2: ${book.s3Key}`)
        epubFile = await downloadFromR2(book.s3Key)
        needsCleanup = true
      }

      if (epubFile) {
        console.log(`  📊 Counting words...`)
        const wordCount = await getEpubWordCount(epubFile)

        // Clean up temp file (only if downloaded from R2)
        if (needsCleanup) {
          try {
            fs.unlinkSync(epubFile)
          } catch {}
        }

        if (wordCount) {
          console.log(`  📚 Word count: ${wordCount.toLocaleString()}`)

          if (!dryRun) {
            await db.update(ebooks)
              .set({ wordCount })
              .where(eq(ebooks.id, book.id))
            console.log(`  ✅ Updated successfully`)
          } else {
            console.log(`  🔸 Would update (dry run)`)
          }
          successCount++
        } else {
          // Fall back to page count estimate
          if (book.pageCount) {
            const estimated = estimateWordCountFromPages(book.pageCount)
            console.log(`  📄 Could not parse EPUB - estimating from ${book.pageCount} pages: ${estimated.toLocaleString()} words`)

            if (!dryRun) {
              await db.update(ebooks)
                .set({ wordCount: estimated })
                .where(eq(ebooks.id, book.id))
            }
            estimatedCount++
          } else {
            console.log(`  ❌ Could not determine word count`)
            failCount++
          }
        }
      } else {
        // No s3Key - use page count if available
        if (book.pageCount) {
          const estimated = estimateWordCountFromPages(book.pageCount)
          console.log(`  📄 No EPUB file - estimating from ${book.pageCount} pages: ${estimated.toLocaleString()} words`)

          if (!dryRun) {
            await db.update(ebooks)
              .set({ wordCount: estimated })
              .where(eq(ebooks.id, book.id))
          }
          estimatedCount++
        } else {
          console.log(`  ⏭️ No EPUB or page count - skipping`)
          skipCount++
        }
      }

      console.log('')
    }

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('                    WORD COUNT POPULATION COMPLETE')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`✅ Exact count:    ${successCount}`)
    console.log(`📊 Estimated:      ${estimatedCount}`)
    console.log(`❌ Failed:         ${failCount}`)
    console.log(`⏭️ Skipped:        ${skipCount}`)
    console.log('═══════════════════════════════════════════════════════════════\n')

    if (dryRun) {
      console.log('💡 This was a dry run. Run without --dry-run to apply changes.\n')
    }

  } catch (error) {
    console.error('❌ Error during processing:', error)
    await pool.end()
    process.exit(1)
  }

  await pool.end()
  process.exit(0)
}

main()
