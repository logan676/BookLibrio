import { existsSync } from 'fs'
import { readFile, writeFile, unlink, mkdir } from 'fs/promises'
import { join, dirname, extname, basename } from 'path'
import { promisify } from 'util'
import { exec } from 'child_process'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const execAsync = promisify(exec)

// Directories
const MAGAZINE_COVERS_DIR = join(__dirname, '../../covers/magazines')
const EBOOK_COVERS_DIR = join(__dirname, '../../covers/ebooks')
const PAGES_CACHE_DIR = join(__dirname, '../../cache/pages')

// Generate reproducible cache filename from file path and title
export function generateCacheFilename(filePath, title) {
  const hash = crypto.createHash('md5').update(filePath).digest('hex').substring(0, 8)
  const sanitizedTitle = (title || basename(filePath, extname(filePath)))
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50)
  return `${sanitizedTitle}_${hash}`
}

// Ensure covers directories exist
export async function ensureCoversDir() {
  if (!existsSync(MAGAZINE_COVERS_DIR)) {
    await mkdir(MAGAZINE_COVERS_DIR, { recursive: true })
  }
  if (!existsSync(EBOOK_COVERS_DIR)) {
    await mkdir(EBOOK_COVERS_DIR, { recursive: true })
  }
}

// Ensure cache directories exist
export async function ensureCacheDir() {
  if (!existsSync(PAGES_CACHE_DIR)) {
    await mkdir(PAGES_CACHE_DIR, { recursive: true })
  }
}

// Generate cover image from PDF first page
export async function generateCoverFromPdf(pdfPath, magazineId, title) {
  const tempOutputBase = `/tmp/cover_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const tempOutputFile = `${tempOutputBase}-001.jpg`
  const cacheFilename = generateCacheFilename(pdfPath, title)
  const localCoverFile = join(MAGAZINE_COVERS_DIR, `${cacheFilename}.jpg`)

  // Check if cover already exists
  if (existsSync(localCoverFile)) {
    return `/api/covers/magazines/${cacheFilename}.jpg`
  }

  try {
    await ensureCoversDir()

    // Use pdftoppm to convert first page to JPEG
    await execAsync(`pdftoppm -f 1 -l 1 -jpeg -r 150 "${pdfPath}" "${tempOutputBase}"`)

    const imageBuffer = await readFile(tempOutputFile)
    await writeFile(localCoverFile, imageBuffer)
    await unlink(tempOutputFile).catch(() => {})

    return `/api/covers/magazines/${cacheFilename}.jpg`
  } catch (error) {
    await unlink(tempOutputFile).catch(() => {})
    throw error
  }
}

// Generate cover for ebook (supports PDF and EPUB)
export async function generateEbookCover(filePath, ebookId, title) {
  const cacheFilename = generateCacheFilename(filePath, title)
  const localCoverFile = join(EBOOK_COVERS_DIR, `${cacheFilename}.jpg`)
  await ensureCoversDir()

  if (existsSync(localCoverFile)) {
    return `/api/covers/ebooks/${cacheFilename}.jpg`
  }

  const ext = extname(filePath).toLowerCase()

  if (ext === '.epub') {
    return await extractEpubCover(filePath, cacheFilename)
  } else if (ext === '.pdf') {
    const tempOutputBase = `/tmp/ebook_cover_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const tempOutputFile = `${tempOutputBase}-001.jpg`

    try {
      await execAsync(`pdftoppm -f 1 -l 1 -jpeg -r 150 "${filePath}" "${tempOutputBase}"`)
      const imageBuffer = await readFile(tempOutputFile)
      await writeFile(localCoverFile, imageBuffer)
      await unlink(tempOutputFile).catch(() => {})
      return `/api/covers/ebooks/${cacheFilename}.jpg`
    } catch (error) {
      await unlink(tempOutputFile).catch(() => {})
      throw error
    }
  } else {
    throw new Error(`Unsupported file format: ${ext}`)
  }
}

