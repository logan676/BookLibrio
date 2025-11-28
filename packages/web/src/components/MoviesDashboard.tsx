import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import type { Movie } from '../types'

export default function MoviesDashboard() {
  const { t, formatCount } = useI18n()
  const [movies, setMovies] = useState<Movie[]>([])
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchMovies()
  }, [])

  const fetchMovies = async (search?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/movies?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMovies(data)
      }
    } catch (error) {
      console.error('Failed to fetch movies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie)
  }

  const handleBackFromPlayer = () => {
    setSelectedMovie(null)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    fetchMovies(term)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1) return `${gb.toFixed(1)} GB`
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(0)} MB`
  }

  // Show video player
  if (selectedMovie) {
    return (
      <div className="video-player-view">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{selectedMovie.title}</h1>
          <div className="sub-view-nav">
            <button className="back-btn" onClick={handleBackFromPlayer}>
              {t.back}
            </button>
          </div>
        </div>

        <div className="video-player-container">
          <video
            controls
            autoPlay
            src={`/api/movies/${selectedMovie.id}/stream`}
            className="video-element"
          />
        </div>
      </div>
    )
  }

  // Show movies list
  return (
    <div className="magazines-dashboard">
      <div className="sub-view-header">
        <h1 className="sub-view-title">{t.moviesTitle}</h1>
        <div className="sub-view-nav">
          <span className="item-count">{formatCount(t.movieCount, movies.length)}</span>
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder={t.searchMovies}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading">{t.loadingMovies}</div>
      ) : movies.length === 0 ? (
        <div className="empty-state">
          <p>{t.noMoviesFound}</p>
        </div>
      ) : (
        <div className="movie-grid">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="movie-card"
              onClick={() => handleMovieClick(movie)}
            >
              <div className="movie-poster">
                <span>🎬</span>
              </div>
              <div className="movie-info">
                <h3 className="movie-title">{movie.title}</h3>
                <div className="movie-meta">
                  {movie.file_size && (
                    <span className="size">{formatFileSize(movie.file_size)}</span>
                  )}
                  {movie.file_type && (
                    <span className="type">{movie.file_type.toUpperCase()}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
