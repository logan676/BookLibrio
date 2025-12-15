/**
 * Upload fixed covers to R2
 */

import 'dotenv/config'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { ProxyAgent, fetch as undiciFetch } from 'undici'

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null

async function fetchWithProxy(url: string): Promise<Response> {
  if (proxyAgent) {
    return undiciFetch(url, { dispatcher: proxyAgent }) as unknown as Response
  }
  return fetch(url)
}

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
}) : null

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bookpost-media'

// Correct Google Books IDs with real covers
const COVERS_TO_FIX = [
  { isbn: '9780385550613', googleId: 'SjjNEAAAQBAJ', title: 'The Husbands' },
  { isbn: '9780593652882', googleId: 'tRN5EAAAQBAJ', title: 'The Creative Act' },
  { isbn: '9780385534261', googleId: 'Zn41EQAAQBAJ', title: 'The Wager' },
]

async function downloadCover(googleId: string): Promise<Buffer | null> {
  const url = `http://books.google.com/books/content?id=${googleId}&printsec=frontcover&img=1&zoom=2&source=gbs_api`
  console.log(`  Downloading from: ${url}`)

  try {
    const response = await fetchWithProxy(url)
    if (!response.ok) {
      console.log(`  ❌ Download failed: ${response.status}`)
      return null
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    console.log(`  ✅ Downloaded ${buffer.length} bytes`)
    return buffer
  } catch (e) {
    console.log(`  ❌ Error: ${e}`)
    return null
  }
}

async function uploadToR2(isbn: string, buffer: Buffer, contentType: string): Promise<boolean> {
  if (!r2Client) {
    console.log(`  ❌ R2 not configured`)
    return false
  }

  const key = `covers/rankings/${isbn}.jpg`

  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }))
    console.log(`  ✅ Uploaded to R2: ${key}`)
    return true
  } catch (e) {
    console.log(`  ❌ Upload failed: ${e}`)
    return false
  }
}

function detectContentType(buffer: Buffer): string {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png'
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg'
  }
  return 'image/jpeg'
}

async function main() {
  console.log('🔧 Uploading fixed covers to R2...\n')

  for (const cover of COVERS_TO_FIX) {
    console.log(`📚 ${cover.title} (${cover.isbn})`)

    const buffer = await downloadCover(cover.googleId)
    if (!buffer || buffer.length < 10000) {
      console.log(`  ⚠️ Image too small or failed, skipping\n`)
      continue
    }

    const contentType = detectContentType(buffer)
    console.log(`  Content-Type: ${contentType}`)

    await uploadToR2(cover.isbn, buffer, contentType)
    console.log()
  }

  console.log('✅ Done!')
  process.exit(0)
}

main().catch(console.error)
