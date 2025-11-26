import { useState, useEffect, useRef, useCallback } from 'react'
import type { Magazine, MagazineUnderline, MagazineIdea } from '../types'

interface Props {
  magazine: Magazine
  onBack: () => void
}

interface PageText {
  page: number
  text: string
}

export default function MagazineReader({ magazine, onBack }: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(magazine.page_count || 0)
  const [pageText, setPageText] = useState<PageText | null>(null)
  const [loadingText, setLoadingText] = useState(false)
  const [underlines, setUnderlines] = useState<MagazineUnderline[]>([])
  const [selectedUnderline, setSelectedUnderline] = useState<MagazineUnderline | null>(null)
  const [ideas, setIdeas] = useState<MagazineIdea[]>([])
  const [newIdea, setNewIdea] = useState('')
  const [showIdeaModal, setShowIdeaModal] = useState(false)
  const [selection, setSelection] = useState<{ text: string; start: number; end: number } | null>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const pdfUrl = `/api/magazines/${magazine.id}/pdf`

  useEffect(() => {
    fetchMagazineInfo()
    fetchUnderlines()
  }, [magazine.id])

  useEffect(() => {
    fetchPageText(currentPage)
  }, [currentPage])

  const fetchMagazineInfo = async () => {
    try {
      const response = await fetch(`/api/magazines/${magazine.id}/info`)
      if (response.ok) {
        const data = await response.json()
        setTotalPages(data.pageCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch magazine info:', error)
    }
  }

  const fetchPageText = async (page: number) => {
    setLoadingText(true)
    try {
      const response = await fetch(`/api/magazines/${magazine.id}/page/${page}/text`)
      if (response.ok) {
        const data = await response.json()
        setPageText({ page, text: data.text })
      }
    } catch (error) {
      console.error('Failed to fetch page text:', error)
    } finally {
      setLoadingText(false)
    }
  }

  const fetchUnderlines = async () => {
    try {
      const response = await fetch(`/api/magazines/${magazine.id}/underlines`)
      if (response.ok) {
        const data = await response.json()
        setUnderlines(data)
      }
    } catch (error) {
      console.error('Failed to fetch underlines:', error)
    }
  }

  const fetchIdeas = async (underlineId: number) => {
    try {
      const response = await fetch(`/api/magazine-underlines/${underlineId}/ideas`)
      if (response.ok) {
        const data = await response.json()
        setIdeas(data)
      }
    } catch (error) {
      console.error('Failed to fetch ideas:', error)
    }
  }

  const handleTextSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !textRef.current) return

    const text = sel.toString().trim()
    if (!text) return

    const range = sel.getRangeAt(0)
    const preSelectionRange = range.cloneRange()
    preSelectionRange.selectNodeContents(textRef.current)
    preSelectionRange.setEnd(range.startContainer, range.startOffset)
    const start = preSelectionRange.toString().length
    const end = start + text.length

    setSelection({ text, start, end })
  }, [])

  const handleCreateUnderline = async () => {
    if (!selection) return

    try {
      const response = await fetch(`/api/magazines/${magazine.id}/underlines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selection.text,
          page_number: currentPage,
          start_offset: selection.start,
          end_offset: selection.end
        })
      })

      if (response.ok) {
        fetchUnderlines()
        setSelection(null)
        window.getSelection()?.removeAllRanges()
      }
    } catch (error) {
      console.error('Failed to create underline:', error)
    }
  }

  const handleUnderlineClick = (underline: MagazineUnderline) => {
    setSelectedUnderline(underline)
    setShowIdeaModal(true)
    fetchIdeas(underline.id)
    if (underline.page_number !== currentPage) {
      setCurrentPage(underline.page_number)
    }
  }

  const handleAddIdea = async () => {
    if (!selectedUnderline || !newIdea.trim()) return

    try {
      const response = await fetch(`/api/magazine-underlines/${selectedUnderline.id}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newIdea.trim() })
      })

      if (response.ok) {
        fetchIdeas(selectedUnderline.id)
        fetchUnderlines()
        setNewIdea('')
      }
    } catch (error) {
      console.error('Failed to add idea:', error)
    }
  }

  const handleDeleteUnderline = async (underlineId: number) => {
    if (!confirm('Delete this underline and all its ideas?')) return

    try {
      const response = await fetch(`/api/magazine-underlines/${underlineId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchUnderlines()
        setShowIdeaModal(false)
        setSelectedUnderline(null)
      }
    } catch (error) {
      console.error('Failed to delete underline:', error)
    }
  }

  const handleDeleteIdea = async (ideaId: number) => {
    try {
      const response = await fetch(`/api/magazine-ideas/${ideaId}`, {
        method: 'DELETE'
      })

      if (response.ok && selectedUnderline) {
        fetchIdeas(selectedUnderline.id)
        fetchUnderlines()
      }
    } catch (error) {
      console.error('Failed to delete idea:', error)
    }
  }

  const pageUnderlines = underlines.filter(u => u.page_number === currentPage)

  const renderTextWithUnderlines = () => {
    if (!pageText || pageText.page !== currentPage) return null

    const text = pageText.text
    if (pageUnderlines.length === 0) {
      return <span>{text}</span>
    }

    const sorted = [...pageUnderlines].sort((a, b) => a.start_offset - b.start_offset)
    const segments: React.ReactNode[] = []
    let lastEnd = 0

    sorted.forEach((underline, index) => {
      if (underline.start_offset > lastEnd) {
        segments.push(
          <span key={`text-${index}`}>
            {text.slice(lastEnd, underline.start_offset)}
          </span>
        )
      }

      segments.push(
        <span
          key={`underline-${underline.id}`}
          className="underlined-text"
          onClick={() => handleUnderlineClick(underline)}
        >
          {text.slice(underline.start_offset, underline.end_offset)}
          {underline.idea_count > 0 && (
            <span className="idea-badge">({underline.idea_count})</span>
          )}
        </span>
      )

      lastEnd = underline.end_offset
    })

    if (lastEnd < text.length) {
      segments.push(
        <span key="text-end">{text.slice(lastEnd)}</span>
      )
    }

    return segments
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="magazine-reader">
      <header className="reader-header">
        <button className="back-btn" onClick={onBack}>Back</button>
        <h1 className="reader-title">{magazine.title}</h1>
        <div className="page-nav">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            Prev
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      </header>

      <div className="reader-content">
        <div className="pdf-panel">
          <iframe
            src={`${pdfUrl}#page=${currentPage}`}
            title="PDF Viewer"
            className="pdf-iframe"
          />
        </div>

        <div className="text-panel">
          <h2>Extracted Text</h2>
          {loadingText ? (
            <div className="loading-text">Loading text...</div>
          ) : (
            <div
              ref={textRef}
              className="page-text"
              onMouseUp={handleTextSelection}
            >
              {renderTextWithUnderlines()}
            </div>
          )}

          {selection && (
            <div className="selection-actions">
              <p className="selected-text">"{selection.text}"</p>
              <button onClick={handleCreateUnderline}>
                Create Underline
              </button>
              <button onClick={() => setSelection(null)}>
                Cancel
              </button>
            </div>
          )}

          <div className="underlines-sidebar">
            <h3>Underlines on this page ({pageUnderlines.length})</h3>
            {pageUnderlines.map((underline) => (
              <div
                key={underline.id}
                className="underline-item"
                onClick={() => handleUnderlineClick(underline)}
              >
                <span className="underline-text">"{underline.text}"</span>
                {underline.idea_count > 0 && (
                  <span className="idea-count">{underline.idea_count} ideas</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showIdeaModal && selectedUnderline && (
        <div className="idea-modal-overlay" onClick={() => setShowIdeaModal(false)}>
          <div className="idea-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ideas</h2>
              <button onClick={() => setShowIdeaModal(false)}>Close</button>
            </div>

            <div className="selected-underline">
              <p className="label">Selected text:</p>
              <p className="text">"{selectedUnderline.text}"</p>
              <button
                className="delete-btn"
                onClick={() => handleDeleteUnderline(selectedUnderline.id)}
              >
                Delete Underline
              </button>
            </div>

            <div className="ideas-list">
              {ideas.length === 0 ? (
                <p className="no-ideas">No ideas yet. Add your first one!</p>
              ) : (
                ideas.map((idea) => (
                  <div key={idea.id} className="idea-item">
                    <p className="idea-content">{idea.content}</p>
                    <div className="idea-meta">
                      <span className="idea-date">{formatDate(idea.created_at)}</span>
                      <button
                        className="delete-idea-btn"
                        onClick={() => handleDeleteIdea(idea.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="idea-input">
              <textarea
                placeholder="Add your idea..."
                value={newIdea}
                onChange={(e) => setNewIdea(e.target.value)}
              />
              <button
                onClick={handleAddIdea}
                disabled={!newIdea.trim()}
              >
                Add Idea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
