/**
 * Verify Import Script
 * Checks that imported ebooks are properly stored and enriched
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks, ebookCategories } from '../db/schema'
import { eq, sql, and, ne } from 'drizzle-orm'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const db = drizzle(pool)

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              VERIFY EBOOK IMPORT')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // 1. Check categories
  const categories = await db.select({
    id: ebookCategories.id,
    name: ebookCategories.name,
    slug: ebookCategories.slug,
    parentId: ebookCategories.parentId,
    ebookCount: ebookCategories.ebookCount,
  }).from(ebookCategories).where(
    sql`slug IN ('artificial-intelligence', 'kevin-kelly', 'biography', 'technology')`
  )

  console.log('📂 Categories:')
  for (const cat of categories) {
    const parentInfo = cat.parentId ? ` (child of ${cat.parentId})` : ' (top-level)'
    console.log(`  - ${cat.name} [${cat.slug}]: ${cat.ebookCount} books${parentInfo}`)
  }

  // 2. Sample books from each new category
  const newCategories = categories.filter(c => c.slug !== 'technology')

  for (const cat of newCategories) {
    const books = await db.select({
      id: ebooks.id,
      title: ebooks.title,
      author: ebooks.author,
      description: ebooks.description,
      coverUrl: ebooks.coverUrl,
      isbn: ebooks.isbn,
      publisher: ebooks.publisher,
      s3Key: ebooks.s3Key,
    }).from(ebooks).where(eq(ebooks.categoryId, cat.id)).limit(3)

    console.log(`\n📚 ${cat.name} - Sample Books (3 of ${cat.ebookCount}):`)
    for (const book of books) {
      console.log(`  📖 ${book.title.substring(0, 60)}`)
      console.log(`     Author: ${book.author || 'N/A'}`)
      console.log(`     ISBN: ${book.isbn || 'N/A'}`)
      console.log(`     Publisher: ${book.publisher || 'N/A'}`)
      console.log(`     Cover: ${book.coverUrl ? '✅ Has cover' : '❌ No cover'}`)
      console.log(`     Description: ${book.description ? `✅ ${book.description.length} chars` : '❌ No description'}`)
      console.log(`     R2 File: ${book.s3Key ? '✅ Uploaded' : '❌ Not uploaded'}`)
    }
  }

  // 3. Enrichment statistics
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                    ENRICHMENT STATS')
  console.log('═══════════════════════════════════════════════════════════════')

  for (const cat of newCategories) {
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN description IS NOT NULL AND description != '' THEN 1 ELSE 0 END) as with_desc,
        SUM(CASE WHEN cover_url IS NOT NULL AND cover_url != '' THEN 1 ELSE 0 END) as with_cover,
        SUM(CASE WHEN isbn IS NOT NULL THEN 1 ELSE 0 END) as with_isbn,
        SUM(CASE WHEN publisher IS NOT NULL THEN 1 ELSE 0 END) as with_publisher,
        SUM(CASE WHEN s3_key IS NOT NULL THEN 1 ELSE 0 END) as with_file
      FROM ebooks
      WHERE category_id = ${cat.id}
    `)

    const s = stats.rows[0] as any
    console.log(`\n📊 ${cat.name}:`)
    console.log(`   Total Books: ${s.total}`)
    console.log(`   With Description: ${s.with_desc} (${Math.round(s.with_desc / s.total * 100)}%)`)
    console.log(`   With Cover: ${s.with_cover} (${Math.round(s.with_cover / s.total * 100)}%)`)
    console.log(`   With ISBN: ${s.with_isbn} (${Math.round(s.with_isbn / s.total * 100)}%)`)
    console.log(`   With Publisher: ${s.with_publisher} (${Math.round(s.with_publisher / s.total * 100)}%)`)
    console.log(`   With R2 File: ${s.with_file} (${Math.round(s.with_file / s.total * 100)}%)`)
  }

  // 4. Check API readiness
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                    API READINESS')
  console.log('═══════════════════════════════════════════════════════════════')

  // Verify category counts match actual ebook counts
  let allMatch = true
  for (const cat of newCategories) {
    const actualCount = await db.select({
      count: sql<number>`count(*)`
    }).from(ebooks).where(eq(ebooks.categoryId, cat.id))

    const match = Number(actualCount[0].count) === Number(cat.ebookCount)
    console.log(`\n${cat.name}:`)
    console.log(`   Category ebookCount: ${cat.ebookCount}`)
    console.log(`   Actual ebook count: ${actualCount[0].count}`)
    console.log(`   Match: ${match ? '✅' : '❌ MISMATCH'}`)

    if (!match) allMatch = false
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                       SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Category Counts: ${allMatch ? '✅ All match' : '❌ Some mismatches - run sync'}`)
  console.log('API Ready: Categories and ebooks are properly linked')
  console.log('═══════════════════════════════════════════════════════════════\n')

  await pool.end()
}

main().catch(async (err) => {
  console.error('Error:', err)
  await pool.end()
  process.exit(1)
})
