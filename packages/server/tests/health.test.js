import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'

// Create a minimal test app
function createTestApp() {
  const app = express()
  app.use(express.json())

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Books endpoint (mock)
  app.get('/api/books', (req, res) => {
    res.json([
      { id: 1, title: 'Book 1', author: 'Author 1' },
      { id: 2, title: 'Book 2', author: 'Author 2' },
    ])
  })

  app.get('/api/books/:id', (req, res) => {
    const id = parseInt(req.params.id)
    if (id === 1) {
      res.json({ id: 1, title: 'Book 1', author: 'Author 1' })
    } else {
      res.status(404).json({ error: 'Book not found' })
    }
  })

  return app
}

describe('Health API', () => {
  let app

  beforeAll(() => {
    app = createTestApp()
  })

  it('GET /api/health should return ok status', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.body.timestamp).toBeDefined()
  })
})

describe('Books API', () => {
  let app

  beforeAll(() => {
    app = createTestApp()
  })

  it('GET /api/books should return list of books', async () => {
    const response = await request(app).get('/api/books')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body[0]).toHaveProperty('id')
    expect(response.body[0]).toHaveProperty('title')
    expect(response.body[0]).toHaveProperty('author')
  })

  it('GET /api/books/:id should return single book', async () => {
    const response = await request(app).get('/api/books/1')

    expect(response.status).toBe(200)
    expect(response.body.id).toBe(1)
    expect(response.body.title).toBe('Book 1')
  })

  it('GET /api/books/:id should return 404 for non-existent book', async () => {
    const response = await request(app).get('/api/books/999')

    expect(response.status).toBe(404)
    expect(response.body.error).toBeDefined()
  })
})
