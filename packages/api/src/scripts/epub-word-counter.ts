/**
 * EPUB Word Counter - Isolated subprocess for parsing EPUBs
 *
 * This script runs in isolation to prevent crashes from affecting the main process.
 * Usage: npx tsx epub-word-counter.ts <epub-file-path>
 * Outputs: JSON { wordCount: number } or { error: string }
 */

// @ts-ignore - epub2 has type issues
import { EPub } from 'epub2'
import { decode } from 'html-entities'

const filePath = process.argv[2]

if (!filePath) {
  console.log(JSON.stringify({ error: 'No file path provided' }))
  process.exit(1)
}

/**
 * Strip HTML tags and decode entities from text
 */
function cleanHtml(html: string): string {
  let text = decode(html)
  text = text.replace(/<[^>]*>/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()
  return text
}

/**
 * Count words in text (handles Chinese and English)
 */
function countWords(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const englishWords = text
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0 && /[a-zA-Z0-9]/.test(word))
    .length
  return chineseChars + englishWords
}

// Set a timeout to prevent hanging
const timeout = setTimeout(() => {
  console.log(JSON.stringify({ error: 'Timeout' }))
  process.exit(1)
}, 60000)

try {
  const epub = new EPub(filePath)

  epub.on('end', async () => {
    try {
      let totalWords = 0
      const chapters = epub.flow || []
      let processedChapters = 0
      const totalChapters = chapters.length

      if (totalChapters === 0) {
        clearTimeout(timeout)
        console.log(JSON.stringify({ wordCount: 0 }))
        process.exit(0)
      }

      for (const chapter of chapters) {
        if (!chapter.id) {
          processedChapters++
          if (processedChapters === totalChapters) {
            clearTimeout(timeout)
            console.log(JSON.stringify({ wordCount: totalWords }))
            process.exit(0)
          }
          continue
        }

        try {
          epub.getChapter(chapter.id, (err: Error | null, text: string) => {
            processedChapters++

            if (!err && text) {
              try {
                const cleanText = cleanHtml(text)
                totalWords += countWords(cleanText)
              } catch {}
            }

            if (processedChapters === totalChapters) {
              clearTimeout(timeout)
              console.log(JSON.stringify({ wordCount: totalWords }))
              process.exit(0)
            }
          })
        } catch {
          processedChapters++
          if (processedChapters === totalChapters) {
            clearTimeout(timeout)
            console.log(JSON.stringify({ wordCount: totalWords }))
            process.exit(0)
          }
        }
      }
    } catch (e) {
      clearTimeout(timeout)
      console.log(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }))
      process.exit(1)
    }
  })

  epub.on('error', (err: Error) => {
    clearTimeout(timeout)
    console.log(JSON.stringify({ error: err.message }))
    process.exit(1)
  })

  epub.parse()
} catch (e) {
  clearTimeout(timeout)
  console.log(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }))
  process.exit(1)
}
