import { useState, useEffect, useRef } from 'react'
import { useI18n } from '../i18n'
import type { AudioSeries, Audio } from '../types'

export default function AudioDashboard() {
  const { t, formatCount } = useI18n()
  const [series, setSeries] = useState<AudioSeries[]>([])
  const [selectedSeries, setSelectedSeries] = useState<AudioSeries | null>(null)
  const [audioFiles, setAudioFiles] = useState<Audio[]>([])
  const [selectedAudio, setSelectedAudio] = useState<Audio | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    fetchSeries()
  }, [])

  const fetchSeries = async () => {
    try {
      const response = await fetch('/api/audio-series')
      if (response.ok) {
        const data = await response.json()
        setSeries(data)
      }
    } catch (error) {
      console.error('Failed to fetch audio series:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAudioFiles = async (seriesId: number, search?: string) => {
    try {
      const params = new URLSearchParams()
      params.set('series_id', seriesId.toString())
      if (search) params.set('search', search)

      const response = await fetch(`/api/audio?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAudioFiles(data)
      }
    } catch (error) {
      console.error('Failed to fetch audio files:', error)
    }
  }

  const handleSeriesClick = (s: AudioSeries) => {
    setSelectedSeries(s)
    setSearchTerm('')
    fetchAudioFiles(s.id)
  }

  const handleBackToSeries = () => {
    setSelectedSeries(null)
    setAudioFiles([])
    setSearchTerm('')
    setSelectedAudio(null)
  }

  const handleAudioClick = (audio: Audio) => {
    setSelectedAudio(audio)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (selectedSeries) {
      fetchAudioFiles(selectedSeries.id, term)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  // Show audio player when an audio is selected
  if (selectedAudio) {
    return (
      <div className="audio-player-view">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{t.nowPlaying}</h1>
          <div className="sub-view-nav">
            <button className="back-btn" onClick={() => setSelectedAudio(null)}>
              {t.back}
            </button>
          </div>
        </div>

        <div className="audio-player-container">
          <div className="audio-now-playing">
            <div className="audio-icon-large">
              <span>🎵</span>
            </div>
            <h2 className="audio-title-large">{selectedAudio.title}</h2>
            {selectedSeries && (
              <p className="audio-series-name">{selectedSeries.name}</p>
            )}
          </div>

          <audio
            ref={audioRef}
            controls
            autoPlay
            src={`/api/audio/${selectedAudio.id}/stream`}
            className="audio-element"
          />

          <div className="audio-playlist">
            <h3>Playlist</h3>
            <div className="playlist-items">
              {audioFiles.map((audio) => (
                <div
                  key={audio.id}
                  className={`playlist-item ${audio.id === selectedAudio.id ? 'active' : ''}`}
                  onClick={() => handleAudioClick(audio)}
                >
                  <span className="playlist-icon">
                    {audio.id === selectedAudio.id ? '▶' : '♪'}
                  </span>
                  <span className="playlist-title">{audio.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show audio files for selected series
  if (selectedSeries) {
    return (
      <div className="magazines-dashboard">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{selectedSeries.name}</h1>
          <div className="sub-view-nav">
            <button className="back-btn" onClick={handleBackToSeries}>
              {t.back}
            </button>
            <span className="item-count">{formatCount(t.audioCount, audioFiles.length)}</span>
          </div>
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder={t.searchAudio}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="audio-list">
          {audioFiles.map((audio) => (
            <div
              key={audio.id}
              className="audio-item"
              onClick={() => handleAudioClick(audio)}
            >
              <div className="audio-icon">
                <span>🎵</span>
              </div>
              <div className="audio-info">
                <h3 className="audio-title">{audio.title}</h3>
                <div className="audio-meta">
                  {audio.duration && (
                    <span className="duration">{formatDuration(audio.duration)}</span>
                  )}
                  {audio.file_size && (
                    <span className="size">{formatFileSize(audio.file_size)}</span>
                  )}
                </div>
              </div>
              <div className="audio-play-btn">▶</div>
            </div>
          ))}
        </div>

        {audioFiles.length === 0 && (
          <div className="empty-state">
            <p>{t.noAudioFound}</p>
          </div>
        )}
      </div>
    )
  }

  // Show series list
  return (
    <div className="magazines-dashboard no-header">
      {loading ? (
        <div className="loading">{t.loadingAudioSeries}</div>
      ) : series.length === 0 ? (
        <div className="empty-state">
          <h2>{t.noAudioFound}</h2>
        </div>
      ) : (
        <div className="publisher-grid">
          {series.map((s) => (
            <div
              key={s.id}
              className="publisher-card"
              onClick={() => handleSeriesClick(s)}
            >
              <div className="publisher-icon audio-series-icon">
                <span>🎧</span>
              </div>
              <div className="publisher-info">
                <h3 className="publisher-name">{s.name}</h3>
                <span className="publisher-count">{formatCount(t.audioCount, s.audio_count)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
