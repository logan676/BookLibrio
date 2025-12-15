/**
 * Import Local Rankings Script
 *
 * Imports ranking structure from local disk folders into curatedLists/curatedListItems.
 * Links books to existing ebooks in the database.
 *
 * Run with:
 *   npx tsx src/scripts/import-local-rankings.ts [options]
 *
 * Options:
 *   --dry-run    Preview without saving
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { curatedLists, curatedListItems, ebooks } from '../db/schema'
import { eq, ilike } from 'drizzle-orm'
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

const LOCAL_RANKINGS_BASE = '/Volumes/杂志/【基础版】英文书单2024年全年更新/7.榜单'

// Mapping of folder names to list metadata
const FOLDER_MAPPINGS: Record<string, { listType: string; sourceName: string; category?: string }> = {
  '普利策': { listType: 'pulitzer', sourceName: 'Pulitzer Prize' },
  '布克国际奖': { listType: 'booker_international', sourceName: 'Booker International Prize' },
  '布克奖': { listType: 'booker', sourceName: 'Booker Prize' },
  '布克': { listType: 'booker', sourceName: 'Booker Prize' },
  '亚马逊': { listType: 'amazon_best', sourceName: 'Amazon' },
  'Goodreads': { listType: 'goodreads_choice', sourceName: 'Goodreads' },
  '纽伯瑞': { listType: 'newbery', sourceName: 'Newbery Medal' },
}

// Category detection
const CATEGORY_KEYWORDS: Record<string, string> = {
  '非虚构': 'nonfiction',
  '青少年': 'young_adult',
  '儿童': 'children',
}

interface ParsedListMeta {
  listType: string
  sourceName: string
  year?: number
  month?: number
  category?: string
  title: string
}

function parseListType(folderName: string): ParsedListMeta {
  // Remove leading number prefix like "01." or "26."
  const cleanName = folderName.replace(/^\d+\./, '').trim()

  // Find matching source
  let listType = 'editor_pick'
  let sourceName = 'Editor Pick'

  for (const [key, value] of Object.entries(FOLDER_MAPPINGS)) {
    if (folderName.includes(key)) {
      listType = value.listType
      sourceName = value.sourceName
      break
    }
  }

  // Extract year
  const yearMatch = folderName.match(/20\d{2}/)
  const year = yearMatch ? parseInt(yearMatch[0]) : undefined

  // Extract month (Chinese: X月)
  const monthMatch = folderName.match(/(\d{1,2})月/)
  const month = monthMatch ? parseInt(monthMatch[1]) : undefined

  // Detect category
  let category: string | undefined
  for (const [keyword, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (folderName.includes(keyword)) {
      category = cat
      break
    }
  }

  // Use the clean folder name as title (without site watermark)
  const title = cleanName.replace(/\[.*?\]/g, '').trim()

  return {
    listType,
    sourceName,
    year,
    month,
    category,
    title,
  }
}

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
  const normalizedSearch = normalizeTitle(title)

  // Try exact match
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

  return null
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('         IMPORT LOCAL RANKINGS INTO DATABASE')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Source: ${LOCAL_RANKINGS_BASE}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  if (!fs.existsSync(LOCAL_RANKINGS_BASE)) {
    console.error(`❌ Directory not found: ${LOCAL_RANKINGS_BASE}`)
    await pool.end()
    return
  }

  const rankingFolders = fs.readdirSync(LOCAL_RANKINGS_BASE)
    .filter(f => fs.statSync(path.join(LOCAL_RANKINGS_BASE, f)).isDirectory())
    .filter(f => !f.startsWith('.'))
    .sort()

  console.log(`Found ${rankingFolders.length} ranking folders\n`)

  let totalLists = 0
  let totalItems = 0
  let linkedItems = 0

  for (const folder of rankingFolders) {
    const folderPath = path.join(LOCAL_RANKINGS_BASE, folder)
    const listMeta = parseListType(folder)

    // listMeta is always non-null now since we default to 'editor_pick'
    console.log(`\n📁 Processing: ${folder}`)
    console.log(`   Title: ${listMeta.title}`)
    console.log(`   Type: ${listMeta.listType}, Source: ${listMeta.sourceName}`)
    console.log(`   Year: ${listMeta.year || 'N/A'}, Month: ${listMeta.month || 'N/A'}, Category: ${listMeta.category || 'N/A'}`)

    // Get book subfolders
    const bookFolders = fs.readdirSync(folderPath)
      .filter(f => fs.statSync(path.join(folderPath, f)).isDirectory())
      .filter(f => !f.startsWith('.'))
      .sort()

    if (bookFolders.length === 0) {
      console.log('   No book folders found, skipping')
      continue
    }

    // Use parsed title from folder name
    const listTitle = listMeta.title

    // Check if list already exists
    const existingList = await db.select({ id: curatedLists.id })
      .from(curatedLists)
      .where(eq(curatedLists.title, listTitle))
      .limit(1)

    let listId: number

    if (existingList.length > 0) {
      listId = existingList[0].id
      console.log(`   List already exists: ID ${listId}`)
    } else if (!dryRun) {
      const [newList] = await db.insert(curatedLists).values({
        listType: listMeta.listType,
        title: listTitle,
        sourceName: listMeta.sourceName,
        year: listMeta.year,
        month: listMeta.month,
        category: listMeta.category,
        bookCount: bookFolders.length,
        isActive: false, // Default to inactive - must be manually enabled
        sortOrder: 100 + totalLists,
      }).returning()
      listId = newList.id
      totalLists++
      console.log(`   ✅ Created list (inactive): ID ${listId}`)
    } else {
      listId = -1
      totalLists++
      console.log(`   🔸 Would create list (inactive): ${listTitle}`)
    }

    // Process book folders
    for (let i = 0; i < bookFolders.length; i++) {
      const bookFolder = bookFolders[i]
      // Extract book name (remove number prefix like "01." or "1.")
      const bookName = bookFolder.replace(/^\d+\.\s*/, '')

      // Find matching ebook
      const ebook = await findEbook(bookName)

      if (ebook) {
        linkedItems++
        console.log(`   ✅ [${i + 1}] ${bookName} -> ebook ID ${ebook.id}`)

        if (!dryRun && listId > 0) {
          // Check if item already exists
          const existing = await db.select({ id: curatedListItems.id })
            .from(curatedListItems)
            .where(eq(curatedListItems.listId, listId))
            .limit(1)

          // Only insert if list is new or item doesn't exist
          try {
            await db.insert(curatedListItems).values({
              listId,
              bookType: 'ebook',
              bookId: ebook.id,
              externalTitle: bookName,
              externalCoverUrl: ebook.coverUrl,
              position: i + 1,
            })
            totalItems++
          } catch (err: any) {
            if (err.code === '23505') {
              console.log(`      (already exists)`)
            }
          }
        } else if (dryRun) {
          totalItems++
        }
      } else {
        console.log(`   ❌ [${i + 1}] ${bookName} -> NOT FOUND in ebooks`)
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                        SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`📋 Lists created:  ${totalLists}`)
  console.log(`📚 Items added:    ${totalItems}`)
  console.log(`🔗 Items linked:   ${linkedItems}`)
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
