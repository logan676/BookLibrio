import { useState, useEffect, useRef } from 'react'
import type { BlogPost, Underline } from '../types'

interface PostDetailProps {
  post: BlogPost
  onBack: () => void
}

interface BubbleState {
  visible: boolean
  x: number
  y: number
  type: 'confirm' | 'idea'
  selectedText?: string
  paragraphIndex?: number
  startOffset?: number
  endOffset?: number
  underlineId?: number
}

function PostDetail({ post, onBack }: PostDetailProps) {
  const [underlines, setUnderlines] = useState<Underline[]>([])
  const [bubble, setBubble] = useState<BubbleState>({ visible: false, x: 0, y: 0, type: 'confirm' })
  const [ideaText, setIdeaText] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const ideaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchUnderlines()
  }, [post.id])

  useEffect(() => {
    if (bubble.visible && bubble.type === 'idea' && ideaInputRef.current) {
      ideaInputRef.current.focus()
    }
  }, [bubble.visible, bubble.type])

  // Close bubble when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (bubble.visible && bubble.type !== 'idea') {
        const target = e.target as HTMLElement
        if (!target.closest('.underline-bubble')) {
          setBubble({ visible: false, x: 0, y: 0, type: 'confirm' })
        }
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [bubble.visible, bubble.type])

  const fetchUnderlines = async () => {
    try {
      const res = await fetch(`/api/posts/${post.id}/underlines`)
      if (res.ok) {
        const data = await res.json()
        setUnderlines(data)
      }
    } catch (err) {
      console.error('Failed to fetch underlines:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleMouseUp = () => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || !contentRef.current) {
        return
      }

      const selectedText = selection.toString().trim()
      if (!selectedText) return

      const range = selection.getRangeAt(0)
      const startContainer = range.startContainer

      // Find the paragraph element
      let paragraphEl: HTMLElement | null = startContainer.parentElement
      while (paragraphEl && paragraphEl.tagName !== 'P') {
        paragraphEl = paragraphEl.parentElement
      }

      if (!paragraphEl || !contentRef.current.contains(paragraphEl)) {
        return
      }

      // Get paragraph index
      const paragraphs = contentRef.current.querySelectorAll('p')
      let paragraphIndex = -1
      paragraphs.forEach((p, i) => {
        if (p === paragraphEl || p.contains(paragraphEl!)) {
          paragraphIndex = i
        }
      })

      if (paragraphIndex === -1) return

      // Calculate offset within paragraph text
      const paragraphText = paragraphEl.textContent || ''
      const startOffset = paragraphText.indexOf(selectedText)
      if (startOffset === -1) return
      const endOffset = startOffset + selectedText.length

      // Get position for bubble - use fixed positioning relative to viewport
      const rect = range.getBoundingClientRect()
      const contentRect = contentRef.current.getBoundingClientRect()

      setBubble({
        visible: true,
        x: rect.left + rect.width / 2 - contentRect.left,
        y: rect.top - contentRect.top - 10,
        type: 'confirm',
        selectedText,
        paragraphIndex,
        startOffset,
        endOffset
      })
    }, 10)
  }

  const handleConfirmUnderline = async () => {
    if (!bubble.selectedText || bubble.paragraphIndex === undefined) return

    try {
      const res = await fetch(`/api/posts/${post.id}/underlines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: bubble.selectedText,
          start_offset: bubble.startOffset,
          end_offset: bubble.endOffset,
          paragraph_index: bubble.paragraphIndex
        })
      })

      if (res.ok) {
        const newUnderline = await res.json()
        setUnderlines(prev => [...prev, newUnderline])

        // Clear selection
        window.getSelection()?.removeAllRanges()

        // Show idea input bubble
        setBubble(prev => ({
          ...prev,
          type: 'idea',
          underlineId: newUnderline.id
        }))
        setIdeaText('')
      }
    } catch (err) {
      console.error('Failed to create underline:', err)
      closeBubble()
    }
  }

  const handleSaveIdea = async () => {
    if (!bubble.underlineId) return

    try {
      await fetch(`/api/underlines/${bubble.underlineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ideaText })
      })

      setUnderlines(prev =>
        prev.map(u => u.id === bubble.underlineId ? { ...u, idea: ideaText } : u)
      )
    } catch (err) {
      console.error('Failed to save idea:', err)
    }

    closeBubble()
  }

  const handleSkipIdea = () => {
    closeBubble()
  }

  const closeBubble = () => {
    setBubble({ visible: false, x: 0, y: 0, type: 'confirm' })
    setIdeaText('')
    window.getSelection()?.removeAllRanges()
  }

  const renderParagraphWithUnderlines = (text: string, paragraphIndex: number) => {
    const paragraphUnderlines = underlines
      .filter(u => u.paragraph_index === paragraphIndex)
      .sort((a, b) => a.start_offset - b.start_offset)

    if (paragraphUnderlines.length === 0) {
      return text
    }

    const parts: React.ReactNode[] = []
    let lastIndex = 0

    paragraphUnderlines.forEach((underline, i) => {
      // Add text before this underline
      if (underline.start_offset > lastIndex) {
        parts.push(text.slice(lastIndex, underline.start_offset))
      }

      // Add underlined text
      parts.push(
        <span
          key={underline.id}
          className={`underlined-text ${underline.idea ? 'has-idea' : ''}`}
          title={underline.idea || undefined}
        >
          {text.slice(underline.start_offset, underline.end_offset)}
        </span>
      )

      lastIndex = underline.end_offset
    })

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts
  }

  const paragraphs = post.content.split('\n\n')

  return (
    <div className="post-detail">
      <button className="back-btn" onClick={onBack}>
        ← Back to book
      </button>

      <article>
        <header className="post-detail-header">
          <h1>{post.title}</h1>
          <div className="post-meta">
            <span className="post-date">{formatDate(post.created_at)}</span>
            {post.page_number && <span className="page-number">Page {post.page_number}</span>}
          </div>
        </header>

        {post.page_photo_url && (
          <div className="post-image">
            <img src={post.page_photo_url} alt="Scanned page" />
          </div>
        )}

        <div className="post-content" ref={contentRef} onMouseUp={handleMouseUp}>
          {paragraphs.map((paragraph, index) => (
            <p key={index}>
              {renderParagraphWithUnderlines(paragraph, index)}
            </p>
          ))}
        </div>

        {bubble.visible && (
          <div
            className="underline-bubble"
            style={{
              left: `${bubble.x}px`,
              top: `${bubble.y}px`
            }}
          >
            {bubble.type === 'confirm' ? (
              <div className="bubble-confirm">
                <button className="bubble-btn confirm" onClick={handleConfirmUnderline}>
                  Underline
                </button>
                <button className="bubble-btn cancel" onClick={closeBubble}>
                  ×
                </button>
              </div>
            ) : (
              <div className="bubble-idea">
                <input
                  ref={ideaInputRef}
                  type="text"
                  placeholder="Add your idea..."
                  value={ideaText}
                  onChange={e => setIdeaText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveIdea()
                    if (e.key === 'Escape') handleSkipIdea()
                  }}
                />
                <div className="bubble-actions">
                  <button className="bubble-btn save" onClick={handleSaveIdea}>
                    Save
                  </button>
                  <button className="bubble-btn skip" onClick={handleSkipIdea}>
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  )
}

export default PostDetail
