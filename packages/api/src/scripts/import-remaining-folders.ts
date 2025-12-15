/**
 * Import Remaining Local Folders Script
 *
 * Imports remaining folders from local disk that haven't been imported yet:
 * - 1.推荐新书 (Recommended Books) -> editor_pick
 * - 2.阅读经典 (Reading Classics) -> editor_pick
 * - 3.高分书籍 (High-rated Books) -> editor_pick
 * - 5.系列 (Book Series) -> book_series
 * - 8.本周新书合辑 (Weekly New Books) -> weekly_pick
 * - 9.收费资源 (Premium Resources) -> editor_pick
 *
 * Run with:
 *   npx tsx src/scripts/import-remaining-folders.ts [options]
 *
 * Options:
 *   --dry-run    Preview without saving
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { curatedLists, curatedListItems, ebooks } from '../db/schema'
import { eq, ilike, sql } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
const db = drizzle(pool)

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

const LOCAL_BASE = '/Volumes/杂志/【基础版】英文书单2024年全年更新'

// Folder configurations
const FOLDER_CONFIGS = [
  {
    folderName: '1.推荐新书',
    listType: 'editor_pick',
    sourceName: 'Editor Pick',
    singleList: true,  // All books in one list
    listTitle: '推荐新书',
    englishTitle: 'Recommended New Books',
  },
  {
    folderName: '2.阅读经典',
    listType: 'editor_pick',
    sourceName: 'Editor Pick',
    singleList: true,
    listTitle: '阅读经典',
    englishTitle: 'Reading Classics',
  },
  {
    folderName: '3.高分书籍',
    listType: 'editor_pick',
    sourceName: 'Editor Pick',
    singleList: true,
    listTitle: '高分书籍',
    englishTitle: 'High-Rated Books',
  },
  {
    folderName: '5.系列',
    listType: 'book_series',
    sourceName: 'Book Series',
    singleList: false,  // Each subfolder is a separate series
  },
  {
    folderName: '8.本周新书合辑',
    listType: 'weekly_pick',
    sourceName: 'Weekly Pick',
    singleList: false,  // Each subfolder is a weekly list
  },
  {
    folderName: '9.收费资源',
    listType: 'editor_pick',
    sourceName: 'Editor Pick',
    singleList: false,  // Each subfolder is a list
  },
]

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function findEbook(title: string): Promise<{ id: number; title: string; coverUrl: string | null } | null> {
  // Try exact match first
  let matches = await db.select({
    id: ebooks.id,
    title: ebooks.title,
    coverUrl: ebooks.coverUrl,
  }).from(ebooks).where(ilike(ebooks.title, title)).limit(1)

  if (matches.length > 0) return matches[0]

  // Try partial match
  matches = await db.select({
    id: ebooks.id,
    title: ebooks.title,
    coverUrl: ebooks.coverUrl,
  }).from(ebooks).where(ilike(ebooks.title, `%${title}%`)).limit(1)

  if (matches.length > 0) return matches[0]

  // Try with normalized title
  const normalized = normalizeTitle(title)
  const allEbooks = await db.select({
    id: ebooks.id,
    title: ebooks.title,
    coverUrl: ebooks.coverUrl,
  }).from(ebooks)

  for (const e of allEbooks) {
    const normalizedEbookTitle = normalizeTitle(e.title)
    if (normalizedEbookTitle === normalized ||
        normalizedEbookTitle.includes(normalized) ||
        normalized.includes(normalizedEbookTitle)) {
      return e
    }
  }

  return null
}

function extractListTitle(folderName: string): string {
  // Remove number prefix like "01." or "1."
  return folderName.replace(/^\d+\./, '').trim()
    .replace(/\[.*?\]/g, '') // Remove site watermarks
    .trim()
}

function extractYearAndMonth(folderName: string): { year?: number; month?: number; week?: number } {
  const yearMatch = folderName.match(/20\d{2}/)
  const year = yearMatch ? parseInt(yearMatch[0]) : undefined

  const monthMatch = folderName.match(/(\d{1,2})月/)
  const month = monthMatch ? parseInt(monthMatch[1]) : undefined

  const weekMatch = folderName.match(/第(\d+)周/)
  const week = weekMatch ? parseInt(weekMatch[1]) : undefined

  return { year, month, week }
}

async function getExistingList(title: string): Promise<number | null> {
  const existing = await db.select({ id: curatedLists.id })
    .from(curatedLists)
    .where(eq(curatedLists.title, title))
    .limit(1)
  return existing.length > 0 ? existing[0].id : null
}

async function createList(config: {
  listType: string
  title: string
  sourceName: string
  year?: number
  month?: number
  bookCount: number
  sortOrder: number
}): Promise<number> {
  if (dryRun) {
    console.log(`   🔸 Would create list: ${config.title}`)
    return -1
  }

  const [newList] = await db.insert(curatedLists).values({
    listType: config.listType,
    title: config.title,
    sourceName: config.sourceName,
    year: config.year,
    month: config.month,
    bookCount: config.bookCount,
    isActive: false,
    sortOrder: config.sortOrder,
  }).returning()

  console.log(`   ✅ Created list: ${config.title} (ID ${newList.id})`)
  return newList.id
}

async function addListItem(listId: number, position: number, bookName: string, ebook: { id: number; coverUrl: string | null } | null): Promise<boolean> {
  if (dryRun) {
    return true
  }

  if (listId <= 0) return false

  try {
    await db.insert(curatedListItems).values({
      listId,
      bookType: ebook ? 'ebook' : 'external',
      bookId: ebook?.id || null,
      externalTitle: bookName,
      externalCoverUrl: ebook?.coverUrl || null,
      position,
    })
    return true
  } catch (err: any) {
    if (err.code === '23505') {
      // Duplicate entry
      return false
    }
    throw err
  }
}

function findEpubsRecursively(folderPath: string, maxDepth: number = 3): string[] {
  const epubs: string[] = []

  function search(currentPath: string, depth: number) {
    if (depth > maxDepth) return

    const items = fs.readdirSync(currentPath)
      .filter(f => !f.startsWith('.') && !f.startsWith('._'))

    for (const item of items) {
      const itemPath = path.join(currentPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isDirectory()) {
        search(itemPath, depth + 1)
      } else if (item.endsWith('.epub')) {
        epubs.push(item.replace('.epub', ''))
      }
    }
  }

  search(folderPath, 0)
  return epubs
}

async function getBookFoldersOrFiles(folderPath: string): Promise<string[]> {
  const items = fs.readdirSync(folderPath)
    .filter(f => !f.startsWith('.') && !f.startsWith('._'))
    .sort()

  const result: string[] = []

  for (const item of items) {
    const itemPath = path.join(folderPath, item)
    const stat = fs.statSync(itemPath)

    if (stat.isDirectory()) {
      // Recursively search for EPUBs in subdirectory
      const epubs = findEpubsRecursively(itemPath)
      if (epubs.length > 0) {
        // Use directory name as book name
        result.push(item)
      }
    } else if (item.endsWith('.epub')) {
      // Direct EPUB file
      result.push(item.replace('.epub', ''))
    }
  }

  return result
}

async function processSingleListFolder(config: typeof FOLDER_CONFIGS[0], sortOrderBase: number): Promise<{ lists: number; items: number; linked: number }> {
  const folderPath = path.join(LOCAL_BASE, config.folderName)

  if (!fs.existsSync(folderPath)) {
    console.log(`   ⚠️ Folder not found: ${config.folderName}`)
    return { lists: 0, items: 0, linked: 0 }
  }

  console.log(`\n📁 Processing: ${config.folderName}`)
  console.log(`   Type: ${config.listType}, Source: ${config.sourceName}`)

  const bookNames = await getBookFoldersOrFiles(folderPath)

  if (bookNames.length === 0) {
    console.log('   No books found')
    return { lists: 0, items: 0, linked: 0 }
  }

  const listTitle = config.englishTitle || config.listTitle || extractListTitle(config.folderName)

  // Check if list already exists
  const existingId = await getExistingList(listTitle)
  let listId: number

  if (existingId) {
    listId = existingId
    console.log(`   List already exists: ID ${listId}`)
  } else {
    listId = await createList({
      listType: config.listType,
      title: listTitle,
      sourceName: config.sourceName,
      bookCount: bookNames.length,
      sortOrder: sortOrderBase,
    })
  }

  let items = 0
  let linked = 0

  for (let i = 0; i < bookNames.length; i++) {
    const bookName = extractListTitle(bookNames[i])
    const ebook = await findEbook(bookName)

    if (ebook) {
      linked++
      console.log(`   ✅ [${i + 1}] ${bookName} -> ebook ID ${ebook.id}`)
    } else {
      console.log(`   ❌ [${i + 1}] ${bookName} -> NOT FOUND`)
    }

    const added = await addListItem(listId, i + 1, bookName, ebook)
    if (added) items++
  }

  return { lists: existingId ? 0 : 1, items, linked }
}

async function processMultiListFolder(config: typeof FOLDER_CONFIGS[0], sortOrderBase: number): Promise<{ lists: number; items: number; linked: number }> {
  const folderPath = path.join(LOCAL_BASE, config.folderName)

  if (!fs.existsSync(folderPath)) {
    console.log(`   ⚠️ Folder not found: ${config.folderName}`)
    return { lists: 0, items: 0, linked: 0 }
  }

  console.log(`\n📁 Processing: ${config.folderName}`)
  console.log(`   Type: ${config.listType}, Source: ${config.sourceName}`)

  const subFolders = fs.readdirSync(folderPath)
    .filter(f => {
      const itemPath = path.join(folderPath, f)
      return fs.statSync(itemPath).isDirectory() && !f.startsWith('.') && !f.startsWith('._')
    })
    .sort()

  if (subFolders.length === 0) {
    console.log('   No subfolders found')
    return { lists: 0, items: 0, linked: 0 }
  }

  let totalLists = 0
  let totalItems = 0
  let totalLinked = 0

  for (let listIdx = 0; listIdx < subFolders.length; listIdx++) {
    const subFolder = subFolders[listIdx]
    const subFolderPath = path.join(folderPath, subFolder)

    const listTitle = extractListTitle(subFolder)
    const { year, month } = extractYearAndMonth(subFolder)

    console.log(`\n   📋 List: ${listTitle}`)

    // Get books in this subfolder
    const bookNames = await getBookFoldersOrFiles(subFolderPath)

    if (bookNames.length === 0) {
      console.log('      No books found')
      continue
    }

    // Check if list already exists
    const existingId = await getExistingList(listTitle)
    let listId: number

    if (existingId) {
      listId = existingId
      console.log(`      List already exists: ID ${listId}`)
    } else {
      listId = await createList({
        listType: config.listType,
        title: listTitle,
        sourceName: config.sourceName,
        year,
        month,
        bookCount: bookNames.length,
        sortOrder: sortOrderBase + listIdx,
      })
      totalLists++
    }

    for (let i = 0; i < bookNames.length; i++) {
      const bookName = extractListTitle(bookNames[i])
      const ebook = await findEbook(bookName)

      if (ebook) {
        totalLinked++
        console.log(`      ✅ [${i + 1}] ${bookName} -> ebook ID ${ebook.id}`)
      } else {
        console.log(`      ❌ [${i + 1}] ${bookName} -> NOT FOUND`)
      }

      const added = await addListItem(listId, i + 1, bookName, ebook)
      if (added) totalItems++
    }
  }

  return { lists: totalLists, items: totalItems, linked: totalLinked }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('         IMPORT REMAINING LOCAL FOLDERS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Source: ${LOCAL_BASE}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  if (!fs.existsSync(LOCAL_BASE)) {
    console.error(`❌ Directory not found: ${LOCAL_BASE}`)
    await pool.end()
    return
  }

  // Get current max sortOrder
  const maxSortResult = await db.select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
    .from(curatedLists)
  const sortOrderBase = (maxSortResult[0]?.max || 0) + 1

  let totalLists = 0
  let totalItems = 0
  let totalLinked = 0

  for (let i = 0; i < FOLDER_CONFIGS.length; i++) {
    const config = FOLDER_CONFIGS[i]
    const result = config.singleList
      ? await processSingleListFolder(config, sortOrderBase + i * 100)
      : await processMultiListFolder(config, sortOrderBase + i * 100)

    totalLists += result.lists
    totalItems += result.items
    totalLinked += result.linked
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                        SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`📋 Lists created:  ${totalLists}`)
  console.log(`📚 Items added:    ${totalItems}`)
  console.log(`🔗 Items linked:   ${totalLinked} (${totalItems > 0 ? Math.round(totalLinked / totalItems * 100) : 0}%)`)
  console.log('═══════════════════════════════════════════════════════════════')

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
