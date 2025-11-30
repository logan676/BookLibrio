import { Router } from 'express'
import db from '../config/database.js'

const router = Router()

// Get single blog post
router.get('/:id', (req, res) => {
  try {
    const post = db.prepare(`
      SELECT bp.*, b.title as book_title, b.author as book_author
      FROM blog_posts bp
      JOIN books b ON bp.book_id = b.id
      WHERE bp.id = ?
    `).get(req.params.id)

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }
    res.json(post)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' })
  }
})

// Update blog post
router.put('/:id', (req, res) => {
  try {
    const { title, content, page_number } = req.body
    db.prepare(`
      UPDATE blog_posts SET title = ?, content = ?, page_number = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content, page_number, req.params.id)

    const updated = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post' })
  }
})

// Delete blog post
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// Get underlines for a post
router.get('/:id/underlines', (req, res) => {
  try {
    const underlines = db.prepare(`
      SELECT u.*,
        (SELECT COUNT(*) FROM ideas WHERE underline_id = u.id) as idea_count
      FROM underlines u
      WHERE u.post_id = ?
      ORDER BY u.created_at DESC
    `).all(req.params.id)
    res.json(underlines)
  } catch (error) {
    console.error('Get underlines error:', error)
    res.status(500).json({ error: 'Failed to fetch underlines' })
  }
})

// Create underline for a post
router.post('/:id/underlines', (req, res) => {
  try {
    const { text, start_offset, end_offset } = req.body
    if (!text) {
      return res.status(400).json({ error: 'Text is required' })
    }

    const result = db.prepare(`
      INSERT INTO underlines (post_id, text, start_offset, end_offset)
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, text, start_offset || 0, end_offset || 0)

    const newUnderline = db.prepare('SELECT * FROM underlines WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newUnderline)
  } catch (error) {
    console.error('Create underline error:', error)
    res.status(500).json({ error: 'Failed to create underline' })
  }
})

export default router
