/**
 * Import All Local Lists Script
 *
 * Imports book lists from multiple local directories:
 * 1. /4.英文书单 - Editor's picks / curated lists
 * 2. /6.纽约 - NYT Best Sellers
 * 3. /7.榜单 - Award rankings (already imported)
 *
 * Features:
 * - Auto-extracts zip files if needed
 * - Links books to existing ebooks
 * - Uploads missing books to R2
 * - Creates curatedLists with isActive=false
 *
 * Run with:
 *   npx tsx src/scripts/import-all-local-lists.ts [options]
 *
 * Options:
 *   --dry-run      Preview without saving
 *   --skip-upload  Skip uploading missing books
 *   --type=<type>  Only import specific type: 'booklist', 'nyt', 'all'
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { curatedLists, curatedListItems, ebooks } from '../db/schema'
import { eq, ilike } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
const db = drizzle(pool)

// Parse arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipUpload = args.includes('--skip-upload')
const typeArg = args.find(a => a.startsWith('--type='))
const importType = typeArg ? typeArg.split('=')[1] : 'all'

// Base paths
const LOCAL_BASE = '/Volumes/杂志/【基础版】英文书单2024年全年更新'
const BOOKLIST_PATH = path.join(LOCAL_BASE, '4.英文书单')
const NYT_PATH = path.join(LOCAL_BASE, '6.纽约')

// R2 Configuration
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'bookpost'

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return s3Client
}

// Stats
const stats = {
  listsCreated: 0,
  itemsAdded: 0,
  itemsLinked: 0,
  booksUploaded: 0,
  zipsExtracted: 0,
}

/**
 * Normalize title for matching
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract zip file if not already extracted
 */
function extractZipIfNeeded(zipPath: string): boolean {
  const dir = path.dirname(zipPath)
  const baseName = path.basename(zipPath, '.zip')
  const extractedDir = path.join(dir, baseName)

  // Check if already extracted
  if (fs.existsSync(extractedDir) && fs.statSync(extractedDir).isDirectory()) {
    const contents = fs.readdirSync(extractedDir).filter(f => !f.startsWith('.'))
    if (contents.length > 0) {
      return false // Already extracted
    }
  }

  // Extract
  console.log(`   📦 Extracting: ${path.basename(zipPath)}`)
  try {
    execSync(`unzip -o -q "${zipPath}" -d "${dir}"`, { stdio: 'pipe' })
    stats.zipsExtracted++
    return true
  } catch (err) {
    console.error(`   ❌ Failed to extract: ${zipPath}`)
    return false
  }
}

/**
 * Find EPUB files in a directory (recursively)
 */
function findEpubFiles(dir: string): string[] {
  const epubs: string[] = []

  function search(currentDir: string) {
    try {
      const items = fs.readdirSync(currentDir)
      for (const item of items) {
        if (item.startsWith('.')) continue
        const fullPath = path.join(currentDir, item)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          search(fullPath)
        } else if (item.toLowerCase().endsWith('.epub')) {
          epubs.push(fullPath)
        }
      }
    } catch (err) {
      // Ignore permission errors
    }
  }

  search(dir)
  return epubs
}

/**
 * Build ebook index for faster matching
 */
async function buildEbookIndex(): Promise<Map<string, { id: number; title: string; coverUrl: string | null }>> {
  const allEbooks = await db.select({
    id: ebooks.id,
    title: ebooks.title,
    coverUrl: ebooks.coverUrl,
  }).from(ebooks)

  const index = new Map<string, { id: number; title: string; coverUrl: string | null }>()
  for (const ebook of allEbooks) {
    const normalizedTitle = normalizeTitle(ebook.title)
    index.set(normalizedTitle, ebook)
  }
  return index
}

/**
 * Find matching ebook
 */
