import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import type { LectureSeries, LectureVideo } from '../types'

export default function LecturesDashboard() {
  const { t, formatCount } = useI18n()
  const [series, setSeries] = useState<LectureSeries[]>([])
  const [selectedSeries, setSelectedSeries] = useState<LectureSeries | null>(null)
  const [videos, setVideos] = useState<LectureVideo[]>([])
  const [selectedVideo, setSelectedVideo] = useState<LectureVideo | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchSeries()
  }, [])

  const fetchSeries = async () => {
    try {
      const response = await fetch('/api/lecture-series')
      if (response.ok) {
        const data = await response.json()
        setSeries(data)
      }
    } catch (error) {
      console.error('Failed to fetch lecture series:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVideos = async (seriesId: number, search?: string) => {
    try {
      const params = new URLSearchParams()
      params.set('series_id', seriesId.toString())
      if (search) params.set('search', search)

      const response = await fetch(`/api/lectures?${params}`)
      if (response.ok) {
        const data = await response.json()
        setVideos(data)
      }
    } catch (error) {
      console.error('Failed to fetch lecture videos:', error)
    }
  }

  const handleSeriesClick = (s: LectureSeries) => {
    setSelectedSeries(s)
    setSearchTerm('')
    fetchVideos(s.id)
  }

  const handleBackToSeries = () => {
    setSelectedSeries(null)
    setVideos([])
    setSearchTerm('')
    setSelectedVideo(null)
  }

  const handleVideoClick = (video: LectureVideo) => {
    setSelectedVideo(video)
  }

  const handleBackFromPlayer = () => {
    setSelectedVideo(null)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (selectedSeries) {
      fetchVideos(selectedSeries.id, term)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1) return `${gb.toFixed(1)} GB`
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(0)} MB`
  }

  // Show video player
  if (selectedVideo) {
    return (
      <div className="video-player-view">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{selectedVideo.title}</h1>
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
            src={`/api/lectures/${selectedVideo.id}/stream`}
            className="video-element"
          />
        </div>
      </div>
    )
  }

  // Show videos for selected series
  if (selectedSeries) {
    return (
      <div className="magazines-dashboard">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{selectedSeries.name}</h1>
          <div className="sub-view-nav">
            <button className="back-btn" onClick={handleBackToSeries}>
              {t.back}
            </button>
            <span className="item-count">{formatCount(t.lectureCount, videos.length)}</span>
          </div>
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder={t.searchLectures}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="video-list">
          {videos.map((video) => (
            <div
              key={video.id}
              className="video-item"
              onClick={() => handleVideoClick(video)}
            >
              <div className="video-icon">
                <span>🎓</span>
              </div>
              <div className="video-info">
                <h3 className="video-title">{video.title}</h3>
                <div className="video-meta">
                  {video.file_size && (
                    <span className="size">{formatFileSize(video.file_size)}</span>
                  )}
                  {video.file_type && (
                    <span className="type">{video.file_type.toUpperCase()}</span>
                  )}
                </div>
              </div>
              <div className="video-play-btn">▶</div>
            </div>
          ))}
        </div>

        {videos.length === 0 && (
          <div className="empty-state">
            <p>{t.noLecturesFound}</p>
          </div>
        )}
      </div>
    )
  }

  // Show series list
  return (
    <div className="magazines-dashboard no-header">
      {loading ? (
        <div className="loading">{t.loadingLectureSeries}</div>
      ) : series.length === 0 ? (
        <div className="empty-state">
          <h2>{t.noLecturesFound}</h2>
        </div>
      ) : (
        <div className="publisher-grid">
          {series.map((s) => (
            <div
              key={s.id}
              className="publisher-card"
              onClick={() => handleSeriesClick(s)}
            >
              <div className="publisher-icon lecture-series-icon">
                <span>🎓</span>
              </div>
              <div className="publisher-info">
                <h3 className="publisher-name">{s.name}</h3>
                <span className="publisher-count">{formatCount(t.lectureCount, s.video_count)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
