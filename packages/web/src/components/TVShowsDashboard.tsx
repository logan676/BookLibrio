import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import type { TVShowSeries, TVShowEpisode } from '../types'

export default function TVShowsDashboard() {
  const { t, formatCount } = useI18n()
  const [series, setSeries] = useState<TVShowSeries[]>([])
  const [selectedSeries, setSelectedSeries] = useState<TVShowSeries | null>(null)
  const [episodes, setEpisodes] = useState<TVShowEpisode[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState<TVShowEpisode | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchSeries()
  }, [])

  const fetchSeries = async (search?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/tvshows/series?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSeries(data)
      }
    } catch (error) {
      console.error('Failed to fetch TV show series:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEpisodes = async (seriesId: number) => {
    try {
      const response = await fetch(`/api/tvshows/series/${seriesId}/episodes`)
      if (response.ok) {
        const data = await response.json()
        setEpisodes(data)
      }
    } catch (error) {
      console.error('Failed to fetch episodes:', error)
    }
  }

  const handleSeriesClick = async (s: TVShowSeries) => {
    setSelectedSeries(s)
    await fetchEpisodes(s.id)
  }

  const handleBackFromEpisodes = () => {
    setSelectedSeries(null)
    setEpisodes([])
  }

  const handleEpisodeClick = (episode: TVShowEpisode) => {
    setSelectedEpisode(episode)
  }

  const handleBackFromPlayer = () => {
    setSelectedEpisode(null)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    fetchSeries(term)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1) return `${gb.toFixed(1)} GB`
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(0)} MB`
  }

  // Show video player
  if (selectedEpisode) {
    return (
      <div className="video-player-view">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{selectedEpisode.title}</h1>
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
            src={`/api/tvshows/episodes/${selectedEpisode.id}/stream`}
            className="video-element"
          />
        </div>
      </div>
    )
  }

  // Show episodes list
  if (selectedSeries) {
    return (
      <div className="magazines-dashboard">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{selectedSeries.name}</h1>
          <div className="sub-view-nav">
            <button className="back-btn" onClick={handleBackFromEpisodes}>
              {t.back}
            </button>
            <span className="item-count">{formatCount(t.episodeCount, episodes.length)}</span>
          </div>
        </div>

        <div className="video-list">
          {episodes.map((episode) => (
            <div
              key={episode.id}
              className="video-list-item"
              onClick={() => handleEpisodeClick(episode)}
            >
              <div className="video-icon">▶</div>
              <div className="video-info">
                <h3 className="video-title">{episode.title}</h3>
                <div className="video-meta">
                  {episode.file_size && (
                    <span className="size">{formatFileSize(episode.file_size)}</span>
                  )}
                  {episode.file_type && (
                    <span className="type">{episode.file_type.toUpperCase()}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show series list
  return (
    <div className="magazines-dashboard">
      <div className="sub-view-header">
        <h1 className="sub-view-title">{t.tvshowsTitle}</h1>
        <div className="sub-view-nav">
          <span className="item-count">{formatCount(t.tvshowCount, series.length)}</span>
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder={t.searchTVShows}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading">{t.loadingTVShows}</div>
      ) : series.length === 0 ? (
        <div className="empty-state">
          <p>{t.noTVShowsFound}</p>
        </div>
      ) : (
        <div className="tvshow-grid">
          {series.map((s) => (
            <div
              key={s.id}
              className="tvshow-card"
              onClick={() => handleSeriesClick(s)}
            >
              <div className="tvshow-poster">
                <span>📺</span>
              </div>
              <div className="tvshow-info">
                <h3 className="tvshow-title">{s.name}</h3>
                <div className="tvshow-meta">
                  <span className="episode-count">{formatCount(t.episodeCount, s.episode_count)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
