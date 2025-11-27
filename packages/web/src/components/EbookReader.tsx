import { useState, useRef, useEffect } from 'react'
import type { Ebook } from '../types'

interface Props {
  ebook: Ebook
  onBack: () => void
}

export default function EbookReader({ ebook, onBack }: Props) {
  const pdfUrl = `/api/ebooks/${ebook.id}/file`
  const [isFullscreen, setIsFullscreen] = useState(false)
  const readerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    if (!readerRef.current) return

    if (!document.fullscreenElement) {
      await readerRef.current.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  return (
    <div className={`magazine-reader ${isFullscreen ? 'fullscreen' : ''}`} ref={readerRef}>
      <header className="reader-header">
        <button className="back-btn" onClick={onBack}>Back</button>
        <h1 className="reader-title">{ebook.title}</h1>
        <button className="fullscreen-btn" onClick={toggleFullscreen}>
          {isFullscreen ? '⛶' : '⛶'}
        </button>
      </header>

      <div className="reader-content">
        <div className="pdf-panel full-width">
          <iframe
            src={pdfUrl}
            title="PDF Viewer"
            className="pdf-iframe"
          />
        </div>
      </div>
    </div>
  )
}
