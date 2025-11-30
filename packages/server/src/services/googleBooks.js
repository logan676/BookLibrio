import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../../../../.env') })

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY

export async function searchGoogleBooks(query) {
  if (!GOOGLE_BOOKS_API_KEY) {
    console.warn('Google Books API key not configured')
    return null
  }

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${GOOGLE_BOOKS_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      return null
    }

    const book = data.items[0].volumeInfo
    return {
      title: book.title,
      author: book.authors ? book.authors.join(', ') : '',
      publisher: book.publisher || '',
      publish_year: book.publishedDate ? parseInt(book.publishedDate.substring(0, 4)) : null,
      description: book.description || '',
      page_count: book.pageCount || null,
      categories: book.categories ? book.categories.join(', ') : '',
      language: book.language || '',
      cover_url: book.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      isbn: book.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier ||
            book.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || ''
    }
  } catch (error) {
    console.error('Google Books API error:', error)
    return null
  }
}
