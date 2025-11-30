import { Router } from 'express'
import db from '../config/database.js'

const router = Router()

// Global search across all content types
router.get('/', async (req, res) => {
  try {
    const { q, limit = 50 } = req.query

    if (!q || q.trim().length < 2) {
      return res.json({ results: [], message: 'Search query must be at least 2 characters' })
    }

    const searchTerm = `%${q.trim()}%`
    const searchLimit = Math.min(parseInt(limit) || 50, 100)
    const results = []

    // Search Books
    const books = db.prepare(`
      SELECT id, title, author, cover_url, cover_photo_url, 'book' as type
      FROM books
      WHERE title LIKE ? OR author LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchLimit)
    books.forEach(item => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.author,
        type: 'book',
        cover: item.cover_url || item.cover_photo_url
      })
    })

    // Search Ebooks
    const ebooks = db.prepare(`
      SELECT e.id, e.title, e.cover_url, c.name as category_name, 'ebook' as type
      FROM ebooks e
      LEFT JOIN ebook_categories c ON e.category_id = c.id
      WHERE e.title LIKE ?
      ORDER BY e.created_at DESC
      LIMIT ?
    `).all(searchTerm, searchLimit)
    ebooks.forEach(item => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.category_name || 'Ebook',
        type: 'ebook',
        cover: item.cover_url
      })
    })

    // Search Magazines
    const magazines = db.prepare(`
      SELECT m.id, m.title, m.cover_url, m.year, m.issue, p.name as publisher_name, 'magazine' as type
      FROM magazines m
      LEFT JOIN publishers p ON m.publisher_id = p.id
      WHERE m.title LIKE ? OR p.name LIKE ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchLimit)
    magazines.forEach(item => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.publisher_name || (item.year ? `${item.year}` : 'Magazine'),
        type: 'magazine',
        cover: item.cover_url
      })
    })

    // Search Notes
    const notes = db.prepare(`
      SELECT id, title, content_preview, year, 'note' as type
      FROM notes
      WHERE title LIKE ? OR content_preview LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchLimit)
    notes.forEach(item => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.year ? `${item.year}` : 'Note',
        type: 'note',
        cover: null
      })
    })

    // Search Audio
    const audio = db.prepare(`
      SELECT a.id, a.title, s.name as series_name, 'audio' as type
      FROM audio_files a
      LEFT JOIN audio_series s ON a.series_id = s.id
      WHERE a.title LIKE ? OR s.name LIKE ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchLimit)
    audio.forEach(item => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.series_name || 'Audio',
        type: 'audio',
        cover: null
      })
    })

    // Search Lectures
    const lectures = db.prepare(`
      SELECT l.id, l.title, s.name as series_name, 'lecture' as type
      FROM lecture_videos l
      LEFT JOIN lecture_series s ON l.series_id = s.id
      WHERE l.title LIKE ? OR s.name LIKE ?
      ORDER BY l.created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchLimit)
    lectures.forEach(item => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.series_name || 'Lecture',
        type: 'lecture',
        cover: null
      })
    })

    // Search Speeches
    const speeches = db.prepare(`
      SELECT s.id, s.title, ss.name as series_name, 'speech' as type
      FROM speech_videos s
      LEFT JOIN speech_series ss ON s.series_id = ss.id
      WHERE s.title LIKE ? OR ss.name LIKE ?
      ORDER BY s.created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchLimit)
    speeches.forEach(item => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.series_name || 'Speech',
        type: 'speech',
        cover: null
      })
    })

    // Search Movies
    const movies = db.prepare(`
      SELECT id, title, year, 'movie' as type
      FROM movies
      WHERE title LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(searchTerm, searchLimit)
    movies.forEach(item => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.year ? `${item.year}` : 'Movie',
        type: 'movie',
        cover: null
      })
    })

    // Search TV Shows
    const tvshows = db.prepare(`
      SELECT e.id, e.title, e.season, e.episode, s.name as series_name, 'tvshow' as type
      FROM tvshow_episodes e
      LEFT JOIN tvshow_series s ON e.series_id = s.id
      WHERE e.title LIKE ? OR s.name LIKE ?
      ORDER BY e.created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchLimit)
    tvshows.forEach(item => {
      const epInfo = item.season && item.episode ? `S${item.season}E${item.episode}` : ''
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.series_name ? `${item.series_name} ${epInfo}`.trim() : 'TV Show',
        type: 'tvshow',
        cover: null
      })
    })

    // Search Documentaries
    const documentaries = db.prepare(`
      SELECT d.id, d.title, s.name as series_name, 'documentary' as type
      FROM documentary_episodes d
      LEFT JOIN documentary_series s ON d.series_id = s.id
      WHERE d.title LIKE ? OR s.name LIKE ?
      ORDER BY d.created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchLimit)
    documentaries.forEach(item => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.series_name || 'Documentary',
        type: 'documentary',
        cover: null
      })
    })

    // Search Animation
    const animation = db.prepare(`
      SELECT a.id, a.title, s.name as series_name, 'animation' as type
      FROM animation_episodes a
      LEFT JOIN animation_series s ON a.series_id = s.id
      WHERE a.title LIKE ? OR s.name LIKE ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchLimit)
    animation.forEach(item => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.series_name || 'Animation',
        type: 'animation',
        cover: null
      })
    })

    // Search NBA
    const nba = db.prepare(`
      SELECT g.id, g.title, s.name as series_name, 'nba' as type
      FROM nba_games g
      LEFT JOIN nba_series s ON g.series_id = s.id
      WHERE g.title LIKE ? OR s.name LIKE ?
      ORDER BY g.created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchLimit)
    nba.forEach(item => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.series_name || 'NBA',
        type: 'nba',
        cover: null
      })
    })

    res.json({
      query: q,
      total: results.length,
      results
    })
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ error: 'Search failed' })
  }
})

export default router
