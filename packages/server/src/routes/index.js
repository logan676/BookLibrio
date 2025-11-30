import authRoutes from './auth.js'
import booksRoutes from './books.js'
import postsRoutes from './posts.js'
import readingHistoryRoutes from './readingHistory.js'
import underlinesRoutes from './underlines.js'
import ideasRoutes from './ideas.js'
import publishersRoutes from './publishers.js'
import audioRoutes from './audio.js'
import lecturesRoutes from './lectures.js'
import speechesRoutes from './speeches.js'
import moviesRoutes from './movies.js'
import tvshowsRoutes from './tvshows.js'
import documentariesRoutes from './documentaries.js'
import animationRoutes from './animation.js'
import nbaRoutes from './nba.js'
import magazinesRoutes from './magazines.js'
import ebooksRoutes from './ebooks.js'
import notesRoutes from './notes.js'
import adminRoutes from './admin.js'
import r2Routes from './r2.js'
import aiRoutes from './ai.js'
import searchRoutes from './search.js'
import userRoutes from './user.js'

// Export all routes
export {
  authRoutes,
  booksRoutes,
  postsRoutes,
  readingHistoryRoutes,
  underlinesRoutes,
  ideasRoutes,
  publishersRoutes,
  audioRoutes,
  lecturesRoutes,
  speechesRoutes,
  moviesRoutes,
  tvshowsRoutes,
  documentariesRoutes,
  animationRoutes,
  nbaRoutes,
  magazinesRoutes,
  ebooksRoutes,
  notesRoutes,
  adminRoutes,
  r2Routes,
  aiRoutes,
  searchRoutes,
  userRoutes
}

// Mount all routes to an app
export function mountRoutes(app) {
  // Auth routes
  app.use('/api/auth', authRoutes)

  // User profile routes
  app.use('/api/user', userRoutes)

  // Book/reading routes
  app.use('/api/books', booksRoutes)
  app.use('/api/posts', postsRoutes)
  app.use('/api/reading-history', readingHistoryRoutes)
  app.use('/api/underlines', underlinesRoutes)
  app.use('/api/ideas', ideasRoutes)

  // Magazine routes
  app.use('/api/publishers', publishersRoutes)
  app.use('/api/magazines', magazinesRoutes)
  // Magazine underlines and ideas (mounted at root for /api/magazine-underlines/:id paths)
  app.delete('/api/magazine-underlines/:id', (req, res, next) => {
    req.url = '/magazine-underlines/' + req.params.id
    magazinesRoutes(req, res, next)
  })
  app.get('/api/magazine-underlines/:id/ideas', (req, res, next) => {
    req.url = '/magazine-underlines/' + req.params.id + '/ideas'
    magazinesRoutes(req, res, next)
  })
  app.post('/api/magazine-underlines/:id/ideas', (req, res, next) => {
    req.url = '/magazine-underlines/' + req.params.id + '/ideas'
    magazinesRoutes(req, res, next)
  })
  app.delete('/api/magazine-ideas/:id', (req, res, next) => {
    req.url = '/magazine-ideas/' + req.params.id
    magazinesRoutes(req, res, next)
  })

  // Ebook routes
  app.use('/api/ebooks', ebooksRoutes)
  app.use('/api/ebook-categories', (req, res, next) => {
    req.url = '/categories' + req.url
    ebooksRoutes(req, res, next)
  })
  // Ebook underlines and ideas (mounted at root for /api/ebook-underlines/:id paths)
  app.delete('/api/ebook-underlines/:id', (req, res, next) => {
    req.url = '/ebook-underlines/' + req.params.id
    ebooksRoutes(req, res, next)
  })
  app.get('/api/ebook-underlines/:id/ideas', (req, res, next) => {
    req.url = '/ebook-underlines/' + req.params.id + '/ideas'
    ebooksRoutes(req, res, next)
  })
  app.post('/api/ebook-underlines/:id/ideas', (req, res, next) => {
    req.url = '/ebook-underlines/' + req.params.id + '/ideas'
    ebooksRoutes(req, res, next)
  })
  app.patch('/api/ebook-ideas/:id', (req, res, next) => {
    req.url = '/ebook-ideas/' + req.params.id
    ebooksRoutes(req, res, next)
  })
  app.delete('/api/ebook-ideas/:id', (req, res, next) => {
    req.url = '/ebook-ideas/' + req.params.id
    ebooksRoutes(req, res, next)
  })

  // Notes routes
  app.use('/api/notes', notesRoutes)
  // Note underlines and ideas (mounted at root for /api/note-underlines/:id paths)
  app.delete('/api/note-underlines/:id', (req, res, next) => {
    req.url = '/note-underlines/' + req.params.id
    notesRoutes(req, res, next)
  })
  app.get('/api/note-underlines/:id/ideas', (req, res, next) => {
    req.url = '/note-underlines/' + req.params.id + '/ideas'
    notesRoutes(req, res, next)
  })
  app.post('/api/note-underlines/:id/ideas', (req, res, next) => {
    req.url = '/note-underlines/' + req.params.id + '/ideas'
    notesRoutes(req, res, next)
  })
  app.delete('/api/note-ideas/:id', (req, res, next) => {
    req.url = '/note-ideas/' + req.params.id
    notesRoutes(req, res, next)
  })
  // Blog images
  app.get('/api/blog-images/:filename', (req, res, next) => {
    req.url = '/blog-images/' + req.params.filename
    notesRoutes(req, res, next)
  })

  // Media routes - Audio
  app.use('/api/audio', audioRoutes)
  app.use('/api/audio-series', (req, res, next) => {
    req.url = '/series' + req.url
    audioRoutes(req, res, next)
  })

  // Media routes - Lectures
  app.use('/api/lectures', lecturesRoutes)
  app.use('/api/lecture-series', (req, res, next) => {
    req.url = '/series' + req.url
    lecturesRoutes(req, res, next)
  })

  // Media routes - Speeches
  app.use('/api/speeches', speechesRoutes)
  app.use('/api/speech-series', (req, res, next) => {
    req.url = '/series' + req.url
    speechesRoutes(req, res, next)
  })

  // Media routes - Video
  app.use('/api/movies', moviesRoutes)
  app.use('/api/tvshows', tvshowsRoutes)
  app.use('/api/documentaries', documentariesRoutes)
  app.use('/api/animation', animationRoutes)
  app.use('/api/nba', nbaRoutes)

  // Admin routes
  app.use('/api/admin', adminRoutes)

  // R2/S3 storage routes
  app.use('/api/r2', r2Routes)

  // AI routes
  app.use('/api/ai', aiRoutes)

  // Search routes
  app.use('/api/search', searchRoutes)
}
