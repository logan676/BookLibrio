import { Router } from 'express'
import db from '../config/database.js'

const router = Router()

// Update idea
router.patch('/:id', (req, res) => {
  try {
    const { content } = req.body
    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    db.prepare('UPDATE ideas SET content = ? WHERE id = ?').run(content, req.params.id)
    const updated = db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id)

    if (!updated) {
      return res.status(404).json({ error: 'Idea not found' })
    }
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update idea' })
  }
})

// Delete idea
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM ideas WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Idea not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete idea' })
  }
})

export default router
