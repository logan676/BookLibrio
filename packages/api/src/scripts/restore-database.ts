/**
 * Database Restore Script
 *
 * Restores database from JSON backup files.
 * Useful for migrating to a new database provider.
 *
 * Usage:
 *   cd packages/api
 *   npx tsx src/scripts/restore-database.ts <backup-folder>
 *
 * Example:
 *   npx tsx src/scripts/restore-database.ts backups/2025-12-14_19-30-00
 *
 * WARNING: This will OVERWRITE existing data in the target database!
 */

import { db } from '../db/client'
import { sql } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'

// Tables in order of restoration (respecting foreign key dependencies)
const RESTORE_ORDER = [
  // Independent tables first
  'ebook_categories',
  'book_categories',
  'publishers',
  'badges',

  // Core content
  'ebooks',
  'magazines',
  'audio_series',
  'audio_files',

  // Users (before user-dependent data)
  'users',

  // User-dependent data
  'sessions',
  'user_badges',
  'user_bookshelves',
  'user_following',
  'user_settings',

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
  'book_lists',
  'book_list_items',
  'book_list_followers',
  'thoughts',
  'thought_likes',
  'thought_comments',

  // Curated content
  'curated_lists',
  'curated_list_items',
  'rankings',
  'ranking_items',

  // Reviews
  'book_reviews',
  'review_likes',

  // AI features
  'ai_book_summaries',
  'ai_chat_sessions',
  'ai_chat_messages',
  'dictionary_lookups',

  // Notifications
  'notifications',
]

async function restoreTable(tableName: string, backupPath: string): Promise<{ rows: number; error?: string }> {
  const filePath = path.join(backupPath, `${tableName}.json`)

  // Check if backup file exists
  if (!fs.existsSync(filePath)) {
    return { rows: 0, error: 'backup file not found' }
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    if (!Array.isArray(data) || data.length === 0) {
      return { rows: 0, error: 'empty or invalid data' }
    }

    // Get column names from first row
    const columns = Object.keys(data[0])

    // Clear existing data (with CASCADE to handle foreign keys)
    await db.execute(sql.raw(`TRUNCATE TABLE "${tableName}" CASCADE`))

    // Insert data in batches
    const batchSize = 100
    let inserted = 0

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)

      for (const row of batch) {
        const values = columns.map(col => {
          const val = row[col]
          if (val === null) return 'NULL'
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
          if (typeof val === 'number') return val.toString()
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
          return `'${String(val).replace(/'/g, "''")}'`
        })

        const insertSql = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')})`

        try {
          await db.execute(sql.raw(insertSql))
          inserted++
        } catch (e: any) {
          // Skip duplicate key errors, log others
          if (!e.message?.includes('duplicate key')) {
            console.error(`  Error inserting row: ${e.message?.substring(0, 50)}`)
          }
        }
      }
    }

    // Reset sequence if table has serial/identity column
    try {
      await db.execute(sql.raw(`
        SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'),
          COALESCE((SELECT MAX(id) FROM "${tableName}"), 1))
      `))
    } catch {
      // Table might not have 'id' column, ignore
    }

    return { rows: inserted }
  } catch (error: any) {
    return { rows: 0, error: error.message?.substring(0, 50) }
  }
}

async function main() {
  const backupPath = process.argv[2]

  if (!backupPath) {
    console.error('\n❌ 请指定备份目录')
    console.error('   用法: npx tsx src/scripts/restore-database.ts <backup-folder>')
    console.error('   示例: npx tsx src/scripts/restore-database.ts backups/2025-12-14_19-30-00\n')
    process.exit(1)
  }

  const fullPath = path.isAbsolute(backupPath) ? backupPath : path.join(process.cwd(), backupPath)

  if (!fs.existsSync(fullPath)) {
    console.error(`\n❌ 备份目录不存在: ${fullPath}\n`)
    process.exit(1)
  }

  // Check for metadata
  const metadataPath = path.join(fullPath, '_metadata.json')
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
    console.log(`\n📦 恢复备份: ${metadata.backupDate}`)
    console.log(`   原始行数: ${metadata.totalRows?.toLocaleString() || 'unknown'}`)
  }

  console.log(`📁 备份目录: ${fullPath}\n`)
  console.log('⚠️  警告: 这将覆盖目标数据库中的现有数据!')
  console.log('─'.repeat(50))

  let totalRows = 0
  let successCount = 0
  let failCount = 0

  for (const tableName of RESTORE_ORDER) {
    const result = await restoreTable(tableName, fullPath)

    if (result.error) {
      console.log(`⚠️  ${tableName}: ${result.error}`)
      failCount++
    } else if (result.rows > 0) {
      console.log(`✅ ${tableName}: ${result.rows} rows restored`)
      totalRows += result.rows
      successCount++
    } else {
      console.log(`⏭️  ${tableName}: skipped (no data)`)
    }
  }

  console.log('─'.repeat(50))
  console.log(`\n✅ 恢复完成!`)
  console.log(`   成功: ${successCount} 表`)
  console.log(`   跳过/失败: ${failCount} 表`)
  console.log(`   总行数: ${totalRows.toLocaleString()} rows\n`)

  process.exit(0)
}

main().catch(e => {
  console.error('\n❌ 恢复失败:', e.message)
  process.exit(1)
})
