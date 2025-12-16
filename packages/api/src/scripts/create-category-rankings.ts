/**
 * Create Category Rankings Script
 * Creates dashboard rankings/lists for specific book categories
 *
 * Run with: npx tsx src/scripts/create-category-rankings.ts [--dry-run]
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { ebooks, ebookCategories, rankings, rankingItems, curatedLists, curatedListItems } from '../db/schema'
import { eq, sql, desc } from 'drizzle-orm'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const db = drizzle(pool)

const dryRun = process.argv.includes('--dry-run')

// Configuration for rankings to create
const CATEGORY_RANKINGS = [
  {
    categorySlug: 'artificial-intelligence',
    listType: 'ai_ml_collection',
    title: 'AI与机器学习精选',
    subtitle: 'Artificial Intelligence & Machine Learning',
    description: '人工智能、深度学习、机器学习领域的经典与前沿著作',
    themeColor: '#6366F1', // Indigo
    category: 'technology',
  },
  {
    categorySlug: 'kevin-kelly',
    listType: 'kevin_kelly_collection',
    title: '凯文·凯利作品集',
    subtitle: 'Kevin Kelly Collection',
    description: '《连线》杂志创始主编凯文·凯利的科技预言与思想精华',
    themeColor: '#059669', // Emerald
    category: 'technology',
  },
  {
    categorySlug: 'biography',
    listType: 'biography_collection',
    title: '人物传记精选',
    subtitle: 'Biography Collection',
    description: '商业领袖、历史人物、文化名人的传奇人生',
    themeColor: '#DC2626', // Red
    category: 'biography',
  },
]

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('              CREATE CATEGORY RANKINGS')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  for (const config of CATEGORY_RANKINGS) {
    console.log(`\n📚 Processing: ${config.title}`)
    console.log(`   Category: ${config.categorySlug}`)

    // Get category
    const [category] = await db
      .select()
      .from(ebookCategories)
      .where(eq(ebookCategories.slug, config.categorySlug))

    if (!category) {
      console.log(`   ❌ Category not found: ${config.categorySlug}`)
      continue
    }

    // Get all books in this category
    const categoryBooks = await db
      .select()
      .from(ebooks)
      .where(eq(ebooks.categoryId, category.id))
      .orderBy(desc(ebooks.createdAt))

    console.log(`   Found ${categoryBooks.length} books`)

    if (categoryBooks.length === 0) {
      console.log(`   ⏭️ Skipping - no books`)
      continue
    }

    // Check if list already exists
    const existingList = await db
      .select()
      .from(curatedLists)
      .where(eq(curatedLists.listType, config.listType as any))
      .limit(1)

    if (existingList.length > 0) {
      console.log(`   ⚠️ List already exists (ID: ${existingList[0].id})`)

      // Update existing list items
      if (!dryRun) {
        // Delete old items
        await db.delete(curatedListItems).where(eq(curatedListItems.listId, existingList[0].id))

        // Add new items
        for (let i = 0; i < categoryBooks.length; i++) {
          const book = categoryBooks[i]
          await db.insert(curatedListItems).values({
            listId: existingList[0].id,
            bookType: 'ebook',
            bookId: book.id,
            position: i + 1,
          })
        }

        // Update book count
        await db.update(curatedLists)
          .set({ bookCount: categoryBooks.length })
          .where(eq(curatedLists.id, existingList[0].id))
      }
      console.log(`   ✅ Updated with ${categoryBooks.length} books`)
      continue
    }

    // Create new curated list
    if (!dryRun) {
      const [newList] = await db.insert(curatedLists).values({
        listType: config.listType as any,
        title: config.title,
        subtitle: config.subtitle,
        description: config.description,
        themeColor: config.themeColor,
        category: config.category,
        bookCount: categoryBooks.length,
        year: new Date().getFullYear(),
        isFeatured: true,
        isActive: true,
        sortOrder: 10,
      }).returning()

      console.log(`   ✅ Created list (ID: ${newList.id})`)

      // Add all books to the list
      for (let i = 0; i < categoryBooks.length; i++) {
        const book = categoryBooks[i]
        await db.insert(curatedListItems).values({
          listId: newList.id,
          bookType: 'ebook',
          bookId: book.id,
          position: i + 1,
        })
      }

      console.log(`   ✅ Added ${categoryBooks.length} books to list`)
    } else {
      console.log(`   📝 Would create list with ${categoryBooks.length} books`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                         COMPLETE')
  console.log('═══════════════════════════════════════════════════════════════')

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to create rankings')
  }

  await pool.end()
}

main().catch(async (err) => {
  console.error('Error:', err)
  await pool.end()
  process.exit(1)
})