// Extract cover image from EPUB file
async function extractEpubCover(epubPath, cacheFilename) {
  const localCoverFile = join(EBOOK_COVERS_DIR, `${cacheFilename}.jpg`)
  const tempDir = `/tmp/epub_extract_${Date.now()}_${Math.random().toString(36).substring(7)}`

  try {
    await execAsync(`mkdir -p "${tempDir}" && unzip -q -o "${epubPath}" -d "${tempDir}"`)

    const containerPath = join(tempDir, 'META-INF', 'container.xml')
    let opfPath = ''

    try {
      const containerXml = await readFile(containerPath, 'utf-8')
      const opfMatch = containerXml.match(/full-path="([^"]+\.opf)"/i)
      if (opfMatch) {
        opfPath = join(tempDir, opfMatch[1])
      }
    } catch {
      const commonPaths = ['OEBPS/content.opf', 'content.opf', 'EPUB/package.opf']
      for (const p of commonPaths) {
        const fullPath = join(tempDir, p)
        if (existsSync(fullPath)) {
          opfPath = fullPath
          break
        }
      }
    }

    if (!opfPath || !existsSync(opfPath)) {
      throw new Error('Could not find OPF file')
    }

    const opfContent = await readFile(opfPath, 'utf-8')
    const opfDir = dirname(opfPath)
    let coverPath = ''

    // Method 1: Look for cover-image in metadata
    const coverIdMatch = opfContent.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"/i) ||
                         opfContent.match(/<meta[^>]*content="([^"]+)"[^>]*name="cover"/i)
    if (coverIdMatch) {
      const coverId = coverIdMatch[1]
      const itemMatch = opfContent.match(new RegExp(`<item[^>]*id="${coverId}"[^>]*href="([^"]+)"`, 'i')) ||
                       opfContent.match(new RegExp(`<item[^>]*href="([^"]+)"[^>]*id="${coverId}"`, 'i'))
      if (itemMatch) {
        coverPath = join(opfDir, itemMatch[1])
      }
    }

    // Method 2: Look for item with id containing 'cover'
    if (!coverPath || !existsSync(coverPath)) {
      const coverItemMatch = opfContent.match(/<item[^>]*id="[^"]*cover[^"]*"[^>]*href="([^"]+)"[^>]*media-type="image\/[^"]+"/i) ||
                            opfContent.match(/<item[^>]*href="([^"]+)"[^>]*id="[^"]*cover[^"]*"[^>]*media-type="image\/[^"]+"/i)
      if (coverItemMatch) {
        coverPath = join(opfDir, coverItemMatch[1])
      }
    }

    // Method 3: Look for properties="cover-image"
    if (!coverPath || !existsSync(coverPath)) {
      const propsMatch = opfContent.match(/<item[^>]*properties="cover-image"[^>]*href="([^"]+)"/i) ||
                        opfContent.match(/<item[^>]*href="([^"]+)"[^>]*properties="cover-image"/i)
      if (propsMatch) {
        coverPath = join(opfDir, propsMatch[1])
      }
    }

    // Method 4: Find any image named 'cover'
    if (!coverPath || !existsSync(coverPath)) {
      const { stdout } = await execAsync(`find "${tempDir}" -iname "*cover*" -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \\) 2>/dev/null | head -1`)
      if (stdout.trim()) {
        coverPath = stdout.trim()
      }
    }

    if (!coverPath || !existsSync(coverPath)) {
      throw new Error('Could not find cover image in EPUB')
    }

    const coverExt = extname(coverPath).toLowerCase()
    if (coverExt === '.png') {
      await execAsync(`sips -s format jpeg "${coverPath}" --out "${localCoverFile}" 2>/dev/null || convert "${coverPath}" "${localCoverFile}"`)
    } else {
      await execAsync(`cp "${coverPath}" "${localCoverFile}"`)
    }

    await execAsync(`rm -rf "${tempDir}"`)

    return `/api/covers/ebooks/${cacheFilename}.jpg`
  } catch (error) {
    await execAsync(`rm -rf "${tempDir}"`).catch(() => {})
    throw error
  }
}

export {
  MAGAZINE_COVERS_DIR,
  EBOOK_COVERS_DIR,
  PAGES_CACHE_DIR,
  execAsync
}
