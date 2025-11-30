import { Router } from 'express'
import db from '../config/database.js'

const router = Router()

// Get ideas for an underline
router.get('/:id/ideas', (req, res) => {
  try {
    const ideas = db.prepare('SELECT * FROM ideas WHERE underline_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json(ideas)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ideas' })
  }
})

// Add idea to underline
router.post('/:id/ideas', (req, res) => {
  try {
    const underlineId = req.params.id
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const result = db.prepare('INSERT INTO ideas (underline_id, content) VALUES (?, ?)').run(underlineId, content)
    const newIdea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newIdea)
  } catch (error) {
    console.error('Create idea error:', error)
    res.status(500).json({ error: 'Failed to create idea' })
  }
})

// Delete underline
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM underlines WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Underline not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete underline' })
  }
})

export default router
