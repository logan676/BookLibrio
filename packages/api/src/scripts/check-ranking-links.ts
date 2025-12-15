/**
 * Check Ranking Links Script
 *
 * Analyzes which ranking items can be linked to existing ebooks
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { curatedListItems, ebooks } from '../db/schema'
import { isNull, ilike } from 'drizzle-orm'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
const db = drizzle(pool)

async function check() {
  // Get unlinked items
  const unlinked = await db.select({
    id: curatedListItems.id,
    title: curatedListItems.externalTitle,
    author: curatedListItems.externalAuthor,
  }).from(curatedListItems).where(isNull(curatedListItems.bookId))

  console.log('Checking if unlinked books exist in ebooks table...\n')

  let matchCount = 0
  let notFoundCount = 0
  const notFound: string[] = []
  const found: { title: string, ebookId: number }[] = []

  for (const item of unlinked) {
    if (!item.title) continue

    // Try exact title match first
    const matches = await db.select({ id: ebooks.id, title: ebooks.title })
      .from(ebooks)
      .where(ilike(ebooks.title, item.title))
      .limit(1)

    if (matches.length > 0) {
      matchCount++
      found.push({ title: item.title, ebookId: matches[0].id })
    } else {
      notFoundCount++
      notFound.push(item.title)
    }
  }

  console.log(`Found in ebooks table: ${matchCount}`)
  console.log(`Not found in ebooks table: ${notFoundCount}`)

  if (found.length > 0) {
    console.log('\n=== Books that can be linked: ===')
    found.slice(0, 15).forEach(f => console.log(`  ✅ ${f.title} -> ebook ID ${f.ebookId}`))
    if (found.length > 15) console.log(`  ... and ${found.length - 15} more`)
  }

  if (notFound.length > 0) {
    console.log('\n=== Books NOT found (need to upload): ===')
    notFound.slice(0, 15).forEach(t => console.log(`  ❌ ${t}`))
    if (notFound.length > 15) console.log(`  ... and ${notFound.length - 15} more`)
  }

  await pool.end()
}

check()
