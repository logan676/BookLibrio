import vision from '@google-cloud/vision'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize Google Cloud Vision client
let visionClient = null
try {
  const credentialsPath = join(__dirname, '../../google-credentials.json')
  visionClient = new vision.ImageAnnotatorClient({
    keyFilename: credentialsPath
  })
} catch (err) {
  console.warn('Google Vision API not configured:', err.message)
}

export async function extractTextFromImage(imageUrl) {
  if (!visionClient) {
    throw new Error('Google Vision API not configured')
  }

  const [result] = await visionClient.textDetection(imageUrl)
  const detections = result.textAnnotations
  return detections && detections[0] ? detections[0].description : ''
}

export function parseBookInfoFromText(text) {
  let title = ''
  let author = ''
  let isbn = ''

  // Clean up text - remove extra whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim()

  // Try to extract ISBN
  const isbnMatch = cleanText.match(/ISBN[:\s-]*([0-9X-]+)/i)
  if (isbnMatch) {
    isbn = isbnMatch[1].replace(/-/g, '')
  }

  // Split into lines for analysis
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Look for "by" or "BY" to find author
  const byIndex = cleanText.search(/\bby\b/i)
  if (byIndex !== -1) {
    const afterBy = text.substring(byIndex + 4)
    const authorMatch = afterBy.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/)
    if (authorMatch) {
      author = authorMatch[1]
    }
  }

  // If no "by" found, look for author name patterns in last few lines
  if (!author && lines.length > 0) {
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
      const line = lines[i].trim()
      // Match ALL CAPS names
      if (/^[A-Z][A-Z.\s]+[A-Z]$/.test(line) && line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 4) {
        author = line.split(/\s+/).map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
        break
      }
    }
  }

  // Build title from initial lines
  const titleLines = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (author && line.toUpperCase() === author.toUpperCase()) break
    if (line.toLowerCase().startsWith('a novel') || line.toLowerCase().startsWith('isbn')) break

    titleLines.push(line)
    if (titleLines.length >= 3) break
    if (line.toLowerCase().includes('how') || line.toLowerCase().includes('the story')) break
  }

  if (titleLines.length > 0) {
    title = titleLines.join(' ').trim().replace(/\s+/g, ' ')
  }

  return { title, author, isbn }
}

export function formatAsBlogPost(text, bookTitle) {
  const lines = text.split('\n')
  const paragraphs = []
  let currentParagraph = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const prevLine = currentParagraph.length > 0 ? currentParagraph[currentParagraph.length - 1] : ''

    if (!line) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '))
        currentParagraph = []
      }
      continue
    }

    const prevEndsWithPunctuation = /[.!?:]["']?\s*$/.test(prevLine)
    const currentStartsWithCapital = /^[A-Z"']/.test(line)
    const prevIsShort = prevLine.length < 50

    if (prevLine && prevEndsWithPunctuation && currentStartsWithCapital && prevIsShort) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '))
        currentParagraph = []
      }
    }

    currentParagraph.push(line)
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '))
  }

  return paragraphs
    .map(p => p.trim())
    .filter(Boolean)
    .join('\n\n')
}
