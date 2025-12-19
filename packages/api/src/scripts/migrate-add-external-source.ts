/**
 * Migration: Add external source fields to ebooks table
 *
 * This migration adds:
 * - external_id: Unique identifier from the source (e.g., 'gutenberg:12345')
 * - external_source: Source name (e.g., 'gutenberg', 'archive.org')
 * - external_url: Link to the original source
 *
 * Run with:
 *   npx tsx src/scripts/migrate-add-external-source.ts
 */

import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('    Migration: Add External Source Fields to Ebooks Table')
  console.log('═══════════════════════════════════════════════════════════════')

  const client = await pool.connect()

  try {
    // Check if columns already exist
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ebooks' AND column_name IN ('external_id', 'external_source', 'external_url')
    `)

    const existingColumns = checkResult.rows.map(r => r.column_name)
    console.log(`\nExisting columns: ${existingColumns.length > 0 ? existingColumns.join(', ') : 'none'}`)

    // Add missing columns
    if (!existingColumns.includes('external_id')) {
      await client.query(`ALTER TABLE ebooks ADD COLUMN external_id TEXT`)
      console.log('✅ Added column: external_id')
    }

    if (!existingColumns.includes('external_source')) {
      await client.query(`ALTER TABLE ebooks ADD COLUMN external_source TEXT`)
      console.log('✅ Added column: external_source')
    }

    if (!existingColumns.includes('external_url')) {
      await client.query(`ALTER TABLE ebooks ADD COLUMN external_url TEXT`)
      console.log('✅ Added column: external_url')
    }

    // Create index on external_id if it doesn't exist
    const indexCheck = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'ebooks' AND indexname = 'idx_ebooks_external_id'
    `)

    if (indexCheck.rows.length === 0) {
      await client.query(`CREATE INDEX idx_ebooks_external_id ON ebooks(external_id)`)
      console.log('✅ Created index: idx_ebooks_external_id')
    }

    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('                    Migration Complete')
    console.log('═══════════════════════════════════════════════════════════════')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
