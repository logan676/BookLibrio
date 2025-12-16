/**
 * Deduplicate Ebooks Script
 * Removes duplicate ebook records, keeping the oldest (first imported) one
 *
 * Run with: npx tsx src/scripts/dedupe-ebooks.ts [--dry-run]
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks } from '../db/schema'
import { eq, sql, inArray } from 'drizzle-orm'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const db = drizzle(pool)

const dryRun = process.argv.includes('--dry-run')

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              DEDUPLICATE EBOOKS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Find all duplicate titles
  const duplicates = await db.execute(sql`
    SELECT title, array_agg(id ORDER BY id ASC) as ids, COUNT(*) as count
    FROM ebooks
    GROUP BY title
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `)

  if (duplicates.rows.length === 0) {
    console.log('✅ No duplicates found!')
    await pool.end()
    return
  }

  console.log(`Found ${duplicates.rows.length} titles with duplicates\n`)

  let totalDeleted = 0
  let totalSkipped = 0

  for (const row of duplicates.rows as Array<{ title: string; ids: number[]; count: number }>) {
    const idsToDelete = row.ids.slice(1) // Keep the first (oldest) one
    console.log(`📖 "${row.title.substring(0, 50)}..." - keeping ID ${row.ids[0]}, deleting ${idsToDelete.length} duplicates`)

    if (!dryRun) {
      for (const id of idsToDelete) {
        try {
          await db.delete(ebooks).where(eq(ebooks.id, id))
          totalDeleted++
        } catch (err: any) {
          if (err.code === '23503') {
            // Foreign key constraint - skip this book
            console.log(`  ⏭️ Skipped ID ${id} (has related data)`)
            totalSkipped++
          } else {
            throw err
          }
        }
      }
    } else {
      totalDeleted += idsToDelete.length
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log(`Total duplicates ${dryRun ? 'to be ' : ''}deleted: ${totalDeleted}`)
  if (!dryRun && totalSkipped > 0) {
    console.log(`Total skipped (has related data): ${totalSkipped}`)
  }
  console.log('═══════════════════════════════════════════════════════════════')

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to actually delete duplicates')
  }

  await pool.end()
}

main()