function findEbook(
  title: string,
  ebookIndex: Map<string, { id: number; title: string; coverUrl: string | null }>
): { id: number; title: string; coverUrl: string | null } | null {
  const normalizedTitle = normalizeTitle(title)

  // Try exact match
  let match = ebookIndex.get(normalizedTitle)
  if (match) return match

  // Try partial match
  for (const [key, ebook] of ebookIndex) {
    if (key.includes(normalizedTitle) || normalizedTitle.includes(key)) {
      return ebook
    }
  }

  return null
}

/**
 * Upload EPUB to R2 and create ebook record
 */
async function uploadAndCreateEbook(
  epubPath: string,
  title: string
): Promise<{ id: number; title: string; coverUrl: string | null } | null> {
  if (skipUpload || dryRun) {
    console.log(`      📤 Would upload: ${title}`)
    return null
  }

  try {
    const fileBuffer = fs.readFileSync(epubPath)
    const fileSize = fs.statSync(epubPath).size
    const timestamp = Date.now()
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
    const s3Key = `ebooks/${safeTitle}_${timestamp}.epub`

    // Upload to R2
    const client = getS3Client()
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'application/epub+zip',
    }))

    // Create ebook record
    const [newEbook] = await db.insert(ebooks).values({
      title,
      s3Key,
      fileSize,
      fileType: 'epub',
      language: 'en',
    }).returning()

    stats.booksUploaded++
    console.log(`      ✅ Uploaded: ${title} -> ebook ID ${newEbook.id}`)

    return {
      id: newEbook.id,
      title: newEbook.title,
      coverUrl: newEbook.coverUrl,
    }
  } catch (err: any) {
    console.error(`      ❌ Upload failed: ${title} - ${err.message}`)
    return null
  }
}

/**
 * Import English Book Lists (/4.英文书单)
 */
async function importBookLists(ebookIndex: Map<string, { id: number; title: string; coverUrl: string | null }>) {
  console.log('\n' + '═'.repeat(70))
  console.log('    IMPORTING: 英文书单 (Editor Picks)')
  console.log('═'.repeat(70))

  if (!fs.existsSync(BOOKLIST_PATH)) {
    console.error(`❌ Directory not found: ${BOOKLIST_PATH}`)
    return
  }

  const folders = fs.readdirSync(BOOKLIST_PATH)
    .filter(f => fs.statSync(path.join(BOOKLIST_PATH, f)).isDirectory())
    .filter(f => !f.startsWith('.'))
    .sort()

  console.log(`Found ${folders.length} book list folders\n`)

  for (const folder of folders) {
    const folderPath = path.join(BOOKLIST_PATH, folder)

    // Parse folder name: remove number prefix
    const title = folder.replace(/^\d+\./, '').trim()

    console.log(`\n📁 Processing: ${folder}`)

    // Get book subfolders
    const bookFolders = fs.readdirSync(folderPath)
      .filter(f => {
        const p = path.join(folderPath, f)
        return fs.statSync(p).isDirectory() && !f.startsWith('.')
      })
      .sort()

    if (bookFolders.length === 0) {
      console.log('   No book folders found, skipping')
      continue
    }

    // Check if list already exists
    const existingList = await db.select({ id: curatedLists.id })
      .from(curatedLists)
      .where(eq(curatedLists.title, title))
      .limit(1)

    let listId: number

    if (existingList.length > 0) {
      listId = existingList[0].id
      console.log(`   List already exists: ID ${listId}`)
    } else if (!dryRun) {
      const [newList] = await db.insert(curatedLists).values({
        listType: 'editor_pick',
        title,
        sourceName: 'Editor Pick',
        bookCount: bookFolders.length,
        isActive: false,
        sortOrder: 200 + stats.listsCreated,
      }).returning()
      listId = newList.id
      stats.listsCreated++
      console.log(`   ✅ Created list (inactive): ID ${listId}`)
    } else {
      listId = -1
      stats.listsCreated++
      console.log(`   🔸 Would create list: ${title}`)
    }

    // Process each book folder
    for (let i = 0; i < bookFolders.length; i++) {
      const bookFolder = bookFolders[i]
      const bookPath = path.join(folderPath, bookFolder)
      const bookName = bookFolder.replace(/^\d+\.?\s*/, '').trim()

      // Find matching ebook
      let ebook = findEbook(bookName, ebookIndex)

      // If not found, try to find and upload EPUB
      if (!ebook) {
        const epubs = findEpubFiles(bookPath)
        if (epubs.length > 0) {
          ebook = await uploadAndCreateEbook(epubs[0], bookName)
          if (ebook) {
            ebookIndex.set(normalizeTitle(bookName), ebook)
          }
        }
      }

      if (ebook) {
        stats.itemsLinked++
        console.log(`   ✅ [${i + 1}] ${bookName} -> ebook ID ${ebook.id}`)

        if (!dryRun && listId > 0) {
          try {
            await db.insert(curatedListItems).values({
              listId,
              bookType: 'ebook',
              bookId: ebook.id,
              externalTitle: bookName,
              externalCoverUrl: ebook.coverUrl,
              position: i + 1,
            })
            stats.itemsAdded++
          } catch (err: any) {
            if (err.code === '23505') {
              console.log(`      (already exists)`)
            }
          }
        } else if (dryRun) {
          stats.itemsAdded++
        }
      } else {
        console.log(`   ❌ [${i + 1}] ${bookName} -> NOT FOUND`)
      }
    }
  }
}

