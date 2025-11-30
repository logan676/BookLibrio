import { existsSync } from 'fs'
import db from '../config/database.js'
import { generateCoverFromPdf, generateEbookCover } from './media.js'

let backgroundCoverGenRunning = false

export async function startBackgroundCoverGeneration() {
  if (backgroundCoverGenRunning) {
    console.log('[Cover Gen] Already running, skipping...')
    return
  }

  backgroundCoverGenRunning = true
  console.log('[Cover Gen] Starting background cover generation...')

  try {
    const magazines = db.prepare(`
      SELECT id, title, file_path FROM magazines
      WHERE cover_url IS NULL OR cover_url = ''
      ORDER BY id ASC
    `).all()

    const ebooks = db.prepare(`
      SELECT id, title, file_path FROM ebooks
      WHERE cover_url IS NULL OR cover_url = ''
      ORDER BY id ASC
    `).all()

    const totalMagazines = magazines.length
    const totalEbooks = ebooks.length

    if (totalMagazines === 0 && totalEbooks === 0) {
      console.log('[Cover Gen] All magazines and ebooks already have covers')
      backgroundCoverGenRunning = false
      return
    }

    console.log(`[Cover Gen] Found ${totalMagazines} magazines and ${totalEbooks} ebooks without covers`)

    // Process magazines
    if (totalMagazines > 0) {
      console.log(`[Cover Gen] Processing magazines...`)
      let success = 0
      let failed = 0

      for (let i = 0; i < magazines.length; i++) {
        const magazine = magazines[i]

        try {
          if (!existsSync(magazine.file_path)) {
            failed++
            continue
          }

          const coverUrl = await generateCoverFromPdf(magazine.file_path, magazine.id, magazine.title)
          db.prepare('UPDATE magazines SET cover_url = ? WHERE id = ?').run(coverUrl, magazine.id)
          success++

          if ((i + 1) % 50 === 0) {
            console.log(`[Cover Gen] Magazines: ${i + 1}/${totalMagazines} (${success} success, ${failed} failed)`)
          }
        } catch (error) {
          failed++
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`[Cover Gen] Magazines completed: ${success} success, ${failed} failed`)
    }

    // Process ebooks
    if (totalEbooks > 0) {
      console.log(`[Cover Gen] Processing ebooks...`)
      let success = 0
      let failed = 0

      for (let i = 0; i < ebooks.length; i++) {
        const ebook = ebooks[i]

        try {
          if (!existsSync(ebook.file_path)) {
            failed++
            continue
          }

          const coverUrl = await generateEbookCover(ebook.file_path, ebook.id, ebook.title)
          db.prepare('UPDATE ebooks SET cover_url = ? WHERE id = ?').run(coverUrl, ebook.id)
          success++

          if ((i + 1) % 50 === 0) {
            console.log(`[Cover Gen] Ebooks: ${i + 1}/${totalEbooks} (${success} success, ${failed} failed)`)
          }
        } catch (error) {
          failed++
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`[Cover Gen] Ebooks completed: ${success} success, ${failed} failed`)
    }

    console.log(`[Cover Gen] All cover generation completed`)
  } catch (error) {
    console.error('[Cover Gen] Error:', error)
  } finally {
    backgroundCoverGenRunning = false
  }
}
