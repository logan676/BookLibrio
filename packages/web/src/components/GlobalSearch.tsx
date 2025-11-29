import { useState, useEffect, useRef, useCallback } from 'react'
import { useI18n } from '../i18n'

interface SearchResult {
  id: number
  title: string
  subtitle: string
  type: string
  cover: string | null
}

interface SearchResponse {
  query: string
  total: number
  results: SearchResult[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onNavigate: (type: string, id: number) => void
}

// Type icons and colors
const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
  book: { icon: '📚', color: '#4f46e5', label: 'Book' },
  ebook: { icon: '📱', color: '#0891b2', label: 'Ebook' },
  magazine: { icon: '📰', color: '#dc2626', label: 'Magazine' },
  note: { icon: '📝', color: '#ca8a04', label: 'Note' },
  audio: { icon: '🎵', color: '#7c3aed', label: 'Audio' },
  lecture: { icon: '🎓', color: '#059669', label: 'Lecture' },
  speech: { icon: '🎤', color: '#db2777', label: 'Speech' },
  movie: { icon: '🎬', color: '#ea580c', label: 'Movie' },
  tvshow: { icon: '📺', color: '#2563eb', label: 'TV Show' },
  documentary: { icon: '🎥', color: '#65a30d', label: 'Documentary' },
  animation: { icon: '🎨', color: '#e11d48', label: 'Animation' },
  nba: { icon: '🏀', color: '#f97316', label: 'NBA' },
  underline: { icon: '📌', color: '#6366f1', label: 'Underline' },
  ebook_underline: { icon: '📌', color: '#0891b2', label: 'Ebook Underline' },
  idea: { icon: '💡', color: '#eab308', label: 'Idea' },
  ebook_idea: { icon: '💡', color: '#14b8a6', label: 'Ebook Idea' }
}

export default function GlobalSearch({ isOpen, onClose, onNavigate }: Props) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Search with debounce
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=50`)
      if (res.ok) {
        const data: SearchResponse = await res.json()
        setResults(data.results)
        setSelectedIndex(0)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, performSearch])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleResultClick(results[selectedIndex])
    }
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    onNavigate(result.type, result.id)
    onClose()
  }

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    const type = result.type
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  if (!isOpen) return null

  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div
        className="global-search-container"
        ref={containerRef}
        onClick={e => e.stopPropagation()}
      >
        <div className="global-search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="global-search-input"
            placeholder={t.searchPlaceholder || 'Search everything...'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button className="search-clear-btn" onClick={() => setQuery('')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="search-shortcut">ESC</div>
        </div>

        <div className="global-search-results">
          {loading && (
            <div className="search-loading">
              <div className="search-spinner"></div>
              <span>{t.searching || 'Searching...'}</span>
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="search-no-results">
              <span>{t.noResults || 'No results found'}</span>
            </div>
          )}

          {!loading && query.length < 2 && query.length > 0 && (
            <div className="search-hint">
              <span>{t.searchHint || 'Type at least 2 characters to search'}</span>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="search-results-list">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type} className="search-group">
                  <div className="search-group-header">
                    <span className="search-group-icon">{typeConfig[type]?.icon || '📄'}</span>
                    <span className="search-group-label">{typeConfig[type]?.label || type}</span>
                    <span className="search-group-count">{items.length}</span>
                  </div>
                  {items.map((result, idx) => {
                    const globalIndex = results.indexOf(result)
                    return (
                      <div
                        key={`${result.type}-${result.id}`}
                        className={`search-result-item ${globalIndex === selectedIndex ? 'selected' : ''}`}
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        {result.cover ? (
                          <img
                            src={result.cover}
                            alt={result.title}
                            className="search-result-cover"
                          />
                        ) : (
                          <div
                            className="search-result-icon"
                            style={{ backgroundColor: typeConfig[type]?.color || '#6b7280' }}
                          >
                            {typeConfig[type]?.icon || '📄'}
                          </div>
                        )}
                        <div className="search-result-content">
                          <div className="search-result-title">{result.title}</div>
                          <div className="search-result-subtitle">{result.subtitle}</div>
                        </div>
                        <div className="search-result-arrow">→</div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {!loading && query.length === 0 && (
            <div className="search-tips">
              <div className="search-tip-title">{t.searchTips || 'Quick Tips'}</div>
              <div className="search-tip-item">
                <kbd>↑</kbd> <kbd>↓</kbd> {t.toNavigate || 'to navigate'}
              </div>
              <div className="search-tip-item">
                <kbd>Enter</kbd> {t.toSelect || 'to select'}
              </div>
              <div className="search-tip-item">
                <kbd>ESC</kbd> {t.toClose || 'to close'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
