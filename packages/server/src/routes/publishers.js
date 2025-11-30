import { Router } from 'express'
import db from '../config/database.js'

const router = Router()

// Get all publishers with magazine counts
router.get('/', (req, res) => {
  try {
    const publishers = db.prepare(`
      SELECT p.*, COUNT(m.id) as magazine_count
      FROM publishers p
      LEFT JOIN magazines m ON p.id = m.publisher_id
      GROUP BY p.id
      ORDER BY p.name
    `).all()
    res.json(publishers)
  } catch (error) {
    console.error('Get publishers error:', error)
    res.status(500).json({ error: 'Failed to fetch publishers' })
  }
})

// Get single publisher with magazines
router.get('/:id', (req, res) => {
  try {
    const publisher = db.prepare('SELECT * FROM publishers WHERE id = ?').get(req.params.id)
    if (!publisher) {
      return res.status(404).json({ error: 'Publisher not found' })
    }
    const magazines = db.prepare(`
      SELECT * FROM magazines WHERE publisher_id = ? ORDER BY year DESC, title
    `).all(req.params.id)
    res.json({ ...publisher, magazines })
  } catch (error) {
    console.error('Get publisher error:', error)
    res.status(500).json({ error: 'Failed to fetch publisher' })
  }
})

export default router
