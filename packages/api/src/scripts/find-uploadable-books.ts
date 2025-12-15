/**
 * Find Uploadable Books Script
 *
 * Scans local disk and compares with cloud ebooks to find
 * books that can be uploaded.
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks } from '../db/schema'
import { execSync } from 'child_process'
import path from 'path'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
const db = drizzle(pool)

const LOCAL_BASE = '/Volumes/杂志/【基础版】英文书单2024年全年更新'

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
  // 获取云端所有 ebooks
  const cloudEbooks = await db.select({ id: ebooks.id, title: ebooks.title }).from(ebooks)
  const cloudTitles = new Set(cloudEbooks.map(e => normalizeTitle(e.title)))

  console.log('云端 ebooks 数量:', cloudEbooks.length)

  // 获取本地所有 EPUB 文件
  const localFiles = execSync(`find "${LOCAL_BASE}" -name "*.epub" -type f 2>/dev/null | grep -v "/\\._"`, {
    encoding: 'utf-8',
    maxBuffer: 100 * 1024 * 1024
  }).trim().split('\n').filter(f => f.length > 0)

  console.log('本地 EPUB 文件数量:', localFiles.length)

  // 找出缺失的书
  const missing: { title: string; path: string }[] = []
  const seenTitles = new Set<string>()

  for (const filePath of localFiles) {
    const fileName = path.basename(filePath, '.epub')
    const normalizedName = normalizeTitle(fileName)

    // 跳过重复
    if (seenTitles.has(normalizedName)) continue
    seenTitles.add(normalizedName)

    // 检查云端是否有
    let found = cloudTitles.has(normalizedName)

    // 尝试部分匹配
    if (!found) {
      for (const cloudTitle of cloudTitles) {
        if (cloudTitle.includes(normalizedName) || normalizedName.includes(cloudTitle)) {
          found = true
          break
        }
      }
    }

    if (!found) {
      missing.push({ title: fileName, path: filePath })
    }
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('缺失书籍（本地有，云端没有）:', missing.length)
  console.log('='.repeat(60))

  // 按目录分组
  const byFolder = new Map<string, string[]>()
  for (const m of missing) {
    const relativePath = m.path.replace(LOCAL_BASE + '/', '')
    const folder = relativePath.split('/').slice(0, 1).join('/')
    if (!byFolder.has(folder)) byFolder.set(folder, [])
    byFolder.get(folder)!.push(m.title)
  }

  console.log('')
  console.log('按来源分组:')
  const sortedFolders = Array.from(byFolder.entries()).sort((a, b) => b[1].length - a[1].length)
  for (const [folder, books] of sortedFolders) {
    console.log(`  ${folder}: ${books.length} 本`)
  }

  // 显示前50本缺失的书
  console.log('')
  console.log('缺失书籍示例 (前50本):')
  missing.slice(0, 50).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.title}`)
  })

  if (missing.length > 50) {
    console.log(`  ... 还有 ${missing.length - 50} 本`)
  }

  await pool.end()
}

main().catch(async (err) => {
  console.error('Error:', err)
  await pool.end()
  process.exit(1)
})
