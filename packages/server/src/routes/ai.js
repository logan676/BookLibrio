import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// AI-powered meaning/translation endpoint
router.post('/meaning', requireAuth, async (req, res) => {
  try {
    const { text, paragraph, targetLanguage = 'zh' } = req.body

    if (!text) {
      return res.status(400).json({ error: 'Text is required' })
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY
    if (!deepseekApiKey) {
      return res.status(500).json({ error: 'AI service not configured. Please add DEEPSEEK_API_KEY to .env' })
    }

    const systemPrompt = targetLanguage === 'zh'
      ? `You are a helpful translation and explanation assistant. When given a selected text and its surrounding paragraph, provide:

1. **Selected Text Translation:** Translate just the selected text to Chinese
2. **Paragraph Translation:** Translate the full paragraph to Chinese
3. **Context Explanation:** Explain what the selected text means in this specific context (in Chinese)
4. **Notes:** Any idioms, cultural references, or nuanced expressions (in Chinese, if applicable)

Keep responses clear and well-formatted.`
      : `You are a helpful translation and explanation assistant. When given a selected text and its surrounding paragraph, provide:

1. **Selected Text Translation:** Translate just the selected text to English
2. **Paragraph Translation:** Translate the full paragraph to English
3. **Context Explanation:** Explain what the selected text means in this specific context (in English)
4. **Notes:** Any idioms, cultural references, or nuanced expressions (in English, if applicable)

Keep responses clear and well-formatted.`

    const userMessage = paragraph && paragraph !== text
      ? `Selected text: "${text}"\n\nFull paragraph:\n"${paragraph}"\n\nPlease translate and explain.`
      : `Text: "${text}"\n\nPlease translate and explain this text. Since no paragraph context is provided, focus on the general meaning.`

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('DeepSeek API error:', errorData)
      return res.status(500).json({ error: 'AI service error' })
    }

    const data = await response.json()
    const meaning = data.choices?.[0]?.message?.content || 'Unable to generate meaning'

    res.json({
      text,
      meaning,
      targetLanguage
    })
  } catch (error) {
    console.error('AI meaning error:', error)
    res.status(500).json({ error: 'Failed to get meaning' })
  }
})

// AI-powered image explanation endpoint
router.post('/explain-image', requireAuth, async (req, res) => {
  try {
    const { imageUrl, targetLanguage = 'en' } = req.body

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' })
    }

    let extractedText = ''
    let labels = []

    // Note: visionClient needs to be imported from a service if using Google Vision
    // For now, we'll skip the vision part and just use DeepSeek

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY
    if (!deepseekApiKey) {
      return res.json({
        imageUrl,
        explanation: 'AI service not configured',
        targetLanguage
      })
    }

    const systemPrompt = targetLanguage === 'zh'
      ? `你是一个有帮助的助手，可以解释图像内容。请：
1. 描述图像可能包含的内容
2. 提供有用的背景信息

保持简洁但信息丰富。用中文回复。`
      : `You are a helpful assistant that explains image content. Please:
1. Describe what the image likely contains
2. Provide useful background information

Keep your response concise but informative. Respond in English.`

    const userMessage = 'Please analyze and explain this image content.'

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      return res.json({ imageUrl, explanation: 'Unable to analyze image', targetLanguage })
    }

    const data = await response.json()
    const explanation = data.choices?.[0]?.message?.content || 'Unable to analyze image'

    res.json({
      imageUrl,
      explanation,
      targetLanguage
    })
  } catch (error) {
    console.error('AI image explanation error:', error)
    res.status(500).json({ error: 'Failed to analyze image' })
  }
})

export default router
