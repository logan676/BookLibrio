/**
 * AnnotationService - General service for underline/idea/meaning data processing
 * This service handles all data operations for annotations across different content types
 * (ebooks, magazines, notes, etc.) without any UI logic
 */

export interface Underline {
  id: number
  text: string
  idea_count: number
  created_at: string
}

export interface EbookUnderlineData extends Underline {
  ebook_id: number
  chapter_index: number
  paragraph_index: number
  start_offset: number
  end_offset: number
  cfi_range?: string
}

export interface MagazineUnderlineData extends Underline {
  magazine_id: number
  page_number: number
  start_offset: number
  end_offset: number
}

export interface IdeaData {
  id: number
  underline_id: number
  content: string
  created_at: string
}

export interface MeaningRequest {
  text: string
  paragraph: string
  targetLanguage: 'en' | 'zh'
}

export interface MeaningResponse {
  meaning: string
}

export type ContentType = 'ebook' | 'magazine' | 'note' | 'blogpost'

// API endpoint mappings for different content types
const API_ENDPOINTS: Record<ContentType, { underlines: string; ideas: string }> = {
  ebook: {
    underlines: '/api/ebooks',
    ideas: '/api/ebook-underlines'
  },
  magazine: {
    underlines: '/api/magazines',
    ideas: '/api/magazines/magazine-underlines'
  },
  note: {
    underlines: '/api/notes',
    ideas: '/api/note-underlines'
  },
  blogpost: {
    underlines: '/api/posts',
    ideas: '/api/underlines'
  }
}

class AnnotationService {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    return headers
  }

  // ========================================
  // Underline Operations
  // ========================================

  async fetchUnderlines<T extends Underline>(
    contentType: ContentType,
    contentId: number
  ): Promise<T[]> {
    const endpoint = API_ENDPOINTS[contentType].underlines
    const response = await fetch(`${endpoint}/${contentId}/underlines`, {
      headers: this.getHeaders()
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch underlines: ${response.status}`)
    }
    return response.json()
  }

  async createEbookUnderline(
    ebookId: number,
    data: {
      text: string
      cfi_range: string
      chapter_index: number
      paragraph_index: number
      start_offset: number
      end_offset: number
    }
  ): Promise<EbookUnderlineData> {
    const response = await fetch(`/api/ebooks/${ebookId}/underlines`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`Failed to create underline: ${response.status}`)
    }
    return response.json()
  }

  async createMagazineUnderline(
    magazineId: number,
    data: {
      text: string
      page_number: number
      start_offset: number
      end_offset: number
    }
  ): Promise<MagazineUnderlineData> {
    const response = await fetch(`/api/magazines/${magazineId}/underlines`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`Failed to create underline: ${response.status}`)
    }
    return response.json()
  }

  async deleteUnderline(contentType: ContentType, underlineId: number): Promise<void> {
    let endpoint: string
    if (contentType === 'ebook') {
      endpoint = `/api/ebook-underlines/${underlineId}`
    } else if (contentType === 'magazine') {
      endpoint = `/api/magazines/magazine-underlines/${underlineId}`
    } else if (contentType === 'note') {
      endpoint = `/api/note-underlines/${underlineId}`
    } else {
      endpoint = `/api/underlines/${underlineId}`
    }

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: this.getHeaders()
    })
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete underline: ${response.status}`)
    }
  }

  // ========================================
  // Idea Operations
  // ========================================

  async fetchIdeas(contentType: ContentType, underlineId: number): Promise<IdeaData[]> {
    let endpoint: string
    if (contentType === 'ebook') {
      endpoint = `/api/ebook-underlines/${underlineId}/ideas`
    } else if (contentType === 'magazine') {
      endpoint = `/api/magazines/magazine-underlines/${underlineId}/ideas`
    } else if (contentType === 'note') {
      endpoint = `/api/note-underlines/${underlineId}/ideas`
    } else {
      endpoint = `/api/underlines/${underlineId}/ideas`
    }

    const response = await fetch(endpoint, {
      headers: this.getHeaders()
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch ideas: ${response.status}`)
    }
    return response.json()
  }

  async createIdea(
    contentType: ContentType,
    underlineId: number,
    content: string
  ): Promise<IdeaData> {
    let endpoint: string
    if (contentType === 'ebook') {
      endpoint = `/api/ebook-underlines/${underlineId}/ideas`
    } else if (contentType === 'magazine') {
      endpoint = `/api/magazines/magazine-underlines/${underlineId}/ideas`
    } else if (contentType === 'note') {
      endpoint = `/api/note-underlines/${underlineId}/ideas`
    } else {
      endpoint = `/api/underlines/${underlineId}/ideas`
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content })
    })
    if (!response.ok) {
      throw new Error(`Failed to create idea: ${response.status}`)
    }
    return response.json()
  }

  async updateIdea(contentType: ContentType, ideaId: number, content: string): Promise<IdeaData> {
    let endpoint: string
    if (contentType === 'ebook') {
      endpoint = `/api/ebook-ideas/${ideaId}`
    } else if (contentType === 'magazine') {
      endpoint = `/api/magazines/magazine-ideas/${ideaId}`
    } else if (contentType === 'note') {
      endpoint = `/api/note-ideas/${ideaId}`
    } else {
      endpoint = `/api/ideas/${ideaId}`
    }

    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ content })
    })
    if (!response.ok) {
      throw new Error(`Failed to update idea: ${response.status}`)
    }
    return response.json()
  }

  async deleteIdea(contentType: ContentType, ideaId: number): Promise<void> {
    let endpoint: string
    if (contentType === 'ebook') {
      endpoint = `/api/ebook-ideas/${ideaId}`
    } else if (contentType === 'magazine') {
      endpoint = `/api/magazines/magazine-ideas/${ideaId}`
    } else if (contentType === 'note') {
      endpoint = `/api/note-ideas/${ideaId}`
    } else {
      endpoint = `/api/ideas/${ideaId}`
    }

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: this.getHeaders()
    })
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete idea: ${response.status}`)
    }
  }

  // ========================================
  // AI Meaning Operations
  // ========================================

  async getMeaning(request: MeaningRequest): Promise<MeaningResponse> {
    const response = await fetch('/api/ai/meaning', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    })
    if (!response.ok) {
      throw new Error(`Failed to get meaning: ${response.status}`)
    }
    return response.json()
  }

  // ========================================
  // Utility Functions
  // ========================================

  /**
   * Convert markdown-like text to HTML for display
   */
  formatMeaningToHtml(meaning: string): string {
    return meaning
      // Headers
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // List items
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Paragraphs (double newlines)
      .replace(/\n\n/g, '</p><p>')
      // Single newlines to br
      .replace(/\n/g, '<br/>')
      // Wrap in paragraph
      .replace(/^(.+)$/, '<p>$1</p>')
  }
}

// Export singleton instance
export const annotationService = new AnnotationService()

// Export class for testing
export { AnnotationService }
