import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks, ebookCategories } from '../db/schema'
import { eq, sql } from 'drizzle-orm'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const db = drizzle(pool)

async function main() {
  // Get category IDs
  const [aiCat] = await db.select().from(ebookCategories).where(eq(ebookCategories.slug, 'artificial-intelligence'))
  const [kkCat] = await db.select().from(ebookCategories).where(eq(ebookCategories.slug, 'kevin-kelly'))
  const [bioCat] = await db.select().from(ebookCategories).where(eq(ebookCategories.slug, 'biography'))

  // Count by category
  const aiCount = await db.select({ count: sql<number>`count(*)` }).from(ebooks).where(eq(ebooks.categoryId, aiCat?.id))
  const kkCount = await db.select({ count: sql<number>`count(*)` }).from(ebooks).where(eq(ebooks.categoryId, kkCat?.id))
  const bioCount = await db.select({ count: sql<number>`count(*)` }).from(ebooks).where(eq(ebooks.categoryId, bioCat?.id))

  // Total ebooks
  const total = await db.select({ count: sql<number>`count(*)` }).from(ebooks)

  console.log('📊 Current Book Counts:')
  console.log(`  🤖 AI/机器学习: ${aiCount[0].count}`)
  console.log(`  📚 凯文凯利系列: ${kkCount[0].count}`)
  console.log(`  👤 人物传记: ${bioCount[0].count}`)
  console.log(`  📖 Total Ebooks: ${total[0].count}`)

  // Check for duplicates
  const duplicates = await db.execute(sql`
    SELECT title, COUNT(*) as count
    FROM ebooks
    GROUP BY title
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `)

  if (duplicates.rows.length > 0) {
    console.log('\n⚠️ Top Duplicate Titles:')
    for (const row of duplicates.rows as Array<{title: string, count: number}>) {
      console.log(`  - "${row.title}" (${row.count} copies)`)
    }
  }

  await pool.end()
}

main()
