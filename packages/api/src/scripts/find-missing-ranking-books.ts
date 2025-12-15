/**
 * Find Missing Ranking Books
 *
 * Finds which unlinked ranking books exist on local disk
 * so they can be uploaded.
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { curatedListItems } from '../db/schema'
import { isNull } from 'drizzle-orm'
import { execSync } from 'child_process'
import path from 'path'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
const db = drizzle(pool)

const LOCAL_BASE = '/Volumes/杂志/【基础版】英文书单2024年全年更新'

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

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('         FIND MISSING RANKING BOOKS ON LOCAL DISK')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Get unlinked items
  const unlinkedItems = await db.select({
    id: curatedListItems.id,
    title: curatedListItems.externalTitle,
    author: curatedListItems.externalAuthor,
  }).from(curatedListItems).where(isNull(curatedListItems.bookId))

  console.log(`Found ${unlinkedItems.length} unlinked ranking items\n`)

  // Build local EPUB index
  console.log('Building local EPUB index...')
  let localFiles: string[] = []
  try {
    const result = execSync(`find "${LOCAL_BASE}" -name "*.epub" -type f 2>/dev/null`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024
    })
    localFiles = result.trim().split('\n').filter(f => f.length > 0)
    console.log(`Found ${localFiles.length} EPUB files locally\n`)
  } catch (error) {
    console.error('Could not search local files:', error)
    await pool.end()
    return
  }

  // Create normalized title map from local files
  const localByTitle = new Map<string, string>()
  for (const filePath of localFiles) {
    const fileName = path.basename(filePath, '.epub')
    const normalizedName = normalizeTitle(fileName)
    localByTitle.set(normalizedName, filePath)
  }

  const found: { title: string; localPath: string }[] = []
  const notFound: string[] = []

  // Deduplicate titles
  const seenTitles = new Set<string>()

  for (const item of unlinkedItems) {
    if (!item.title) continue

    const normalizedTitle = normalizeTitle(item.title)
    if (seenTitles.has(normalizedTitle)) continue
    seenTitles.add(normalizedTitle)

    // Try exact match
    let localPath = localByTitle.get(normalizedTitle)

    // Try partial match
    if (!localPath) {
      for (const [localTitle, path] of localByTitle) {
        if (localTitle.includes(normalizedTitle) || normalizedTitle.includes(localTitle)) {
          localPath = path
          break
        }
      }
    }

    if (localPath) {
      found.push({ title: item.title, localPath })
    } else {
      notFound.push(item.title)
    }
  }

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('                        RESULTS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`✅ Found on disk:     ${found.length}`)
  console.log(`❌ Not found on disk: ${notFound.length}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  if (found.length > 0) {
    console.log('📚 Books found on disk (can be uploaded):')
    found.forEach(f => console.log(`  ✅ "${f.title}"\n     -> ${f.localPath}`))
  }

  if (notFound.length > 0) {
    console.log('\n📚 Books NOT found on disk:')
    notFound.forEach(t => console.log(`  ❌ ${t}`))
  }

  await pool.end()
}

main().catch(async (err) => {
  console.error('Error:', err)
  await pool.end()
  process.exit(1)
})