/**
 * Import NYT Best Sellers (/6.纽约)
 */
async function importNYT(ebookIndex: Map<string, { id: number; title: string; coverUrl: string | null }>) {
  console.log('\n' + '═'.repeat(70))
  console.log('    IMPORTING: NYT Best Sellers')
  console.log('═'.repeat(70))

  if (!fs.existsSync(NYT_PATH)) {
    console.error(`❌ Directory not found: ${NYT_PATH}`)
    return
  }

  // First, extract any zip files (excluding macOS resource forks ._*)
  console.log('\nChecking for zip files to extract...')
  const zipFiles = execSync(`find "${NYT_PATH}" -name "*.zip" -type f ! -name "._*" 2>/dev/null`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024
  }).trim().split('\n').filter(f => f.length > 0 && !path.basename(f).startsWith('._'))

  for (const zipFile of zipFiles) {
    extractZipIfNeeded(zipFile)
  }

  // Find all NYT list folders
  const nytFolders = execSync(`find "${NYT_PATH}" -type d -name "The New York Times*" 2>/dev/null`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024
  }).trim().split('\n').filter(f => f.length > 0)

  console.log(`\nFound ${nytFolders.length} NYT list folders\n`)

  for (const nytFolder of nytFolders) {
    const folderName = path.basename(nytFolder)

    // Parse NYT folder name: "The New York Times Best Sellers Fiction May 12,2024"
    const match = folderName.match(/The New York Times Best Sellers (Fiction|Nonfiction) (.+)/)
    if (!match) {
      console.log(`⏭️ Skipping unrecognized: ${folderName}`)
      continue
    }

    const category = match[1].toLowerCase() // 'fiction' or 'nonfiction'
    const dateStr = match[2] // "May 12,2024" or "May 12, 2024"

    // Parse date
    const dateMatch = dateStr.match(/(\w+)\s+(\d+),?\s*(\d{4})/)
    if (!dateMatch) continue

    const monthName = dateMatch[1]
    const day = parseInt(dateMatch[2])
    const year = parseInt(dateMatch[3])

    const monthMap: Record<string, number> = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
      'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    const month = monthMap[monthName]

    const title = `NYT Best Sellers ${category === 'fiction' ? 'Fiction' : 'Nonfiction'} - ${monthName} ${day}, ${year}`

    console.log(`\n📁 Processing: ${title}`)

    // Get book subfolders
    const bookFolders = fs.readdirSync(nytFolder)
      .filter(f => {
        const p = path.join(nytFolder, f)
        return fs.existsSync(p) && fs.statSync(p).isDirectory() && !f.startsWith('.')
      })
      .sort((a, b) => {
        // Sort by number prefix
        const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999')
        const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999')
        return numA - numB
      })

    if (bookFolders.length === 0) {
      console.log('   No book folders found, skipping')
      continue
    }

    // Check if list already exists
    const existingList = await db.select({ id: curatedLists.id })
      .from(curatedLists)
      .where(eq(curatedLists.title, title))
      .limit(1)

    let listId: number

    if (existingList.length > 0) {
      listId = existingList[0].id
      console.log(`   List already exists: ID ${listId}`)
    } else if (!dryRun) {
      // Create publish date
      const publishDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      const [newList] = await db.insert(curatedLists).values({
        listType: 'nyt_bestseller',
        title,
        sourceName: 'The New York Times',
        year,
        month,
        category,
        publishDate,
        bookCount: bookFolders.length,
        isActive: false,
        sortOrder: 300 + stats.listsCreated,
      }).returning()
      listId = newList.id
      stats.listsCreated++
      console.log(`   ✅ Created list (inactive): ID ${listId}`)
    } else {
      listId = -1
      stats.listsCreated++
      console.log(`   🔸 Would create list: ${title}`)
    }

    // Process each book folder
    for (let i = 0; i < bookFolders.length; i++) {
      const bookFolder = bookFolders[i]
      const bookPath = path.join(nytFolder, bookFolder)
      const bookName = bookFolder.replace(/^\d+\.?\s*/, '').trim()

      // Find matching ebook
      let ebook = findEbook(bookName, ebookIndex)

      // If not found, try to find and upload EPUB
      if (!ebook) {
        const epubs = findEpubFiles(bookPath)
        if (epubs.length > 0) {
          ebook = await uploadAndCreateEbook(epubs[0], bookName)
          if (ebook) {
            ebookIndex.set(normalizeTitle(bookName), ebook)
          }
        }
      }

      if (ebook) {
        stats.itemsLinked++
        console.log(`   ✅ [${i + 1}] ${bookName} -> ebook ID ${ebook.id}`)

        if (!dryRun && listId > 0) {
          try {
            await db.insert(curatedListItems).values({
              listId,
              bookType: 'ebook',
              bookId: ebook.id,
              externalTitle: bookName,
              externalCoverUrl: ebook.coverUrl,
              position: i + 1,
            })
            stats.itemsAdded++
          } catch (err: any) {
            if (err.code === '23505') {
              console.log(`      (already exists)`)
            }
          }
        } else if (dryRun) {
          stats.itemsAdded++
        }
      } else {
        console.log(`   ❌ [${i + 1}] ${bookName} -> NOT FOUND`)
      }
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('═'.repeat(70))
  console.log('         IMPORT ALL LOCAL BOOK LISTS')
  console.log('═'.repeat(70))
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Upload: ${skipUpload ? 'DISABLED' : 'ENABLED'}`)
  console.log(`Type: ${importType}`)
  console.log('═'.repeat(70))

  // Build ebook index
  console.log('\nBuilding ebook index...')
  const ebookIndex = await buildEbookIndex()
  console.log(`Indexed ${ebookIndex.size} ebooks`)

  // Import based on type
  if (importType === 'all' || importType === 'booklist') {
    await importBookLists(ebookIndex)
  }

  if (importType === 'all' || importType === 'nyt') {
    await importNYT(ebookIndex)
  }

  // Print summary
  console.log('\n' + '═'.repeat(70))
  console.log('                        SUMMARY')
  console.log('═'.repeat(70))
  console.log(`📦 Zips extracted:  ${stats.zipsExtracted}`)
  console.log(`📋 Lists created:   ${stats.listsCreated}`)
  console.log(`📚 Items added:     ${stats.itemsAdded}`)
  console.log(`🔗 Items linked:    ${stats.itemsLinked}`)
  console.log(`📤 Books uploaded:  ${stats.booksUploaded}`)
  console.log('═'.repeat(70))

  if (dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.')
  }

  await pool.end()
}

main().catch(async (err) => {
  console.error('Error:', err)
  await pool.end()
  process.exit(1)
})
