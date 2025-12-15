import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { setUser as setSentryUser, clearUser as clearSentryUser } from '../lib/sentry'

interface User {
  id: number
  email: string
  is_admin?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
}

// Error codes from backend
const ErrorCode = {
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem('refreshToken'))
  const [loading, setLoading] = useState(true)

  // Refresh the access token using refresh token
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const storedRefreshToken = localStorage.getItem('refreshToken')
    if (!storedRefreshToken) return false

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      })

      if (res.ok) {
        const data = await res.json()
        const tokenData = data.data || data
        if (tokenData.accessToken || tokenData.token) {
          const newToken = tokenData.accessToken || tokenData.token
          const newRefreshToken = tokenData.refreshToken
          localStorage.setItem('token', newToken)
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken)
            setRefreshToken(newRefreshToken)
          }
          setToken(newToken)
          if (tokenData.user) {
            setUser({
              id: tokenData.user.id,
              email: tokenData.user.email,
              is_admin: tokenData.user.isAdmin ?? tokenData.user.is_admin ?? false,
            })
          }
          return true
        }
      }

      // Refresh failed, clear auth state
      clearAuth()
      return false
    } catch {
      clearAuth()
      return false
    }
  }, [])

  // Clear all auth state
  const clearAuth = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setToken(null)
    setRefreshToken(null)
    setUser(null)
    clearSentryUser() // Clear Sentry user context
  }, [])

  // Check current auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()

        // If response is successful, extract user data
        if (res.ok) {
          // Handle new API response format - user data is directly in data (not data.user)
          const userData = data.data?.user || data.data || data.user || data

          if (userData && userData.id) {
            // Map isAdmin to is_admin for frontend compatibility
            setUser({
              id: userData.id,
              email: userData.email,
              is_admin: userData.isAdmin ?? userData.is_admin ?? false,
            })
            setSentryUser(userData.id, userData.email) // Set Sentry user context
            return
          }
        }

        // Auth failed - try to refresh the token
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          // Token refreshed, re-fetch user data
          const retryRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })
          if (retryRes.ok) {
            const retryData = await retryRes.json()
            const userData = retryData.data?.user || retryData.data || retryData.user || retryData
            if (userData && userData.id) {
              setUser({
                id: userData.id,
                email: userData.email,
                is_admin: userData.isAdmin ?? userData.is_admin ?? false,
              })
              setSentryUser(userData.id, userData.email) // Set Sentry user context
              return
            }
          }
        }
        // Refresh failed or user data invalid
        clearAuth()
      } catch {
        clearAuth()
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [token, refreshAccessToken, clearAuth])

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()

      if (res.ok) {
        // Handle both old and new API response formats (API uses accessToken)
        const authData = data.data || data
        const tokenValue = authData.accessToken || authData.token
        const refreshTokenValue = authData.refreshToken
        const userData = authData.user

        if (tokenValue) {
          localStorage.setItem('token', tokenValue)
          setToken(tokenValue)
        }
        if (refreshTokenValue) {
          localStorage.setItem('refreshToken', refreshTokenValue)
          setRefreshToken(refreshTokenValue)
        }
        if (userData) {
          setUser({
            id: userData.id,
            email: userData.email,
            is_admin: userData.isAdmin ?? userData.is_admin ?? false,
          })
          setSentryUser(userData.id, userData.email) // Set Sentry user context
        }
        return { success: true }
      }

      const errorMessage = data.error?.message || data.error || 'Login failed'
      return { success: false, error: errorMessage }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  const register = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()

      if (res.ok) {
        // Handle both old and new API response formats (API uses accessToken)
        const authData = data.data || data
        const tokenValue = authData.accessToken || authData.token
        const refreshTokenValue = authData.refreshToken
        const userData = authData.user

        if (tokenValue) {
          localStorage.setItem('token', tokenValue)
          setToken(tokenValue)
        }
        if (refreshTokenValue) {
          localStorage.setItem('refreshToken', refreshTokenValue)
          setRefreshToken(refreshTokenValue)
        }
        if (userData) {
          setUser({
            id: userData.id,
            email: userData.email,
            is_admin: userData.isAdmin ?? userData.is_admin ?? false,
          })
          setSentryUser(userData.id, userData.email) // Set Sentry user context
        }
        return { success: true }
      }

      const errorMessage = data.error?.message || data.error || 'Registration failed'
      return { success: false, error: errorMessage }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  const logout = () => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
    }
    clearAuth()
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await res.json()

      if (res.ok) {
        return { success: true }
      }

      const errorMessage = data.error?.message || data.error || 'Password change failed'
      return { success: false, error: errorMessage }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
