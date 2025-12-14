/**
 * Complete Database Backup Script
 *
 * Exports ALL database tables to JSON files for local backup.
 * Uses raw SQL queries to avoid ORM schema mismatch issues.
 *
 * Usage:
 *   cd packages/api
 *   npx tsx src/scripts/backup-database.ts
 *
 * Output:
 *   backups/YYYY-MM-DD/
 *     ├── _metadata.json      (backup info)
 *     ├── ebooks.json         (all ebooks)
 *     ├── magazines.json      (all magazines)
 *     └── ...                 (other tables)
 */

import { db } from '../db/client'
import { sql } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BACKUP_DIR = path.join(__dirname, '../../backups')

// All tables to backup (using raw table names)
const TABLES_TO_BACKUP = [
  // Core content
  'ebooks',
  'magazines',
  'ebook_categories',
  'book_categories',
  'publishers',
  'audio_series',
  'audio_files',

  // User data
  'users',
  'sessions',
  'user_badges',
  'user_bookshelves',

  // Reading data
  'notes',
  'reading_history',
  'reading_sessions',
  'daily_reading_stats',

  // Annotations
  'ebook_underlines',
  'ebook_ideas',
  'magazine_underlines',
  'magazine_ideas',

  // Social
  'badges',
  'book_lists',
  'book_list_items',
  'book_list_followers',
  'user_following',
  'thoughts',
  'thought_likes',
  'thought_comments',

  // Curated content
  'curated_lists',
  'curated_list_items',
  'rankings',
  'ranking_items',

  // AI features
  'ai_book_summaries',
  'ai_chat_sessions',
  'ai_chat_messages',
  'dictionary_lookups',

  // Other
  'book_reviews',
  'review_likes',
  'notifications',
  'user_settings',
]

async function backupTable(tableName: string, backupPath: string): Promise<{ rows: number; error?: string }> {
  try {
    // Check if table exists first
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ) as exists
    `)

    const exists = (tableCheck.rows[0] as any)?.exists
    if (!exists) {
      return { rows: 0, error: 'table not found' }
    }

    // Get all data from table using raw SQL
    const result = await db.execute(sql.raw(`SELECT * FROM "${tableName}"`))
    const data = result.rows

    // Write to file
    const filename = path.join(backupPath, `${tableName}.json`)
    fs.writeFileSync(filename, JSON.stringify(data, null, 2))

    return { rows: data.length }
  } catch (error: any) {
    return { rows: 0, error: error.message?.substring(0, 50) }
  }
}

async function main() {
  const timestamp = new Date().toISOString().split('T')[0]
  const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
  const backupPath = path.join(BACKUP_DIR, `${timestamp}_${timeStr}`)

  // Create backup directory
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true })
  }

  console.log(`\n📦 BookPost 数据库完整备份`)
  console.log(`📁 备份目录: ${backupPath}\n`)
  console.log('─'.repeat(50))

  const results: Record<string, { rows: number; error?: string }> = {}
  let totalRows = 0
  let successCount = 0
  let failCount = 0

  for (const tableName of TABLES_TO_BACKUP) {
    const result = await backupTable(tableName, backupPath)
    results[tableName] = result

    if (result.error) {
      console.log(`⚠️  ${tableName}: ${result.error}`)
      failCount++
    } else {
      console.log(`✅ ${tableName}: ${result.rows} rows`)
      totalRows += result.rows
      successCount++
    }
  }

  console.log('─'.repeat(50))

  // Create metadata file
  const metadata = {
    backupDate: new Date().toISOString(),
    backupPath,
    totalTables: TABLES_TO_BACKUP.length,
    successTables: successCount,
    failedTables: failCount,
    totalRows,
    tables: results,
    services: {
      database: 'Supabase PostgreSQL',
      fileStorage: 'Cloudflare R2',
      apiHost: 'Fly.dev',
    },
    restoreInstructions: 'See docs/BACKUP_AND_MIGRATION.md',
  }

  fs.writeFileSync(
    path.join(backupPath, '_metadata.json'),
    JSON.stringify(metadata, null, 2)
  )

  console.log(`\n✅ 备份完成!`)
  console.log(`   成功: ${successCount} 表`)
  console.log(`   跳过: ${failCount} 表 (不存在或出错)`)
  console.log(`   总行数: ${totalRows.toLocaleString()} rows`)
  console.log(`   位置: ${backupPath}`)

  // Calculate size
  const files = fs.readdirSync(backupPath)
  let totalSize = 0
  files.forEach(f => {
    totalSize += fs.statSync(path.join(backupPath, f)).size
  })
  console.log(`   大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`)

  process.exit(0)
}

main().catch(e => {
  console.error('\n❌ 备份失败:', e.message)
  process.exit(1)
})
