import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import Slider from '@react-native-community/slider'
import type { RootStackParamList, Ebook, EbookContent, EbookChapter } from '../types'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useReadingSession } from '../hooks/useReadingSession'
import {
  useReaderSettings,
  FONT_OPTIONS,
  THEME_OPTIONS,
  LINE_SPACING_OPTIONS,
  MARGIN_OPTIONS,
} from '../hooks/useReaderSettings'

type Props = NativeStackScreenProps<RootStackParamList, 'EbookReader'>

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export default function EbookReaderScreen({ route, navigation }: Props) {
  const { ebookId } = route.params
  const { isAuthenticated } = useAuth()
  const [ebook, setEbook] = useState<Ebook | null>(null)
  const [content, setContent] = useState<EbookContent | null>(null)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const webViewRef = useRef<WebView>(null)
  const lastSyncRef = useRef<number>(0)

  // Reader settings
  const {
    settings,
    themeColors,
    lineHeightValue,
    marginValue,
    fontFamily,
    updateSettings,
  } = useReaderSettings()

  // Reading session tracking
  const {
    isActive: sessionActive,
    elapsedMinutes,
    startSession,
    endSession,
  } = useReadingSession({
    bookId: ebookId,
    bookType: 'ebook',
    bookTitle: ebook?.title,
  })

  // Update reading history
  const syncReadingHistory = useCallback(async (page: number) => {
    if (!isAuthenticated || !ebook) return

    const now = Date.now()
    if (now - lastSyncRef.current < 5000) return
    lastSyncRef.current = now

    try {
      await api.updateReadingHistory({
        itemType: 'ebook',
        itemId: ebookId,
        title: ebook.title,
        coverUrl: ebook.cover_url,
        lastPage: page,
      })
    } catch (err) {
      console.error('Failed to sync reading history:', err)
    }
  }, [isAuthenticated, ebook, ebookId])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ebookData, contentData] = await Promise.all([
          api.getEbook(ebookId),
          api.getEbookText(ebookId),
        ])
        setEbook(ebookData)
        setContent(contentData)

        if (isAuthenticated) {
          await api.updateReadingHistory({
            itemType: 'ebook',
            itemId: ebookId,
            title: ebookData.title,
            coverUrl: ebookData.cover_url,
            lastPage: 1,
          })
          // Start reading session
          startSession()
        }
      } catch (err) {
        console.error('Failed to fetch ebook:', err)
        setError('Failed to load ebook')
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    // End session on unmount
    return () => {
      if (sessionActive) {
        endSession(currentChapter + 1)
      }
    }
  }, [ebookId, isAuthenticated])

  const handleChapterChange = useCallback((newChapter: number) => {
    setCurrentChapter(newChapter)
    syncReadingHistory(newChapter + 1)
  }, [syncReadingHistory])

  const handleGoBack = useCallback(() => {
    if (sessionActive) {
      endSession(currentChapter + 1)
    }
    navigation.goBack()
  }, [sessionActive, currentChapter, endSession, navigation])

  // Generate HTML content with theme
  const generateHtml = useCallback((chapter: EbookChapter) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * {
              box-sizing: border-box;
              -webkit-tap-highlight-color: transparent;
            }
            html, body {
              margin: 0;
              padding: 0;
              font-family: ${fontFamily};
              font-size: ${settings.fontSize}px;
              line-height: ${lineHeightValue};
              color: ${themeColors.text};
              background: ${themeColors.background};
            }
            .container {
              padding: ${marginValue}px;
              max-width: 100%;
            }
            h1, h2, h3 {
              color: ${themeColors.text};
              margin-top: 0;
              margin-bottom: 16px;
              font-weight: 600;
            }
            h1 { font-size: ${settings.fontSize * 1.33}px; text-align: center; }
            h2 { font-size: ${settings.fontSize * 1.17}px; }
            h3 { font-size: ${settings.fontSize}px; }
            p {
              margin: 0 0 16px 0;
              text-align: justify;
            }
            .chapter-title {
              text-align: center;
              margin-bottom: 32px;
              padding-bottom: 16px;
              border-bottom: 1px solid ${themeColors.border};
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="chapter-title">${chapter.title || 'Chapter'}</h1>
            ${chapter.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
          </div>
        </body>
      </html>
    `
  }, [fontFamily, settings.fontSize, lineHeightValue, themeColors, marginValue])

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color="#ff9800" />
        <Text style={[styles.loadingText, { color: themeColors.secondaryText }]}>Loading ebook...</Text>
      </View>
    )
  }

  if (error || !ebook) {
    return (
      <View style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <Text style={styles.errorText}>{error || 'Ebook not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const chapters = content?.chapters || []
  const chapter = chapters[currentChapter]

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={settings.theme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      {showControls && (
        <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: themeColors.text }]}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>{ebook.title}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowToc(true)} style={styles.headerButton}>
              <Text style={[styles.headerButtonText, { color: themeColors.text }]}>TOC</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerButton}>
              <Text style={[styles.headerButtonText, { color: themeColors.text }]}>Aa</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Reading Progress */}
      {showControls && sessionActive && (
        <View style={[styles.progressBar, { backgroundColor: themeColors.border }]}>
          <Text style={[styles.progressText, { color: themeColors.secondaryText }]}>
            Reading: {elapsedMinutes} min | Chapter {currentChapter + 1}/{chapters.length}
          </Text>
        </View>
      )}

      {/* Content */}
      {chapters.length > 0 ? (
        <Pressable style={styles.contentWrapper} onPress={() => setShowControls(!showControls)}>
          {chapter ? (
            <WebView
              ref={webViewRef}
              style={[styles.webView, { backgroundColor: themeColors.background }]}
              source={{ html: generateHtml(chapter) }}
              scrollEnabled={true}
              showsVerticalScrollIndicator={true}
              originWhitelist={['*']}
            />
          ) : (
            <View style={styles.centered}>
              <Text style={[styles.errorText, { color: themeColors.text }]}>No content available</Text>
            </View>
          )}
        </Pressable>
      ) : (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: themeColors.text }]}>No chapters available</Text>
        </View>
      )}

      {/* Navigation */}
      {showControls && chapters.length > 0 && (
        <View style={[styles.navigation, { backgroundColor: themeColors.background, borderTopColor: themeColors.border }]}>
          <TouchableOpacity
            style={[styles.navButton, currentChapter === 0 && styles.navButtonDisabled]}
            onPress={() => handleChapterChange(Math.max(0, currentChapter - 1))}
            disabled={currentChapter === 0}
          >
            <Text style={styles.navButtonText}>{'<'} Prev</Text>
          </TouchableOpacity>

          <View style={[styles.chapterIndicator, { backgroundColor: themeColors.border }]}>
            <Text style={[styles.chapterIndicatorText, { color: themeColors.secondaryText }]}>
              {currentChapter + 1} / {chapters.length}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.navButton, currentChapter === chapters.length - 1 && styles.navButtonDisabled]}
            onPress={() => handleChapterChange(Math.min(chapters.length - 1, currentChapter + 1))}
            disabled={currentChapter === chapters.length - 1}
          >
            <Text style={styles.navButtonText}>Next {'>'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.settingsModal, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Reader Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.closeButton}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Font Size */}
            <View style={styles.settingSection}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Font Size: {settings.fontSize}px</Text>
              <Slider
                style={styles.slider}
                minimumValue={12}
                maximumValue={28}
                step={1}
                value={settings.fontSize}
                onValueChange={(value) => updateSettings({ fontSize: value })}
                minimumTrackTintColor="#ff9800"
                maximumTrackTintColor={themeColors.border}
              />
            </View>

            {/* Font */}
            <View style={styles.settingSection}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Font</Text>
              <View style={styles.optionRow}>
                {FONT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      settings.font === option.value && styles.optionButtonActive,
                    ]}
                    onPress={() => updateSettings({ font: option.value })}
                  >
                    <Text style={[
                      styles.optionText,
                      settings.font === option.value && styles.optionTextActive,
                    ]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Theme */}
            <View style={styles.settingSection}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Theme</Text>
              <View style={styles.optionRow}>
                {THEME_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.themeButton,
                      { backgroundColor: option.color },
                      settings.theme === option.value && styles.themeButtonActive,
                    ]}
                    onPress={() => updateSettings({ theme: option.value })}
                  >
                    <Text style={[
                      styles.themeText,
                      option.value === 'dark' && { color: '#e0e0e0' },
                    ]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Line Spacing */}
            <View style={styles.settingSection}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Line Spacing</Text>
              <View style={styles.optionRow}>
                {LINE_SPACING_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      settings.lineSpacing === option.value && styles.optionButtonActive,
                    ]}
                    onPress={() => updateSettings({ lineSpacing: option.value })}
                  >
                    <Text style={[
                      styles.optionText,
                      settings.lineSpacing === option.value && styles.optionTextActive,
                    ]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Margin */}
            <View style={styles.settingSection}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Margin</Text>
              <View style={styles.optionRow}>
                {MARGIN_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.marginButton,
                      settings.margin === option.value && styles.optionButtonActive,
                    ]}
                    onPress={() => updateSettings({ margin: option.value })}
                  >
                    <Text style={[
                      styles.optionText,
                      settings.margin === option.value && styles.optionTextActive,
                    ]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* TOC Modal */}
      <Modal visible={showToc} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.tocModal, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Table of Contents</Text>
              <TouchableOpacity onPress={() => setShowToc(false)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.tocList}>
              {chapters.map((ch, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.tocItem,
                    index === currentChapter && styles.tocItemActive,
                  ]}
                  onPress={() => {
                    handleChapterChange(index)
                    setShowToc(false)
                  }}
                >
                  <Text style={[
                    styles.tocText,
                    { color: themeColors.text },
                    index === currentChapter && styles.tocTextActive,
                  ]}>
                    {ch.title || `Chapter ${index + 1}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  progressBar: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contentWrapper: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  navButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chapterIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chapterIndicatorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  settingsModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  tocModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    color: '#ff9800',
    fontSize: 16,
    fontWeight: '600',
  },
  settingSection: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionButtonActive: {
    backgroundColor: '#ff9800',
    borderColor: '#ff9800',
  },
  optionText: {
    fontSize: 14,
    color: '#64748b',
  },
  optionTextActive: {
    color: '#fff',
  },
  themeButton: {
    width: 60,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeButtonActive: {
    borderColor: '#ff9800',
  },
  themeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  marginButton: {
    width: 50,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  tocList: {
    flex: 1,
  },
  tocItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tocItemActive: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  tocText: {
    fontSize: 15,
  },
  tocTextActive: {
    color: '#ff9800',
    fontWeight: '600',
  },
})
