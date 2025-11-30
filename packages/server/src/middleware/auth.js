import jwt from 'jsonwebtoken'
import db from '../config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'

// Parse JWT from Authorization header (doesn't require auth)
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      const user = db.prepare('SELECT id, email, is_admin FROM users WHERE id = ?').get(decoded.userId)
      if (user) {
        req.user = user
      }
    } catch (err) {
      // Invalid token, continue without user
    }
  }
  next()
}

// Require authentication
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}

// Require admin role
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

export { JWT_SECRET }
