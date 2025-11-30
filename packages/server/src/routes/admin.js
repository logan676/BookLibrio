import { Router } from 'express'
import { existsSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, basename, dirname } from 'path'
import db from '../config/database.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

// Admin import progress tracking
let adminImportProgress = { running: false, type: '', current: 0, total: 0, currentItem: '', errors: [] }

// Admin: Import magazines or ebooks from folder
router.post('/import', requireAdmin, async (req, res) => {
  const { type, folderPath } = req.body

  if (!type || !folderPath) {
    return res.status(400).json({ error: 'Missing type or folderPath' })
  }

  if (!['magazine', 'ebook'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Must be magazine or ebook' })
  }

  if (adminImportProgress.running) {
    return res.status(409).json({ error: 'Import already in progress' })
  }

  if (!existsSync(folderPath)) {
    return res.status(400).json({ error: 'Folder path does not exist' })
  }

  adminImportProgress = { running: true, type, current: 0, total: 0, currentItem: '', errors: [] }

  res.json({ message: `Starting ${type} import from ${folderPath}` })

  // Process in background
  ;(async () => {
    try {
      if (type === 'magazine') {
        await adminImportMagazines(folderPath)
      } else {
        await adminImportEbooks(folderPath)
      }
    } catch (err) {
      console.error('Admin import error:', err)
      adminImportProgress.errors.push(err.message)
    } finally {
      adminImportProgress.running = false
    }
  })()
})

// Admin import progress
router.get('/import/progress', requireAdmin, (req, res) => {
  res.json(adminImportProgress)
})

// Admin: Import magazines from folder
async function adminImportMagazines(folderPath) {
  const pdfFiles = []
  async function findPdfs(dir) {
    const items = await readdir(dir)
    for (const item of items) {
      if (item.startsWith('.') || item.startsWith('._')) continue
      const fullPath = join(dir, item)
      const itemStat = await stat(fullPath)
      if (itemStat.isDirectory()) {
        await findPdfs(fullPath)
      } else if (item.toLowerCase().endsWith('.pdf')) {
        pdfFiles.push(fullPath)
      }
    }
  }

  await findPdfs(folderPath)
  adminImportProgress.total = pdfFiles.length
  console.log(`[Admin Import] Found ${pdfFiles.length} PDF files`)

  let defaultPublisher = db.prepare('SELECT * FROM publishers WHERE name = ?').get('Imported')
  if (!defaultPublisher) {
    const result = db.prepare('INSERT INTO publishers (name, description) VALUES (?, ?)').run('Imported', 'Manually imported magazines')
    defaultPublisher = { id: result.lastInsertRowid, name: 'Imported' }
  }

  let imported = 0, skipped = 0

  for (const pdfPath of pdfFiles) {
    adminImportProgress.current++
    adminImportProgress.currentItem = basename(pdfPath)

    const existing = db.prepare('SELECT id FROM magazines WHERE file_path = ?').get(pdfPath)
    if (existing) {
      skipped++
      continue
    }

    try {
      const fileStat = await stat(pdfPath)
      if (fileStat.size < 10240) {
        skipped++
        continue
      }

      const title = basename(pdfPath, '.pdf')
      const yearMatch = pdfPath.match(/20\d{2}/)
      const year = yearMatch ? parseInt(yearMatch[0]) : null

      db.prepare(`
        INSERT INTO magazines (publisher_id, title, file_path, file_size, year)
        VALUES (?, ?, ?, ?, ?)
      `).run(defaultPublisher.id, title, pdfPath, fileStat.size, year)

      imported++
    } catch (err) {
      adminImportProgress.errors.push(`${basename(pdfPath)}: ${err.message}`)
    }
  }

  console.log(`[Admin Import] Magazines complete: ${imported} imported, ${skipped} skipped`)
}

// Admin: Import ebooks from folder
async function adminImportEbooks(folderPath) {
  const ebookFiles = []
  async function findEbooks(dir) {
    const items = await readdir(dir)
    for (const item of items) {
      if (item.startsWith('.') || item.startsWith('._')) continue
      const fullPath = join(dir, item)
      const itemStat = await stat(fullPath)
      if (itemStat.isDirectory()) {
        await findEbooks(fullPath)
      } else {
        const lower = item.toLowerCase()
        if (lower.endsWith('.epub') || lower.endsWith('.pdf')) {
          ebookFiles.push(fullPath)
        }
      }
    }
  }

  await findEbooks(folderPath)
  adminImportProgress.total = ebookFiles.length
  console.log(`[Admin Import] Found ${ebookFiles.length} ebook files`)

  let defaultCategory = db.prepare('SELECT * FROM ebook_categories WHERE name = ?').get('Imported')
  if (!defaultCategory) {
    const result = db.prepare('INSERT INTO ebook_categories (name, description) VALUES (?, ?)').run('Imported', 'Manually imported ebooks')
    defaultCategory = { id: result.lastInsertRowid, name: 'Imported' }
  }

  let imported = 0, skipped = 0

  for (const ebookPath of ebookFiles) {
    adminImportProgress.current++
    adminImportProgress.currentItem = basename(ebookPath)

    const existing = db.prepare('SELECT id FROM ebooks WHERE file_path = ?').get(ebookPath)
    if (existing) {
      skipped++
      continue
    }

    try {
      const fileStat = await stat(ebookPath)
      const title = basename(ebookPath).replace(/\.(epub|pdf)$/i, '')
      const fileType = ebookPath.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf'

      db.prepare(`
        INSERT INTO ebooks (category_id, title, file_path, file_size, file_type)
        VALUES (?, ?, ?, ?, ?)
      `).run(defaultCategory.id, title, ebookPath, fileStat.size, fileType)

      imported++
    } catch (err) {
      adminImportProgress.errors.push(`${basename(ebookPath)}: ${err.message}`)
    }
  }

  console.log(`[Admin Import] Ebooks complete: ${imported} imported, ${skipped} skipped`)
}

// Admin: Browse folders
router.get('/browse', requireAdmin, async (req, res) => {
  try {
    const requestedPath = req.query.path || '/Volumes'

    if (!requestedPath.startsWith('/Volumes')) {
      return res.status(403).json({ error: 'Access denied. Can only browse /Volumes' })
    }

    if (!existsSync(requestedPath)) {
      return res.status(404).json({ error: 'Path does not exist' })
    }

    const pathStat = await stat(requestedPath)
    if (!pathStat.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' })
    }

    const items = await readdir(requestedPath)
    const folders = []

    for (const item of items) {
      if (item.startsWith('.')) continue
      const fullPath = join(requestedPath, item)
      try {
        const itemStat = await stat(fullPath)
        if (itemStat.isDirectory()) {
          folders.push({ name: item, path: fullPath })
        }
      } catch {
        // Skip inaccessible items
      }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name))

    res.json({
      currentPath: requestedPath,
      parentPath: requestedPath === '/Volumes' ? null : dirname(requestedPath),
      folders
    })
  } catch (error) {
    console.error('Browse folders error:', error)
    res.status(500).json({ error: 'Failed to browse folders' })
  }
})

// Admin: Get stats
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const magazineCount = db.prepare('SELECT COUNT(*) as count FROM magazines').get().count
    const magazinePreprocessed = db.prepare('SELECT COUNT(*) as count FROM magazines WHERE preprocessed = 1').get().count
    const ebookCount = db.prepare('SELECT COUNT(*) as count FROM ebooks').get().count
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count

    res.json({
      magazines: { total: magazineCount, preprocessed: magazinePreprocessed },
      ebooks: ebookCount,
      users: userCount
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

// Admin: Get user list
router.get('/users', requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, email, is_admin, created_at
      FROM users
      ORDER BY created_at DESC
    `).all()
    res.json(users)
  } catch (error) {
    console.error('Admin users error:', error)
    res.status(500).json({ error: 'Failed to get users' })
  }
})

export default router
