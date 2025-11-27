import { useState, useRef, useEffect } from 'react'
import type { Magazine } from '../types'

interface Props {
  magazine: Magazine
  onBack: () => void
}

export default function MagazineReader({ magazine, onBack }: Props) {
  const pdfUrl = `/api/magazines/${magazine.id}/pdf`
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
        <h1 className="reader-title">{magazine.title}</h1>
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
