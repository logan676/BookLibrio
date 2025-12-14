import { useState, useEffect, useCallback, useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ReaderSettings, ReaderFont, ReaderTheme, ReaderLineSpacing, ReaderMargin } from '../types'

const READER_SETTINGS_KEY = '@reader_settings'

const DEFAULT_SETTINGS: ReaderSettings = {
  font: 'system',
  fontSize: 18,
  theme: 'light',
  lineSpacing: 'normal',
  margin: 'medium',
  brightness: 1.0,
  keepScreenOn: true,
}

interface ThemeColors {
  background: string
  text: string
  secondaryText: string
  border: string
}

interface UseReaderSettingsReturn {
  settings: ReaderSettings
  themeColors: ThemeColors
  lineHeightValue: number
  marginValue: number
  fontFamily: string
  updateSettings: (updates: Partial<ReaderSettings>) => void
  resetSettings: () => void
}

export function useReaderSettings(): UseReaderSettingsReturn {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS)

  // Load settings from storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(READER_SETTINGS_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setSettings({ ...DEFAULT_SETTINGS, ...parsed })
        }
      } catch (error) {
        console.error('Failed to load reader settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates }
      AsyncStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(newSettings)).catch(console.error)
      return newSettings
    })
  }, [])

  // Reset to defaults
  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS)
    await AsyncStorage.removeItem(READER_SETTINGS_KEY)
  }, [])

  // Theme colors
  const themeColors = useMemo((): ThemeColors => {
    switch (settings.theme) {
      case 'sepia':
        return {
          background: '#f4ecd8',
          text: '#5b4636',
          secondaryText: '#8b7355',
          border: '#d4c4a8',
        }
      case 'green':
        return {
          background: '#e8f0e8',
          text: '#2d4a2d',
          secondaryText: '#4a6b4a',
          border: '#c8d8c8',
        }
      case 'dark':
        return {
          background: '#1a1a1a',
          text: '#e0e0e0',
          secondaryText: '#a0a0a0',
          border: '#333333',
        }
      case 'light':
      default:
        return {
          background: '#faf9f7',
          text: '#334155',
          secondaryText: '#64748b',
          border: '#e2e8f0',
        }
    }
  }, [settings.theme])

  // Line height value
  const lineHeightValue = useMemo((): number => {
    switch (settings.lineSpacing) {
      case 'compact':
        return 1.4
      case 'normal':
        return 1.6
      case 'relaxed':
        return 1.8
      case 'loose':
        return 2.0
      default:
        return 1.6
    }
  }, [settings.lineSpacing])

  // Margin value in pixels
  const marginValue = useMemo((): number => {
    switch (settings.margin) {
      case 'small':
        return 12
      case 'medium':
        return 20
      case 'large':
        return 32
      default:
        return 20
    }
  }, [settings.margin])

  // Font family
  const fontFamily = useMemo((): string => {
    switch (settings.font) {
      case 'serif':
        return 'Georgia, "Times New Roman", serif'
      case 'sans-serif':
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      case 'monospace':
        return 'Menlo, Monaco, "Courier New", monospace'
      case 'system':
      default:
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  }, [settings.font])

  return {
    settings,
    themeColors,
    lineHeightValue,
    marginValue,
    fontFamily,
    updateSettings,
    resetSettings,
  }
}

// Export constants for UI
export const FONT_OPTIONS: { value: ReaderFont; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'monospace', label: 'Monospace' },
]

export const THEME_OPTIONS: { value: ReaderTheme; label: string; color: string }[] = [
  { value: 'light', label: 'Light', color: '#faf9f7' },
  { value: 'sepia', label: 'Sepia', color: '#f4ecd8' },
  { value: 'green', label: 'Green', color: '#e8f0e8' },
  { value: 'dark', label: 'Dark', color: '#1a1a1a' },
]

export const LINE_SPACING_OPTIONS: { value: ReaderLineSpacing; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'loose', label: 'Loose' },
]

export const MARGIN_OPTIONS: { value: ReaderMargin; label: string }[] = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
]
