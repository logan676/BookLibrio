import { Router } from 'express'
import db from '../config/database.js'
import { authMiddleware, requireAuth } from '../middleware/auth.js'

const router = Router()

// Get comprehensive user profile with analytics
router.get('/profile', authMiddleware, requireAuth, (req, res) => {
  try {
    const userId = req.user.id

    // Basic user info
    const userInfo = db.prepare(`
      SELECT id, username as email, is_admin, created_at
      FROM users WHERE id = ?
    `).get(userId)

    // Reading history stats
    const readingHistory = db.prepare(`
      SELECT item_type, COUNT(*) as count,
             MAX(last_read_at) as last_activity,
             AVG(last_page) as avg_progress
      FROM reading_history
      WHERE user_id = ?
      GROUP BY item_type
    `).all(userId)

    // Books stats
    const booksStats = db.prepare(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT author) as unique_authors,
             COUNT(DISTINCT categories) as unique_categories
      FROM books WHERE user_id = ?
    `).get(userId)

    // Get book categories distribution
    const bookCategories = db.prepare(`
      SELECT categories, COUNT(*) as count
      FROM books
      WHERE user_id = ? AND categories IS NOT NULL AND categories != ''
      GROUP BY categories
      ORDER BY count DESC
    `).all(userId)

    // Get favorite authors
    const favoriteAuthors = db.prepare(`
      SELECT author, COUNT(*) as count
      FROM books
      WHERE user_id = ? AND author IS NOT NULL AND author != ''
      GROUP BY author
      ORDER BY count DESC
      LIMIT 10
    `).all(userId)

    // Blog posts stats
    const notesStats = db.prepare(`
      SELECT COUNT(*) as total_posts,
             COUNT(DISTINCT book_id) as books_with_notes
      FROM blog_posts bp
      JOIN books b ON bp.book_id = b.id
      WHERE b.user_id = ?
    `).get(userId)

    // Underlines count
    let underlinesTotal = 0
    try {
      underlinesTotal = db.prepare(`
        SELECT COUNT(*) as total
        FROM underlines u
        JOIN blog_posts bp ON u.post_id = bp.id
        JOIN books b ON bp.book_id = b.id
        WHERE b.user_id = ?
      `).get(userId)?.total || 0
    } catch {
      // Table might not exist
    }

    // Ideas count
    let ideasTotal = 0
    try {
      ideasTotal = db.prepare(`
        SELECT COUNT(*) as total
        FROM ideas i
        JOIN underlines u ON i.underline_id = u.id
        JOIN blog_posts bp ON u.post_id = bp.id
        JOIN books b ON bp.book_id = b.id
        WHERE b.user_id = ?
      `).get(userId)?.total || 0
    } catch {
      // Table might not exist
    }

    res.json({
      user: userInfo,
      reading: {
        history: readingHistory,
        totalItems: readingHistory.reduce((sum, h) => sum + h.count, 0)
      },
      books: {
        ...booksStats,
        categories: bookCategories,
        favoriteAuthors
      },
      notes: {
        ...notesStats,
        underlines: underlinesTotal,
        ideas: ideasTotal
      }
    })
  } catch (error) {
    console.error('User profile error:', error)
    res.status(500).json({ error: 'Failed to get user profile' })
  }
})

export default router
