import { Router } from 'express'
import db from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { extractTextFromImage, parseBookInfoFromText, formatAsBlogPost } from '../services/ocr.js'
import { searchGoogleBooks } from '../services/googleBooks.js'
import { uploadToCloudinary } from '../services/cloudinaryUpload.js'

const router = Router()

// Get all books (user-specific) with optional search
router.get('/', (req, res) => {
  try {
    if (!req.user) {
      return res.json([])
    }

    const { q, includeContent } = req.query

    if (q && includeContent === 'true') {
      const searchTerm = `%${q}%`
      const books = db.prepare(`
        SELECT DISTINCT b.* FROM books b
        LEFT JOIN blog_posts p ON b.id = p.book_id
        WHERE b.user_id = ?
        AND (
          b.title LIKE ? OR
          b.author LIKE ? OR
          b.publisher LIKE ? OR
          b.isbn LIKE ? OR
          b.description LIKE ? OR
          b.categories LIKE ? OR
          p.content LIKE ? OR
          p.extracted_text LIKE ?
        )
        ORDER BY b.created_at DESC
      `).all(req.user.id, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
      return res.json(books)
    }

    const books = db.prepare('SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id)
    res.json(books)
  } catch (error) {
    console.error('Failed to fetch books:', error)
    res.status(500).json({ error: 'Failed to fetch books' })
  }
})

// Get single book with blog posts
router.get('/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }
    const posts = db.prepare('SELECT * FROM blog_posts WHERE book_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json({ ...book, posts })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch book' })
  }
})

// Upload book cover photo and auto-fill metadata
router.post('/scan', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' })
    }

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'bookpost/covers')
    const photoUrl = cloudinaryResult.secure_url

    const extractedText = await extractTextFromImage(photoUrl)
    console.log('Extracted text:', extractedText)

    const parsedInfo = parseBookInfoFromText(extractedText)

    let bookData = null

    if (parsedInfo.isbn) {
      bookData = await searchGoogleBooks(`isbn:${parsedInfo.isbn}`)
    }

    if (!bookData && (parsedInfo.title || parsedInfo.author)) {
      const query = [parsedInfo.title, parsedInfo.author].filter(Boolean).join(' ')
      bookData = await searchGoogleBooks(query)
    }

    if (!bookData && extractedText) {
      const firstWords = extractedText.split(/\s+/).slice(0, 5).join(' ')
      bookData = await searchGoogleBooks(firstWords)
    }

    const result = {
      cover_photo_url: photoUrl,
      extracted_text: extractedText,
      ...parsedInfo,
      ...(bookData || {})
    }

    res.json(result)
  } catch (error) {
    console.error('Scan error:', error)
    res.status(500).json({ error: 'Failed to scan book cover' })
  }
})

// Create book
router.post('/', requireAuth, (req, res) => {
  console.log('[Create Book] Request received:', { user: req.user?.id, body: req.body })
  try {
    const {
      title, author, cover_url, cover_photo_url, isbn,
      publisher, publish_year, description, page_count,
      categories, language
    } = req.body

    if (!title || !author) {
      console.log('[Create Book] Missing title or author')
      return res.status(400).json({ error: 'Title and author are required' })
    }

    const result = db.prepare(`
      INSERT INTO books (title, author, cover_url, cover_photo_url, isbn, publisher, publish_year, description, page_count, categories, language, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, author, cover_url, cover_photo_url, isbn, publisher, publish_year, description, page_count, categories, language, req.user.id)

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newBook)
  } catch (error) {
    console.error('Create book error:', error)
    res.status(500).json({ error: 'Failed to add book' })
  }
})

// Delete book
router.delete('/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }

    // Delete associated posts first
    db.prepare('DELETE FROM blog_posts WHERE book_id = ?').run(req.params.id)
    // Delete the book
    db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id)

    res.json({ success: true })
  } catch (error) {
    console.error('Delete book error:', error)
    res.status(500).json({ error: 'Failed to delete book' })
  }
})

// Upload reading page photo and create blog post
router.post('/:id/scan-page', upload.single('photo'), async (req, res) => {
  try {
    const bookId = req.params.id

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' })
    }

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'bookpost/pages')
    const photoUrl = cloudinaryResult.secure_url

    const extractedText = await extractTextFromImage(photoUrl)
    const blogContent = formatAsBlogPost(extractedText, book.title)

    const pageNumber = req.body.page_number ? parseInt(req.body.page_number) : null
    const title = `Notes from "${book.title}"${pageNumber ? ` - Page ${pageNumber}` : ''}`

    const result = db.prepare(`
      INSERT INTO blog_posts (book_id, title, content, page_photo_url, page_number, extracted_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(bookId, title, blogContent, photoUrl, pageNumber, extractedText)

    const newPost = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newPost)
  } catch (error) {
    console.error('Scan page error:', error)
    res.status(500).json({ error: 'Failed to scan page' })
  }
})

// Get all blog posts for a book
router.get('/:id/posts', (req, res) => {
  try {
    const posts = db.prepare('SELECT * FROM blog_posts WHERE book_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json(posts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' })
  }
})

export default router
