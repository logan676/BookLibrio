/**
 * TTS (Text-to-Speech) Service
 * Handles AI narration for ebooks using multiple TTS providers
 *
 * Supported Providers:
 * - Azure Cognitive Services (primary)
 * - Google Cloud TTS (fallback)
 * - ElevenLabs (premium voices)
 */

import { db } from '../db/client'
import {
  ttsVoices,
  userVoicePreferences,
  ttsAudioCache,
  ebooks,
} from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { log } from '../utils/logger'
import crypto from 'crypto'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

// Types
export type TTSProvider = 'azure' | 'google' | 'elevenlabs' | 'aws_polly'
export type VoiceGender = 'male' | 'female' | 'neutral'
export type VoiceStyle = 'narrative' | 'conversational' | 'news' | 'calm' | 'cheerful'

interface TTSGenerationResult {
  success: boolean
  audioUrl?: string
  s3Key?: string
  durationSeconds?: number
  fileSizeBytes?: number
  costUsd?: number
  error?: string
}

interface ChapterContent {
  bookType: string
  bookId: number
  chapterIndex: number
  text: string
  title?: string
}

// Cost per 1M characters (approximate)
const COST_PER_MILLION_CHARS: Record<TTSProvider, number> = {
  azure: 4.0,      // Azure Neural TTS
  google: 4.0,     // Google WaveNet
  elevenlabs: 30.0, // ElevenLabs
  aws_polly: 4.0,  // AWS Polly Neural
}

class TTSService {
  // ============================================
  // Voice Management
  // ============================================

  /**
   * Get all available voices
   */
  async getVoices(language?: string, isPremiumUser = false) {
    let query = db
      .select()
      .from(ttsVoices)
      .where(eq(ttsVoices.isActive, true))
      .orderBy(ttsVoices.sortOrder)

    const voices = await query

    // Filter by language if specified
    let filtered = language
      ? voices.filter(v => v.language.startsWith(language))
      : voices

    // Filter premium voices for non-premium users
    if (!isPremiumUser) {
      filtered = filtered.filter(v => !v.isPremium)
    }

    return filtered
  }

  /**
   * Get a specific voice by ID
   */
  async getVoice(voiceId: number) {
    const [voice] = await db
      .select()
      .from(ttsVoices)
      .where(eq(ttsVoices.id, voiceId))
    return voice || null
  }

  /**
   * Get user's voice preferences
   */
  async getUserPreferences(userId: number) {
    const [prefs] = await db
      .select()
      .from(userVoicePreferences)
      .where(eq(userVoicePreferences.userId, userId))

    if (!prefs) {
      // Return defaults
      return {
        defaultVoiceId: null,
        defaultSpeed: 1.0,
        defaultPitch: 1.0,
        defaultSleepTimer: null,
        bookVoicePreferences: {},
      }
    }

    return {
      defaultVoiceId: prefs.defaultVoiceId,
      defaultSpeed: parseFloat(prefs.defaultSpeed?.toString() || '1.0'),
      defaultPitch: parseFloat(prefs.defaultPitch?.toString() || '1.0'),
      defaultSleepTimer: prefs.defaultSleepTimer,
      bookVoicePreferences: prefs.bookVoicePreferences || {},
    }
  }

  /**
   * Update user's voice preferences
   */
  async updateUserPreferences(
    userId: number,
    preferences: {
      defaultVoiceId?: number
      defaultSpeed?: number
      defaultPitch?: number
      defaultSleepTimer?: number
    }
  ) {
    const [existing] = await db
      .select()
      .from(userVoicePreferences)
      .where(eq(userVoicePreferences.userId, userId))

    const updates: any = { updatedAt: new Date() }
    if (preferences.defaultVoiceId !== undefined) updates.defaultVoiceId = preferences.defaultVoiceId
    if (preferences.defaultSpeed !== undefined) updates.defaultSpeed = preferences.defaultSpeed.toString()
    if (preferences.defaultPitch !== undefined) updates.defaultPitch = preferences.defaultPitch.toString()
    if (preferences.defaultSleepTimer !== undefined) updates.defaultSleepTimer = preferences.defaultSleepTimer

    if (existing) {
      await db
        .update(userVoicePreferences)
        .set(updates)
        .where(eq(userVoicePreferences.userId, userId))
    } else {
      await db.insert(userVoicePreferences).values({
        userId,
        ...updates,
      })
    }

    return this.getUserPreferences(userId)
  }

