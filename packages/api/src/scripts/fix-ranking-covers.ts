/**
 * Fix ranking covers that have placeholder images
 *
 * Run with:
 *   npx tsx src/scripts/fix-ranking-covers.ts
 */

import 'dotenv/config'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { ProxyAgent, fetch as undiciFetch } from 'undici'

// Create proxy-aware fetch
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null

async function fetchWithProxy(url: string): Promise<Response> {
  if (proxyAgent) {
    return undiciFetch(url, { dispatcher: proxyAgent }) as unknown as Response
  }
  return fetch(url)
}

// R2 Client
const r2Client = process.env.R2_ACCOUNT_ID ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 30000,
    socketTimeout: 120000,
  }),
  maxAttempts: 3,
}) : null

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bookpost-media'

// Books to fix
const BOOKS_TO_FIX = [
  { isbn: '9780385550613', title: 'The Husbands', author: 'Holly Gramazio' },
  { isbn: '9780593652882', title: 'The Creative Act', author: 'Rick Rubin' },
  { isbn: '9780385534261', title: 'The Wager', author: 'David Grann' },
]

async function getGoogleBooksCover(isbn: string, title: string, author: string): Promise<string | null> {
  // Try ISBN search first
  let url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
  console.log(`  Trying Google Books ISBN search...`)

  try {
    const response = await fetchWithProxy(url)
    const data = await response.json() as { items?: Array<{ volumeInfo?: { imageLinks?: { thumbnail?: string } } }> }

    if (data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) {
      // Get larger image by modifying URL
      let coverUrl = data.items[0].volumeInfo.imageLinks.thumbnail
      coverUrl = coverUrl.replace('zoom=1', 'zoom=2').replace('&edge=curl', '')
      console.log(`  Found cover via ISBN: ${coverUrl}`)
      return coverUrl
    }
  } catch (e) {
    console.log(`  ISBN search failed: ${e}`)
  }

  // Try title+author search
  const query = encodeURIComponent(`${title} ${author}`)
  url = `https://www.googleapis.com/books/v1/volumes?q=${query}`
  console.log(`  Trying title+author search: ${title} ${author}`)

  try {
    const response = await fetchWithProxy(url)
    const data = await response.json() as { items?: Array<{ volumeInfo?: { imageLinks?: { thumbnail?: string } } }> }

    if (data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) {
      let coverUrl = data.items[0].volumeInfo.imageLinks.thumbnail
      coverUrl = coverUrl.replace('zoom=1', 'zoom=2').replace('&edge=curl', '')
      console.log(`  Found cover via title search: ${coverUrl}`)
      return coverUrl
    }
  } catch (e) {
    console.log(`  Title search failed: ${e}`)
  }

  return null
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetchWithProxy(url)
    if (!response.ok) {
      console.log(`  Download failed: ${response.status}`)
      return null
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    console.log(`  Downloaded ${buffer.length} bytes`)
    return buffer
  } catch (e) {
    console.log(`  Download error: ${e}`)
    return null
  }
}

async function uploadToR2(isbn: string, buffer: Buffer): Promise<boolean> {
  if (!r2Client) {
    console.log(`  R2 not configured`)
    return false
  }

  const key = `covers/rankings/${isbn}.jpg`

  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    }))
    console.log(`  ✅ Uploaded to R2: ${key}`)
    return true
  } catch (e) {
    console.log(`  ❌ R2 upload failed: ${e}`)
    return false
  }
}

async function fixCover(book: { isbn: string; title: string; author: string }): Promise<void> {
  console.log(`\n📚 Fixing: ${book.title} (${book.isbn})`)

  // Get cover URL from Google Books
  const coverUrl = await getGoogleBooksCover(book.isbn, book.title, book.author)

  if (!coverUrl) {
    console.log(`  ⚠️ No cover found, trying Open Library...`)
    // Try Open Library as fallback
    const olUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`
    const buffer = await downloadImage(olUrl)
    if (buffer && buffer.length > 5000) {
      await uploadToR2(book.isbn, buffer)
    } else {
      console.log(`  ❌ Could not find valid cover`)
    }
    return
  }

  // Download the image
  const buffer = await downloadImage(coverUrl)

  if (!buffer || buffer.length < 5000) {
    console.log(`  ⚠️ Image too small (${buffer?.length || 0} bytes), trying Open Library...`)
    const olUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`
    const olBuffer = await downloadImage(olUrl)
    if (olBuffer && olBuffer.length > 5000) {
      await uploadToR2(book.isbn, olBuffer)
    } else {
      console.log(`  ❌ Could not find valid cover`)
    }
    return
  }

  // Upload to R2
  await uploadToR2(book.isbn, buffer)
}

async function main(): Promise<void> {
  console.log('🔧 Fixing ranking covers...\n')

  for (const book of BOOKS_TO_FIX) {
    await fixCover(book)
  }

  console.log('\n✅ Done!')
  process.exit(0)
}

main().catch(console.error)
