import { useState, useEffect, useRef } from 'react'
import type { EbookCategory, Ebook } from '../types'

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

export default function EbooksDashboard({ onBack }: Props) {
  const [categories, setCategories] = useState<EbookCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<EbookCategory | null>(null)
  const [ebooks, setEbooks] = useState<Ebook[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [generatingCovers, setGeneratingCovers] = useState(false)
  const [coverProgress, setCoverProgress] = useState<CoverProgress | null>(null)
  const progressIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/ebook-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to fetch ebook categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEbooks = async (categoryId: number, search?: string) => {
    try {
      const params = new URLSearchParams()
      params.set('category_id', categoryId.toString())
      if (search) params.set('search', search)

      const response = await fetch(`/api/ebooks?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEbooks(data)
      }
    } catch (error) {
      console.error('Failed to fetch ebooks:', error)
    }
  }

  const handleScanEbooks = async () => {
    setScanning(true)
    try {
      const response = await fetch('/api/ebooks/scan', { method: 'POST' })
      if (response.ok) {
        const result = await response.json()
        alert(`Scanned ${result.ebooks} new ebooks in ${result.categories} categories!`)
        fetchCategories()
      }
    } catch (error) {
      console.error('Failed to scan ebooks:', error)
      alert('Failed to scan ebooks')
    } finally {
      setScanning(false)
    }
  }

  const pollCoverProgress = async () => {
    try {
      const response = await fetch('/api/ebooks/generate-covers/progress')
      if (response.ok) {
        const progress = await response.json()
        setCoverProgress(progress)

        if (!progress.running) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
          setGeneratingCovers(false)
          if (selectedCategory) {
            fetchEbooks(selectedCategory.id, searchTerm)
          }
        }
      }
    } catch (error) {
      console.error('Failed to get cover progress:', error)
    }
  }

  const handleGenerateCovers = async (categoryId?: number) => {
    setGeneratingCovers(true)
    setCoverProgress(null)

    try {
      const body: { category_id?: number } = {}
      if (categoryId) {
        body.category_id = categoryId
      }

      const response = await fetch('/api/ebooks/generate-covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        progressIntervalRef.current = window.setInterval(pollCoverProgress, 2000)
        pollCoverProgress()
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

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  const handleCategoryClick = (category: EbookCategory) => {
    setSelectedCategory(category)
    setSearchTerm('')
    fetchEbooks(category.id)
  }

  const handleBackToCategories = () => {
    setSelectedCategory(null)
    setEbooks([])
    setSearchTerm('')
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (selectedCategory) {
      fetchEbooks(selectedCategory.id, term)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  // Show ebooks for selected category
  if (selectedCategory) {
    return (
      <div className="magazines-dashboard">
        <header className="dashboard-header">
          <button className="back-btn" onClick={handleBackToCategories}>
            Back
          </button>
          <h1>{selectedCategory.name}</h1>
          <div className="header-actions">
            <span className="magazine-count">{ebooks.length} ebooks</span>
            <button
              className="generate-covers-btn"
              onClick={() => handleGenerateCovers(selectedCategory.id)}
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
            placeholder="Search ebooks..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="magazine-grid">
          {ebooks.map((ebook) => (
            <div
              key={ebook.id}
              className="magazine-card"
              onClick={() => window.open(`/api/ebooks/${ebook.id}/file`, '_blank')}
            >
              <div className="magazine-cover">
                {ebook.cover_url ? (
                  <img src={ebook.cover_url} alt={ebook.title} />
                ) : (
                  <div className="magazine-placeholder">
                    <span>PDF</span>
                  </div>
                )}
              </div>
              <div className="magazine-info">
                <h3 className="magazine-title">{ebook.title}</h3>
                <div className="magazine-meta">
                  <span className="size">{formatFileSize(ebook.file_size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {ebooks.length === 0 && (
          <div className="empty-state">
            <p>No ebooks found</p>
          </div>
        )}
      </div>
    )
  }

  // Show categories list
  return (
    <div className="magazines-dashboard">
      <header className="dashboard-header">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <h1>Ebooks</h1>
        <div className="header-actions">
          <button
            className="scan-btn"
            onClick={handleScanEbooks}
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
        <div className="loading">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <h2>No ebooks found</h2>
          <p>Click "Scan Folder" to import ebooks from the configured directory</p>
        </div>
      ) : (
        <div className="publisher-grid">
          {categories.map((category) => (
            <div
              key={category.id}
              className="publisher-card"
              onClick={() => handleCategoryClick(category)}
            >
              <div className="publisher-icon">
                <span>{category.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="publisher-info">
                <h3 className="publisher-name">{category.name}</h3>
                <span className="publisher-count">{category.ebook_count} ebooks</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
