import { Router } from 'express'
import crypto from 'crypto'
import db from '../config/database.js'
import {
  success,
  created,
  ApiError,
  ErrorCode,
  asyncHandler,
} from '../utils/response.js'

const router = Router()

// Token expiry configurations
const ACCESS_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000 // 30 days

// Password hashing helpers
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':')
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Validation helpers
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidPassword(password) {
  if (password.length < 6) return { valid: false, error: 'Password must be at least 6 characters' }
  if (!/[a-zA-Z]/.test(password)) return { valid: false, error: 'Password must contain at least one letter' }
  if (!/\d/.test(password)) return { valid: false, error: 'Password must contain at least one number' }
  return { valid: true }
}

// Create session with access and refresh tokens
function createSession(userId) {
  const accessToken = generateToken()
  const refreshToken = generateToken()
  const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY).toISOString()
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY).toISOString()

  db.prepare(`
    INSERT INTO sessions (user_id, token, refresh_token, expires_at, refresh_expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt)

  return {
    accessToken,
    refreshToken,
    expiresAt: accessExpiresAt,
    refreshExpiresAt,
  }
}

// Register
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw ApiError.badRequest('Email and password required', ErrorCode.MISSING_REQUIRED_FIELD)
  }

  if (!isValidEmail(email)) {
    throw ApiError.badRequest('Invalid email format', ErrorCode.INVALID_FORMAT)
  }

  const passwordCheck = isValidPassword(password)
  if (!passwordCheck.valid) {
    throw ApiError.badRequest(passwordCheck.error, ErrorCode.VALIDATION_ERROR)
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    throw ApiError.conflict('Email already registered', ErrorCode.ALREADY_EXISTS)
  }

  const passwordHash = hashPassword(password)
  const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(email, email, passwordHash)

  const session = createSession(result.lastInsertRowid)

  created(res, {
    token: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    user: { id: result.lastInsertRowid, email },
  })
}))

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw ApiError.badRequest('Email and password required', ErrorCode.MISSING_REQUIRED_FIELD)
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS)
  }

  // Clean up old sessions for this user (keep last 5)
  db.prepare(`
    DELETE FROM sessions
    WHERE user_id = ?
    AND id NOT IN (
      SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
    )
  `).run(user.id, user.id)

  const session = createSession(user.id)

  success(res, {
    token: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    user: { id: user.id, email: user.email, is_admin: user.is_admin },
  })
}))

// Refresh token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    throw ApiError.badRequest('Refresh token required', ErrorCode.MISSING_REQUIRED_FIELD)
  }

  const session = db.prepare(`
    SELECT s.*, u.email, u.is_admin
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.refresh_token = ?
  `).get(refreshToken)

  if (!session) {
    throw ApiError.unauthorized('Invalid refresh token', ErrorCode.TOKEN_INVALID)
  }

  if (new Date(session.refresh_expires_at) < new Date()) {
    // Delete expired session
    db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id)
    throw ApiError.unauthorized('Refresh token expired', ErrorCode.TOKEN_EXPIRED)
  }

  // Delete old session
  db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id)

  // Create new session
  const newSession = createSession(session.user_id)

  success(res, {
    token: newSession.accessToken,
    refreshToken: newSession.refreshToken,
    expiresAt: newSession.expiresAt,
    user: { id: session.user_id, email: session.email, is_admin: session.is_admin },
  })
}))

// Logout
router.post('/logout', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  }
  success(res, { message: 'Logged out successfully' })
}))

// Logout all sessions
router.post('/logout-all', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized()
  }
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id)
  success(res, { message: 'All sessions logged out' })
}))

// Get current user
router.get('/me', asyncHandler(async (req, res) => {
  if (req.user) {
    success(res, { user: req.user })
  } else {
    success(res, { user: null })
  }
}))

// Change password
router.post('/change-password', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized()
  }

  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Current and new password required', ErrorCode.MISSING_REQUIRED_FIELD)
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!verifyPassword(currentPassword, user.password_hash)) {
    throw ApiError.badRequest('Current password is incorrect', ErrorCode.INVALID_CREDENTIALS)
  }

  const passwordCheck = isValidPassword(newPassword)
  if (!passwordCheck.valid) {
    throw ApiError.badRequest(passwordCheck.error, ErrorCode.VALIDATION_ERROR)
  }

  const newHash = hashPassword(newPassword)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id)

  // Invalidate all other sessions
  const currentToken = req.headers.authorization?.replace('Bearer ', '')
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(req.user.id, currentToken)

  success(res, { message: 'Password changed successfully' })
}))

export default router