  /**
   * Set voice preference for a specific book
   */
  async setBookVoicePreference(userId: number, bookType: string, bookId: number, voiceId: number) {
    const prefs = await this.getUserPreferences(userId)
    const bookKey = `${bookType}_${bookId}`
    const bookPrefs = { ...(prefs.bookVoicePreferences as Record<string, number>), [bookKey]: voiceId }

    const [existing] = await db
      .select()
      .from(userVoicePreferences)
      .where(eq(userVoicePreferences.userId, userId))

    if (existing) {
      await db
        .update(userVoicePreferences)
        .set({ bookVoicePreferences: bookPrefs, updatedAt: new Date() })
        .where(eq(userVoicePreferences.userId, userId))
    } else {
      await db.insert(userVoicePreferences).values({
        userId,
        bookVoicePreferences: bookPrefs,
      })
    }
  }

  // ============================================
  // Audio Generation
  // ============================================

  /**
   * Get or generate audio for a chapter
   */
  async getChapterAudio(
    chapter: ChapterContent,
    voiceId: number,
    userId?: number
  ): Promise<TTSGenerationResult> {
    // Check cache first
    const [cached] = await db
      .select()
      .from(ttsAudioCache)
      .where(and(
        eq(ttsAudioCache.bookType, chapter.bookType),
        eq(ttsAudioCache.bookId, chapter.bookId),
        eq(ttsAudioCache.chapterIndex, chapter.chapterIndex),
        eq(ttsAudioCache.voiceId, voiceId)
      ))

    if (cached && cached.s3Key) {
      // Update last accessed
      await db
        .update(ttsAudioCache)
        .set({ lastAccessedAt: new Date() })
        .where(eq(ttsAudioCache.id, cached.id))

      // Generate presigned URL (mock for now)
      const audioUrl = await this.getPresignedUrl(cached.s3Key)

      return {
        success: true,
        audioUrl,
        s3Key: cached.s3Key,
        durationSeconds: cached.durationSeconds || undefined,
        fileSizeBytes: cached.fileSizeBytes || undefined,
      }
    }

    // Generate new audio
    return this.generateAudio(chapter, voiceId)
  }

  /**
   * Generate audio for a chapter
   */
  private async generateAudio(
    chapter: ChapterContent,
    voiceId: number
  ): Promise<TTSGenerationResult> {
    const voice = await this.getVoice(voiceId)
    if (!voice) {
      return { success: false, error: 'Voice not found' }
    }

    try {
      let result: TTSGenerationResult

      // Route to appropriate provider
      switch (voice.provider) {
        case 'azure':
          result = await this.generateWithAzure(chapter.text, voice)
          break
        case 'google':
          result = await this.generateWithGoogle(chapter.text, voice)
          break
        case 'elevenlabs':
          result = await this.generateWithElevenLabs(chapter.text, voice)
          break
        default:
          return { success: false, error: `Unsupported provider: ${voice.provider}` }
      }

      if (!result.success || !result.s3Key) {
        return result
      }

      // Cache the result
      await db.insert(ttsAudioCache).values({
        bookType: chapter.bookType,
        bookId: chapter.bookId,
        chapterIndex: chapter.chapterIndex,
        voiceId,
        s3Key: result.s3Key,
        durationSeconds: result.durationSeconds,
        fileSizeBytes: result.fileSizeBytes,
        textLength: chapter.text.length,
        generationCostUsd: result.costUsd?.toString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })

      // Update voice usage count
      await db
        .update(ttsVoices)
        .set({ usageCount: sql`${ttsVoices.usageCount} + 1` })
        .where(eq(ttsVoices.id, voiceId))

      logger.info(`Generated TTS audio for ${chapter.bookType}/${chapter.bookId}/ch${chapter.chapterIndex}`)

      return result
    } catch (error) {
      logger.error('TTS generation error:', error)
      return { success: false, error: 'Generation failed' }
    }
  }

  /**
   * Generate audio using Azure Cognitive Services
   */
  private async generateWithAzure(
    text: string,
    voice: typeof ttsVoices.$inferSelect
  ): Promise<TTSGenerationResult> {
    const apiKey = process.env.AZURE_TTS_API_KEY
    const region = process.env.AZURE_TTS_REGION || 'eastasia'

    if (!apiKey) {
      logger.error('AZURE_TTS_API_KEY not configured')
      return { success: false, error: 'Azure TTS not configured' }
    }

    try {
      // Get access token
      const tokenResponse = await fetch(
        `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
          },
        }
      )

      if (!tokenResponse.ok) {
        throw new Error('Failed to get Azure token')
      }

      const accessToken = await tokenResponse.text()

      // Build SSML
      const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.language}">
          <voice name="${voice.providerVoiceId}">
            ${this.escapeXml(text)}
          </voice>
        </speak>
      `

      // Generate audio
      const audioResponse = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
          },
          body: ssml,
        }
      )

