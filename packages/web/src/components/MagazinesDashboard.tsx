import { useState, useEffect, useRef } from 'react'
import type { Publisher, Magazine } from '../types'
import MagazineReader from './MagazineReader'

interface CoverProgress {
  running: boolean
  total: number
  processed: number
  success: number
  failed: number
  skipped: number
  current: string
}

interface Props {
  onBack: () => void
}

export default function MagazinesDashboard({ onBack }: Props) {
  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null)
  const [magazines, setMagazines] = useState<Magazine[]>([])
  const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [generatingCovers, setGeneratingCovers] = useState(false)
  const [coverProgress, setCoverProgress] = useState<CoverProgress | null>(null)
  const progressIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    fetchPublishers()
  }, [])

  const fetchPublishers = async () => {
    try {
      const response = await fetch('/api/publishers')
      if (response.ok) {
        const data = await response.json()
        setPublishers(data)
      }
    } catch (error) {
      console.error('Failed to fetch publishers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMagazines = async (publisherId: number, year?: number | null, search?: string) => {
    try {
      const params = new URLSearchParams()
      params.set('publisher_id', publisherId.toString())
      if (year) params.set('year', year.toString())
      if (search) params.set('search', search)

      const response = await fetch(`/api/magazines?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMagazines(data)

        // Extract unique years
        const uniqueYears = [...new Set(data.map((m: Magazine) => m.year).filter(Boolean))] as number[]
        setYears(uniqueYears.sort((a, b) => b - a))
      }
    } catch (error) {
      console.error('Failed to fetch magazines:', error)
    }
  }

  const handleScanMagazines = async () => {
    setScanning(true)
    try {
      const response = await fetch('/api/magazines/scan', { method: 'POST' })
      if (response.ok) {
        const result = await response.json()
        alert(`Scanned ${result.magazines} new magazines!`)
        fetchPublishers()
      }
    } catch (error) {
      console.error('Failed to scan magazines:', error)
      alert('Failed to scan magazines')
    } finally {
      setScanning(false)
    }
  }

  const pollCoverProgress = async () => {
    try {
      const response = await fetch('/api/magazines/generate-covers/progress')
      if (response.ok) {
        const progress = await response.json()
        setCoverProgress(progress)

        if (!progress.running) {
          // Generation complete, stop polling
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
          setGeneratingCovers(false)
          // Refresh magazines to show new covers
          if (selectedPublisher) {
            fetchMagazines(selectedPublisher.id, selectedYear, searchTerm)
          }
        }
      }
    } catch (error) {
      console.error('Failed to get cover progress:', error)
    }
  }

  const handleGenerateCovers = async (publisherId?: number) => {
    setGeneratingCovers(true)
    setCoverProgress(null)

    try {
      const body: { publisher_id?: number } = {}
      if (publisherId) {
        body.publisher_id = publisherId
      }

      const response = await fetch('/api/magazines/generate-covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        // Start polling for progress
        progressIntervalRef.current = window.setInterval(pollCoverProgress, 2000)
        pollCoverProgress() // Initial poll
      } else {
        const error = await response.json()
        if (error.progress) {
          setCoverProgress(error.progress)
        }
        alert(error.error || 'Failed to start cover generation')
        setGeneratingCovers(false)
      }
    } catch (error) {
      console.error('Failed to generate covers:', error)
      alert('Failed to generate covers')
      setGeneratingCovers(false)
    }
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  const handlePublisherClick = (publisher: Publisher) => {
    setSelectedPublisher(publisher)
    setSelectedYear(null)
    setSearchTerm('')
    fetchMagazines(publisher.id)
  }

  const handleBackToPublishers = () => {
    setSelectedPublisher(null)
    setMagazines([])
    setSelectedYear(null)
    setSearchTerm('')
  }

  const handleYearChange = (year: number | null) => {
    setSelectedYear(year)
    if (selectedPublisher) {
      fetchMagazines(selectedPublisher.id, year, searchTerm)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (selectedPublisher) {
      fetchMagazines(selectedPublisher.id, selectedYear, term)
    }
  }

  const handleMagazineClick = (magazine: Magazine) => {
    setSelectedMagazine(magazine)
  }

  const handleBackFromReader = () => {
    setSelectedMagazine(null)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  // Show magazine reader
  if (selectedMagazine) {
    return (
      <MagazineReader
        magazine={selectedMagazine}
        onBack={handleBackFromReader}
      />
    )
  }

  // Show magazines for selected publisher
  if (selectedPublisher) {
    return (
      <div className="magazines-dashboard">
        <header className="dashboard-header">
          <button className="back-btn" onClick={handleBackToPublishers}>
            Back
          </button>
          <h1>{selectedPublisher.name}</h1>
          <div className="header-actions">
            <span className="magazine-count">{magazines.length} magazines</span>
            <button
              className="generate-covers-btn"
              onClick={() => handleGenerateCovers(selectedPublisher.id)}
              disabled={generatingCovers}
            >
              {generatingCovers ? 'Generating...' : 'Generate Covers'}
            </button>
          </div>
        </header>

        {coverProgress && (
          <div className="cover-progress">
            <div className="progress-info">
              <span>Generating covers: {coverProgress.processed}/{coverProgress.total}</span>
              {coverProgress.current && <span className="current-file">Current: {coverProgress.current}</span>}
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${coverProgress.total > 0 ? (coverProgress.processed / coverProgress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="progress-stats">
              <span className="success">Success: {coverProgress.success}</span>
              <span className="failed">Failed: {coverProgress.failed}</span>
              <span className="skipped">Skipped: {coverProgress.skipped}</span>
            </div>
          </div>
        )}

        <div className="filters">
          <input
            type="text"
            placeholder="Search magazines..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedYear || ''}
            onChange={(e) => handleYearChange(e.target.value ? parseInt(e.target.value) : null)}
            className="year-select"
          >
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="magazine-grid">
          {magazines.map((magazine) => (
            <div
              key={magazine.id}
              className="magazine-card"
              onClick={() => handleMagazineClick(magazine)}
            >
              <div className="magazine-cover">
                {magazine.cover_url ? (
                  <img src={magazine.cover_url} alt={magazine.title} />
                ) : (
                  <div className="magazine-placeholder">
                    <span>PDF</span>
                  </div>
                )}
              </div>
              <div className="magazine-info">
                <h3 className="magazine-title">{magazine.title}</h3>
                <div className="magazine-meta">
                  {magazine.year && <span className="year">{magazine.year}</span>}
                  {magazine.page_count && <span className="pages">{magazine.page_count} pages</span>}
                  <span className="size">{formatFileSize(magazine.file_size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {magazines.length === 0 && (
          <div className="empty-state">
            <p>No magazines found</p>
          </div>
        )}
      </div>
    )
  }

  // Show publishers list
  return (
    <div className="magazines-dashboard">
      <header className="dashboard-header">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <h1>Magazines</h1>
        <div className="header-actions">
          <button
            className="scan-btn"
            onClick={handleScanMagazines}
            disabled={scanning || generatingCovers}
          >
            {scanning ? 'Scanning...' : 'Scan Folder'}
          </button>
          <button
            className="generate-covers-btn"
            onClick={() => handleGenerateCovers()}
            disabled={generatingCovers || scanning}
          >
            {generatingCovers ? 'Generating...' : 'Generate Covers'}
          </button>
        </div>
      </header>

      {coverProgress && (
        <div className="cover-progress">
          <div className="progress-info">
            <span>Generating covers: {coverProgress.processed}/{coverProgress.total}</span>
            {coverProgress.current && <span className="current-file">Current: {coverProgress.current}</span>}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${coverProgress.total > 0 ? (coverProgress.processed / coverProgress.total) * 100 : 0}%` }}
            />
          </div>
          <div className="progress-stats">
            <span className="success">Success: {coverProgress.success}</span>
            <span className="failed">Failed: {coverProgress.failed}</span>
            <span className="skipped">Skipped: {coverProgress.skipped}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading publishers...</div>
      ) : publishers.length === 0 ? (
        <div className="empty-state">
          <h2>No magazines found</h2>
          <p>Click "Scan Folder" to import magazines from the configured directory</p>
        </div>
      ) : (
        <div className="publisher-grid">
          {publishers.map((publisher) => (
            <div
              key={publisher.id}
              className="publisher-card"
              onClick={() => handlePublisherClick(publisher)}
            >
              <div className="publisher-icon">
                <span>{publisher.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="publisher-info">
                <h3 className="publisher-name">{publisher.name}</h3>
                {publisher.description && (
                  <p className="publisher-description">{publisher.description}</p>
                )}
                <span className="publisher-count">{publisher.magazine_count} magazines</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
