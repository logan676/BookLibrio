/**
 * Claude AI Service for Book Summaries
 *
 * Generates AI-powered book content:
 * - Overview summaries
 * - Key points/takeaways
 * - Topic analysis
 * - Reading guides
 *
 * Uses Claude 3 Haiku for cost efficiency (~$0.00025 per summary)
 */

import { log } from '../utils/logger'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-3-haiku-20240307'

// Cost per 1K tokens (USD)
const INPUT_COST_PER_1K = 0.00025
const OUTPUT_COST_PER_1K = 0.00125

export type SummaryType = 'overview' | 'key_points' | 'topics' | 'reading_guide' | 'vocabulary'

export interface AISummaryContent {
  // Overview type
  text?: string
  wordCount?: number
  // Key points type
  points?: string[]
  // Topics type
  topics?: Array<{
    title: string
    summaryCount: number
    description: string
  }>
  // Reading guide type
  questions?: string[]
  themes?: string[]
  // Vocabulary type
  terms?: Array<{
    term: string
    definition: string
  }>
}

export interface AISummaryResult {
  content: AISummaryContent
  inputTokens: number
  outputTokens: number
  costUsd: number
  modelUsed: string
}

interface AnthropicResponse {
  id: string
  type: string
  role: string
  content: Array<{
    type: 'text'
    text: string
  }>
  model: string
  stop_reason: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Generate a book summary using Claude AI
 * @param bookTitle - Title of the book
 * @param bookDescription - Book description or synopsis
 * @param bookContent - Partial book content for analysis (max 50k chars)
 * @param summaryType - Type of summary to generate
 * @returns AI-generated summary with metadata
 */
export async function generateSummary(
  bookTitle: string,
  bookDescription: string | null,
  bookContent: string | null,
  summaryType: SummaryType
): Promise<AISummaryResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    logger.error('ANTHROPIC_API_KEY not configured')
    return null
  }

  try {
    const prompt = buildPrompt(bookTitle, bookDescription, bookContent, summaryType)

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`Anthropic API error: ${response.status} - ${errorText}`)
      return null
    }

    const data: AnthropicResponse = await response.json()

    // Parse the response based on summary type
    const responseText = data.content[0]?.text || ''
    const content = parseResponse(responseText, summaryType)

    // Calculate cost
    const inputCost = (data.usage.input_tokens / 1000) * INPUT_COST_PER_1K
    const outputCost = (data.usage.output_tokens / 1000) * OUTPUT_COST_PER_1K
    const totalCost = inputCost + outputCost

    return {
      content,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      costUsd: totalCost,
      modelUsed: MODEL,
    }
  } catch (error) {
    logger.error('Claude AI summary generation error:', error)
    return null
  }
}

/**
 * Build the prompt for different summary types
 */
function buildPrompt(
  bookTitle: string,
  bookDescription: string | null,
  bookContent: string | null,
  summaryType: SummaryType
): string {
  const bookInfo = `书名：《${bookTitle}》
${bookDescription ? `简介：${bookDescription}` : ''}
${bookContent ? `\n部分内容：\n${bookContent.slice(0, 30000)}` : ''}`

  switch (summaryType) {
    case 'overview':
      return `请为以下书籍生成一个简洁的概述（2-3句话，150字以内）：

${bookInfo}

请直接输出概述文字，不要添加任何前缀或标题。`

    case 'key_points':
      return `请为以下书籍提取5-8个核心要点：

${bookInfo}

请以JSON数组格式输出，每个要点是一个字符串，例如：
["要点1", "要点2", "要点3"]

只输出JSON，不要其他内容。`

    case 'topics':
      return `请为以下书籍分析3-5个主要主题：

${bookInfo}

请以JSON数组格式输出，每个主题包含title、summaryCount（该主题的要点数量）、description字段，例如：
[{"title": "主题名", "summaryCount": 3, "description": "主题描述"}]

只输出JSON，不要其他内容。`

    case 'reading_guide':
      return `请为以下书籍生成阅读指南：

${bookInfo}

请以JSON格式输出，包含questions（3-5个思考问题）和themes（3-5个核心主题词）字段，例如：
{"questions": ["问题1", "问题2"], "themes": ["主题1", "主题2"]}

只输出JSON，不要其他内容。`

    case 'vocabulary':
      return `请为以下书籍提取5-10个关键术语及其定义：

${bookInfo}

请以JSON数组格式输出，每个术语包含term和definition字段，例如：
[{"term": "术语", "definition": "定义"}]

只输出JSON，不要其他内容。`

    default:
      return bookInfo
  }
}

/**
 * Parse Claude's response based on summary type
 */
function parseResponse(responseText: string, summaryType: SummaryType): AISummaryContent {
  try {
    switch (summaryType) {
      case 'overview':
        return {
          text: responseText.trim(),
          wordCount: responseText.length,
        }

      case 'key_points': {
        const points = JSON.parse(responseText)
        return { points: Array.isArray(points) ? points : [] }
      }

      case 'topics': {
        const topics = JSON.parse(responseText)
        return { topics: Array.isArray(topics) ? topics : [] }
      }

      case 'reading_guide': {
        const guide = JSON.parse(responseText)
        return {
          questions: guide.questions || [],
          themes: guide.themes || [],
        }
      }

      case 'vocabulary': {
        const terms = JSON.parse(responseText)
        return { terms: Array.isArray(terms) ? terms : [] }
      }

      default:
        return { text: responseText }
    }
  } catch (parseError) {
    logger.error('Failed to parse Claude response:', parseError)
    // Return raw text as fallback
    return { text: responseText }
  }
}

/**
 * Estimate the cost of generating a summary
 * @param bookContentLength - Length of book content in characters
 * @returns Estimated cost in USD
 */
export function estimateCost(bookContentLength: number): number {
  // Rough estimate: 1 Chinese char ≈ 1.5 tokens
  const estimatedInputTokens = Math.ceil(bookContentLength * 1.5)
  const estimatedOutputTokens = 500 // Average output

  const inputCost = (estimatedInputTokens / 1000) * INPUT_COST_PER_1K
  const outputCost = (estimatedOutputTokens / 1000) * OUTPUT_COST_PER_1K

  return inputCost + outputCost
}
