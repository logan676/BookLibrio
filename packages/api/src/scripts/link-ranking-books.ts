/**
 * Link Ranking Books Script
 *
 * Links existing ebooks to curated list items (external rankings)
 * by matching titles.
 *
 * Run with:
 *   npx tsx src/scripts/link-ranking-books.ts [options]
 *
 * Options:
 *   --dry-run    Preview without saving
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { curatedListItems, ebooks } from '../db/schema'
import { eq, isNull, ilike, or, sql } from 'drizzle-orm'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
const db = drizzle(pool)

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

/**
 * Normalize title for better matching
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "'")  // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/[^a-z0-9\s]/g, '')  // Remove special chars
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              LINK RANKING BOOKS TO EBOOKS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Get all unlinked ranking items
  const unlinkedItems = await db.select({
    id: curatedListItems.id,
    listId: curatedListItems.listId,
    title: curatedListItems.externalTitle,
    author: curatedListItems.externalAuthor,
  }).from(curatedListItems).where(isNull(curatedListItems.bookId))

  console.log(`Found ${unlinkedItems.length} unlinked ranking items\n`)

  // Get all ebooks for matching
  const allEbooks = await db.select({
    id: ebooks.id,
    title: ebooks.title,
    author: ebooks.author,
  }).from(ebooks)

  // Create normalized title index for faster matching
  const ebooksByNormalizedTitle = new Map<string, { id: number; title: string; author: string | null }>()
  for (const ebook of allEbooks) {
    const normalizedTitle = normalizeTitle(ebook.title)
    ebooksByNormalizedTitle.set(normalizedTitle, ebook)
  }

  let linkedCount = 0
  let notFoundCount = 0
  const linked: { itemId: number; title: string; ebookId: number }[] = []
  const notFound: string[] = []

  for (const item of unlinkedItems) {
    if (!item.title) continue

    const normalizedItemTitle = normalizeTitle(item.title)

    // Try normalized title match
    let matchedEbook = ebooksByNormalizedTitle.get(normalizedItemTitle)

    // Try partial match if no exact match
    if (!matchedEbook) {
      for (const [normalizedEbookTitle, ebook] of ebooksByNormalizedTitle) {
        // Check if one contains the other
        if (normalizedItemTitle.includes(normalizedEbookTitle) ||
            normalizedEbookTitle.includes(normalizedItemTitle)) {
          matchedEbook = ebook
          break
        }
      }
    }

    if (matchedEbook) {
      linked.push({ itemId: item.id, title: item.title, ebookId: matchedEbook.id })

      if (!dryRun) {
        try {
          await db.update(curatedListItems)
            .set({ bookId: matchedEbook.id, bookType: 'ebook' })
            .where(eq(curatedListItems.id, item.id))
          linkedCount++
          console.log(`✅ Linked: "${item.title}" -> ebook ID ${matchedEbook.id}`)
        } catch (err: any) {
          if (err.code === '23505') {
            // Duplicate key - book already exists in this list
            console.log(`⚠️ Skipped (duplicate): "${item.title}" already in list`)
          } else {
            throw err
          }
        }
      } else {
        linkedCount++
        console.log(`✅ Linked: "${item.title}" -> ebook ID ${matchedEbook.id}`)
      }
    } else {
      notFoundCount++
      notFound.push(item.title)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                        SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`✅ Linked:     ${linkedCount}`)
  console.log(`❌ Not found:  ${notFoundCount}`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (notFound.length > 0) {
    console.log('\n📚 Books not found in ebooks table (need to upload):')
    notFound.forEach(t => console.log(`  - ${t}`))
  }

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