      if (!audioResponse.ok) {
        throw new Error(`Azure TTS failed: ${audioResponse.status}`)
      }

      const audioBuffer = await audioResponse.arrayBuffer()
      const audioData = Buffer.from(audioBuffer)

      // Upload to S3 (mock implementation)
      const s3Key = await this.uploadToS3(audioData, 'audio/mpeg')

      // Calculate cost
      const costUsd = (text.length / 1000000) * COST_PER_MILLION_CHARS.azure

      // Estimate duration (rough: ~150 words per minute for Chinese, ~180 for English)
      const wordsPerMinute = voice.language.startsWith('zh') ? 150 : 180
      const wordCount = text.length / (voice.language.startsWith('zh') ? 1.5 : 5)
      const durationSeconds = Math.ceil((wordCount / wordsPerMinute) * 60)

      return {
        success: true,
        s3Key,
        audioUrl: await this.getPresignedUrl(s3Key),
        durationSeconds,
        fileSizeBytes: audioData.length,
        costUsd,
      }
    } catch (error) {
      logger.error('Azure TTS error:', error)
      return { success: false, error: 'Azure TTS generation failed' }
    }
  }

  /**
   * Generate audio using Google Cloud TTS
   */
  private async generateWithGoogle(
    text: string,
    voice: typeof ttsVoices.$inferSelect
  ): Promise<TTSGenerationResult> {
    const apiKey = process.env.GOOGLE_TTS_API_KEY

    if (!apiKey) {
      logger.error('GOOGLE_TTS_API_KEY not configured')
      return { success: false, error: 'Google TTS not configured' }
    }

    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: voice.language,
              name: voice.providerVoiceId,
            },
            audioConfig: {
              audioEncoding: 'MP3',
              sampleRateHertz: 24000,
              speakingRate: 1.0,
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Google TTS failed: ${response.status}`)
      }

      const result = await response.json()
      const audioData = Buffer.from(result.audioContent, 'base64')

      // Upload to S3
      const s3Key = await this.uploadToS3(audioData, 'audio/mpeg')

      // Calculate cost
      const costUsd = (text.length / 1000000) * COST_PER_MILLION_CHARS.google

      // Estimate duration
      const wordsPerMinute = voice.language.startsWith('zh') ? 150 : 180
      const wordCount = text.length / (voice.language.startsWith('zh') ? 1.5 : 5)
      const durationSeconds = Math.ceil((wordCount / wordsPerMinute) * 60)

      return {
        success: true,
        s3Key,
        audioUrl: await this.getPresignedUrl(s3Key),
        durationSeconds,
        fileSizeBytes: audioData.length,
        costUsd,
      }
    } catch (error) {
      logger.error('Google TTS error:', error)
      return { success: false, error: 'Google TTS generation failed' }
    }
  }

  /**
   * Generate audio using ElevenLabs (premium)
   */
  private async generateWithElevenLabs(
    text: string,
    voice: typeof ttsVoices.$inferSelect
  ): Promise<TTSGenerationResult> {
    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      logger.error('ELEVENLABS_API_KEY not configured')
      return { success: false, error: 'ElevenLabs not configured' }
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice.providerVoiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`ElevenLabs failed: ${response.status}`)
      }

      const audioBuffer = await response.arrayBuffer()
      const audioData = Buffer.from(audioBuffer)

      // Upload to S3
      const s3Key = await this.uploadToS3(audioData, 'audio/mpeg')

      // Calculate cost (ElevenLabs is more expensive)
      const costUsd = (text.length / 1000000) * COST_PER_MILLION_CHARS.elevenlabs

      return {
        success: true,
        s3Key,
        audioUrl: await this.getPresignedUrl(s3Key),
        fileSizeBytes: audioData.length,
        costUsd,
      }
    } catch (error) {
      logger.error('ElevenLabs TTS error:', error)
      return { success: false, error: 'ElevenLabs generation failed' }
    }
  }

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Upload audio to S3
   */
  private async uploadToS3(data: Buffer, contentType: string): Promise<string> {
    // Generate unique key
    const hash = crypto.createHash('md5').update(data).digest('hex')
    const s3Key = `tts-audio/${hash}.mp3`

    // TODO: Implement actual S3 upload using AWS SDK
    // For now, return mock key
    logger.debug(`Mock S3 upload: ${s3Key}`)

    return s3Key
  }

  /**
   * Get presigned URL for S3 object
   */
  private async getPresignedUrl(s3Key: string): Promise<string> {
    // TODO: Implement actual presigned URL generation
    const baseUrl = process.env.S3_BUCKET_URL || 'https://bookpost-storage.s3.amazonaws.com'
    return `${baseUrl}/${s3Key}`
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  // ============================================
  // Initialize Default Voices
  // ============================================

  /**
   * Initialize default TTS voices
   */
  async initializeDefaultVoices() {
    const existingVoices = await db.select().from(ttsVoices)
    if (existingVoices.length > 0) {
      logger.info('TTS voices already initialized')
      return
    }

    const defaultVoices = [
      // Azure Chinese voices
      {
        name: 'xiaoxiao',
        displayName: '晓晓 (女声)',
        provider: 'azure' as TTSProvider,
        providerVoiceId: 'zh-CN-XiaoxiaoNeural',
        language: 'zh-CN',
        gender: 'female' as VoiceGender,
        age: 'adult',
        style: 'narrative' as VoiceStyle,
        isPremium: false,
        sortOrder: 1,
      },
      {
        name: 'yunxi',
        displayName: '云希 (男声)',
        provider: 'azure' as TTSProvider,
        providerVoiceId: 'zh-CN-YunxiNeural',
        language: 'zh-CN',
        gender: 'male' as VoiceGender,
        age: 'adult',
        style: 'narrative' as VoiceStyle,
        isPremium: false,
        sortOrder: 2,
      },
      {
        name: 'xiaoyi',
        displayName: '晓依 (女声·温柔)',
        provider: 'azure' as TTSProvider,
        providerVoiceId: 'zh-CN-XiaoyiNeural',
        language: 'zh-CN',
        gender: 'female' as VoiceGender,
        age: 'adult',
        style: 'calm' as VoiceStyle,
        isPremium: false,
        sortOrder: 3,
      },
      {
        name: 'yunjian',
        displayName: '云健 (男声·浑厚)',
        provider: 'azure' as TTSProvider,
        providerVoiceId: 'zh-CN-YunjianNeural',
        language: 'zh-CN',
        gender: 'male' as VoiceGender,
        age: 'adult',
        style: 'narrative' as VoiceStyle,
        isPremium: false,
        sortOrder: 4,
      },
      // Azure English voices
      {
        name: 'jenny',
        displayName: 'Jenny (English)',
        provider: 'azure' as TTSProvider,
        providerVoiceId: 'en-US-JennyNeural',
        language: 'en-US',
        gender: 'female' as VoiceGender,
        age: 'adult',
        style: 'narrative' as VoiceStyle,
        isPremium: false,
        sortOrder: 10,
      },
      {
        name: 'guy',
        displayName: 'Guy (English)',
        provider: 'azure' as TTSProvider,
        providerVoiceId: 'en-US-GuyNeural',
        language: 'en-US',
        gender: 'male' as VoiceGender,
        age: 'adult',
        style: 'narrative' as VoiceStyle,
        isPremium: false,
        sortOrder: 11,
      },
      // Premium ElevenLabs voices
      {
        name: 'rachel',
        displayName: 'Rachel (Premium)',
        provider: 'elevenlabs' as TTSProvider,
        providerVoiceId: '21m00Tcm4TlvDq8ikWAM',
        language: 'en-US',
        gender: 'female' as VoiceGender,
        age: 'adult',
        style: 'narrative' as VoiceStyle,
        isPremium: true,
        sortOrder: 20,
      },
      {
        name: 'adam',
        displayName: 'Adam (Premium)',
        provider: 'elevenlabs' as TTSProvider,
        providerVoiceId: 'pNInz6obpgDQGcFmaJgB',
        language: 'en-US',
        gender: 'male' as VoiceGender,
        age: 'adult',
        style: 'narrative' as VoiceStyle,
        isPremium: true,
        sortOrder: 21,
      },
    ]

    for (const voice of defaultVoices) {
      await db.insert(ttsVoices).values(voice)
    }

    logger.info(`Initialized ${defaultVoices.length} TTS voices`)
  }

  // ============================================
  // Cache Management
  // ============================================

  /**
   * Clean up expired audio cache
   */
  async cleanupExpiredCache() {
    const result = await db
      .delete(ttsAudioCache)
      .where(sql`${ttsAudioCache.expiresAt} < NOW()`)

    logger.info('Cleaned up expired TTS cache entries')
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    const stats = await db
      .select({
        totalEntries: sql<number>`COUNT(*)`,
        totalSizeBytes: sql<number>`SUM(${ttsAudioCache.fileSizeBytes})`,
        totalDurationSeconds: sql<number>`SUM(${ttsAudioCache.durationSeconds})`,
      })
      .from(ttsAudioCache)

    return stats[0]
  }
}

export const ttsService = new TTSService()
