import { useState, useEffect, useRef } from 'react'
import { useI18n } from '../i18n'

interface NBASeries {
  id: number
  year: number
  title: string
  teams?: string
  folder_path: string
  cover_url?: string
  category?: string
  source?: string
}

interface NBAGame {
  id: number
  series_id: number
  game_number?: number
  title: string
  file_path: string
  file_type: string
}

export default function NBADashboard() {
  const { t, formatCount } = useI18n()
  const [series, setSeries] = useState<NBASeries[]>([])
  const [selectedSeries, setSelectedSeries] = useState<NBASeries | null>(null)
  const [games, setGames] = useState<NBAGame[]>([])
  const [selectedGame, setSelectedGame] = useState<NBAGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{ series: number; games: number }>({ series: 0, games: 0 })
  const [categories, setCategories] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetchCategories()
    fetchStats()
  }, [])

  useEffect(() => {
    fetchSeries()
  }, [selectedCategory, selectedYear])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/nba/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
        setAvailableYears(data.years || [])
      }
    } catch (error) {
      console.error('Failed to fetch NBA categories:', error)
    }
  }

  const fetchSeries = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory) params.set('category', selectedCategory)
      if (selectedYear) params.set('year', selectedYear)

      const url = `/api/nba/series${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setSeries(data)
      }
    } catch (error) {
      console.error('Failed to fetch NBA series:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/nba/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch NBA stats:', error)
    }
  }

  const fetchGames = async (seriesId: number) => {
    try {
      const response = await fetch(`/api/nba/series/${seriesId}/games`)
      if (response.ok) {
        const data = await response.json()
        setGames(data)
      }
    } catch (error) {
      console.error('Failed to fetch NBA games:', error)
    }
  }

  const handleSeriesClick = (s: NBASeries) => {
    setSelectedSeries(s)
    setSelectedGame(null)
    setSearchTerm('')
    fetchGames(s.id)
  }

  const handleGameClick = (game: NBAGame) => {
    setSelectedGame(game)
  }

  const handleBackToSeries = () => {
    setSelectedSeries(null)
    setGames([])
    setSearchTerm('')
  }

  const handleBackFromPlayer = () => {
    setSelectedGame(null)
  }

  const getCategoryLabel = (cat: string) => {
    return cat === 'chinese' ? '中文' : cat === 'english' ? 'English' : cat
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  // Filter games by search term
  const filteredGames = games.filter(game =>
    !searchTerm || game.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Video player view
  if (selectedGame) {
    return (
      <div className="simple-pdf-reader">
        <div className="pdf-header">
          <button className="back-btn" onClick={handleBackFromPlayer}>
            &larr; {t.back}
          </button>
          <h2>{selectedGame.title}</h2>
        </div>
        <video
          ref={videoRef}
          controls
          autoPlay
          className="pdf-iframe"
          src={`/api/nba/games/${selectedGame.id}/stream`}
          style={{ background: '#000' }}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // Games list view
  if (selectedSeries) {
    return (
      <div className="magazines-dashboard">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{selectedSeries.title}</h1>
          <div className="sub-view-nav">
            <button className="back-btn" onClick={handleBackToSeries}>
              {t.back}
            </button>
            <span className="item-count">{formatCount(t.gamesCount, filteredGames.length)}</span>
            {selectedSeries.category && (
              <span className={`category-badge ${selectedSeries.category}`}>
                {getCategoryLabel(selectedSeries.category)}
              </span>
            )}
            {selectedSeries.source && (
              <span className="source-badge">{selectedSeries.source}</span>
            )}
          </div>
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder={t.searchGames}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="magazine-grid">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="magazine-card"
              onClick={() => handleGameClick(game)}
            >
              <div className="magazine-cover nba-game-cover">
                <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="magazine-info">
                <h3 className="magazine-title">{game.title}</h3>
                <div className="magazine-meta">
                  {game.game_number && <span>Game {game.game_number}</span>}
                  <span>{game.file_type.toUpperCase()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredGames.length === 0 && (
          <div className="empty-state">
            <p>{t.noGamesFound}</p>
          </div>
        )}
      </div>
    )
  }

  // Series list view (flat grid)
  return (
    <div className="magazines-dashboard no-header">
      {loading ? (
        <div className="loading">{t.loadingSeries}</div>
      ) : series.length === 0 ? (
        <div className="empty-state">
          <p>{t.noSeriesFound}</p>
        </div>
      ) : (
        <>
          <div className="filters">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="year-select"
            >
              <option value="">{t.allLanguages}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="year-select"
            >
              <option value="">{t.allYears}</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <span className="filter-stats">{stats.series} {t.seriesLabel} · {stats.games} {t.gamesLabel}</span>
          </div>

          <div className="publisher-grid">
            {series.map((s) => (
              <div
                key={s.id}
                className="publisher-card nba-series-card"
                onClick={() => handleSeriesClick(s)}
              >
                <div className="publisher-icon nba-series-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" />
                  </svg>
                  {s.category && (
                    <span className={`card-category-badge ${s.category}`}>
                      {getCategoryLabel(s.category)}
                    </span>
                  )}
                </div>
                <div className="publisher-info">
                  <h3 className="publisher-name">{s.title}</h3>
                  <div className="publisher-meta">
                    <span className="publisher-year">{s.year}</span>
                    {s.source && <span className="publisher-count">{s.source}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        .nba-series-icon {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .nba-series-card .card-category-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 9px;
          font-weight: 600;
        }

        .nba-series-card .card-category-badge.chinese {
          background: rgba(220, 38, 38, 0.9);
          color: white;
        }

        .nba-series-card .card-category-badge.english {
          background: rgba(37, 99, 235, 0.9);
          color: white;
        }

        .nba-game-cover {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .category-badge, .source-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .category-badge.chinese {
          background: #fee2e2;
          color: #dc2626;
        }

        .category-badge.english {
          background: #dbeafe;
          color: #2563eb;
        }

        .source-badge {
          background: #f3f4f6;
          color: #4b5563;
        }

        .filter-stats {
          color: var(--text-secondary, #666);
          font-size: 14px;
          margin-left: auto;
        }

        .publisher-meta {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .publisher-year {
          font-size: 12px;
          color: var(--text-secondary, #666);
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}
