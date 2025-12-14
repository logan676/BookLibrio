import { useState, useRef, useCallback, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

interface UseReadingSessionOptions {
  bookId: number
  bookType: 'ebook' | 'magazine'
  bookTitle?: string
  onSessionEnd?: () => void
}

interface UseReadingSessionReturn {
  sessionId: number | null
  isActive: boolean
  isPaused: boolean
  elapsedMinutes: number
  startSession: () => Promise<void>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  endSession: (pagesRead?: number) => Promise<void>
}

const HEARTBEAT_INTERVAL = 60000 // 1 minute

export function useReadingSession({
  bookId,
  bookType,
  bookTitle,
  onSessionEnd,
}: UseReadingSessionOptions): UseReadingSessionReturn {
  const { isAuthenticated } = useAuth()
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedMinutes, setElapsedMinutes] = useState(0)

  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Start heartbeat timer
  const startHeartbeat = useCallback((id: number) => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
    }
    heartbeatTimerRef.current = setInterval(async () => {
      try {
        await api.sendHeartbeat(id)
      } catch (error) {
        console.error('Failed to send heartbeat:', error)
      }
    }, HEARTBEAT_INTERVAL)
  }, [])

  // Stop heartbeat timer
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
  }, [])

  // Start elapsed time counter
  const startElapsedCounter = useCallback(() => {
    startTimeRef.current = Date.now()
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
    }
    elapsedTimerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 60000)
        setElapsedMinutes(elapsed)
      }
    }, 60000)
  }, [])

  // Stop elapsed time counter
  const stopElapsedCounter = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
  }, [])

  // Start a new session
  const startSession = useCallback(async () => {
    if (!isAuthenticated || isActive) return

    try {
      const response = await api.startReadingSession({
        bookId,
        bookType,
        bookTitle,
      })
      setSessionId(response.sessionId)
      setIsActive(true)
      setIsPaused(false)
      setElapsedMinutes(0)
      startHeartbeat(response.sessionId)
      startElapsedCounter()
    } catch (error) {
      console.error('Failed to start reading session:', error)
    }
  }, [isAuthenticated, isActive, bookId, bookType, bookTitle, startHeartbeat, startElapsedCounter])

  // Pause the session
  const pauseSession = useCallback(async () => {
    if (!sessionId || !isActive || isPaused) return

    try {
      await api.pauseSession(sessionId)
      setIsPaused(true)
      stopHeartbeat()
      stopElapsedCounter()
    } catch (error) {
      console.error('Failed to pause session:', error)
    }
  }, [sessionId, isActive, isPaused, stopHeartbeat, stopElapsedCounter])

  // Resume the session
  const resumeSession = useCallback(async () => {
    if (!sessionId || !isActive || !isPaused) return

    try {
      await api.resumeSession(sessionId)
      setIsPaused(false)
      startHeartbeat(sessionId)
      startElapsedCounter()
    } catch (error) {
      console.error('Failed to resume session:', error)
    }
  }, [sessionId, isActive, isPaused, startHeartbeat, startElapsedCounter])

  // End the session
  const endSession = useCallback(async (pagesRead?: number) => {
    if (!sessionId) return

    try {
      await api.endReadingSession(sessionId, pagesRead)
      setSessionId(null)
      setIsActive(false)
      setIsPaused(false)
      stopHeartbeat()
      stopElapsedCounter()
      onSessionEnd?.()
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }, [sessionId, stopHeartbeat, stopElapsedCounter, onSessionEnd])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat()
      stopElapsedCounter()
      // End session when component unmounts
      if (sessionId) {
        api.endReadingSession(sessionId).catch(console.error)
      }
    }
  }, [sessionId, stopHeartbeat, stopElapsedCounter])

  return {
    sessionId,
    isActive,
    isPaused,
    elapsedMinutes,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
  }
}
