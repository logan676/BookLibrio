import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBooks, useBook, useMagazines, useEbooks } from './useApi'
import React from 'react'

// Mock fetch
global.fetch = vi.fn()

// Mock auth
vi.mock('../auth', () => ({
  useAuth: () => ({ token: 'test-token' }),
}))

// Create test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

describe('useBooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch books successfully', async () => {
    const mockBooks = [
      { id: 1, title: 'Book 1' },
      { id: 2, title: 'Book 2' },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBooks,
    })

    const { result } = renderHook(() => useBooks(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockBooks)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/books',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    )
  })

  it('should handle fetch error', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useBooks(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})

describe('useBook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch single book by id', async () => {
    const mockBook = { id: 1, title: 'Book 1', author: 'Author 1' }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBook,
    })

    const { result } = renderHook(() => useBook(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockBook)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/books/1',
      expect.anything()
    )
  })

  it('should not fetch when id is undefined', () => {
    const { result } = renderHook(() => useBook(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('useMagazines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch magazines with filters', async () => {
    const mockMagazines = [{ id: 1, title: 'Magazine 1' }]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMagazines,
    })

    const { result } = renderHook(
      () => useMagazines({ year: '2024', category: 'tech' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockMagazines)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/magazines?year=2024&category=tech',
      expect.anything()
    )
  })
})

describe('useEbooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch ebooks', async () => {
    const mockEbooks = [{ id: 1, title: 'Ebook 1' }]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEbooks,
    })

    const { result } = renderHook(() => useEbooks(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockEbooks)
  })
})
