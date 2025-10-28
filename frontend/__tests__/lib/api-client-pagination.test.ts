import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getConversationsPaginated } from '@/lib/api-client'
import type { ConversationSummary } from '@/lib/neo4j'

// Mock fetch globally
global.fetch = vi.fn()

// Mock console.error
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('getConversationsPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy.mockClear()
    // These functions are typically called from server-side components
    // Mock server environment by removing window
    delete (global as any).window
  })

  it('fetches conversations without parameters (default pagination)', async () => {
    const mockResponse = {
      conversations: [
        {
          conversationId: 'conv-1',
          title: 'Test Conversation',
          participantCount: 2,
          messageCount: 50,
          lastMessageTimestamp: '2024-01-15T10:30:00Z',
          type: 'direct',
          priority: 'normal',
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await getConversationsPaginated()

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations',
      {
        signal: undefined,
        next: { revalidate: 300 }
      }
    )
    
    expect(result).toEqual(mockResponse)
    expect(result.conversations).toHaveLength(1)
    expect(result.pagination.page).toBe(1)
  })

  it('fetches conversations with custom page and limit', async () => {
    const mockResponse = {
      conversations: [],
      pagination: {
        page: 3,
        limit: 10,
        total: 100,
        totalPages: 10
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await getConversationsPaginated({ page: 3, limit: 10 })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations?page=3&limit=10',
      {
        signal: undefined,
        next: { revalidate: 300 }
      }
    )
    
    expect(result.pagination.page).toBe(3)
    expect(result.pagination.limit).toBe(10)
  })

  it('only includes provided parameters in query string', async () => {
    const mockResponse = {
      conversations: [],
      pagination: {
        page: 5,
        limit: 20,
        total: 100,
        totalPages: 5
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await getConversationsPaginated({ page: 5 })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations?page=5',
      {
        signal: undefined,
        next: { revalidate: 300 }
      }
    )
    
    expect(result.pagination.page).toBe(5)
  })

  it('throws error when fetch fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    } as Response)

    await expect(getConversationsPaginated()).rejects.toThrow('Failed to fetch conversations')
  })

  it('throws error when response is not valid JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new Error('Invalid JSON') }
    } as Response)

    await expect(getConversationsPaginated()).rejects.toThrow('Invalid JSON')
  })

  it('validates response structure has conversations and pagination', async () => {
    const invalidResponse = {
      conversations: [] // missing pagination
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidResponse
    } as Response)

    await expect(getConversationsPaginated()).rejects.toThrow('Invalid API response: missing pagination')
  })

  it('validates conversations is an array', async () => {
    const invalidResponse = {
      conversations: 'not-an-array',
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidResponse
    } as Response)

    await expect(getConversationsPaginated()).rejects.toThrow('Invalid API response: conversations must be an array')
  })

  it('validates pagination structure - page field', async () => {
    const invalidResponse = {
      conversations: [],
      pagination: {
        page: 'one', // invalid type
        limit: 20,
        total: 0,
        totalPages: 0
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidResponse
    } as Response)

    await expect(getConversationsPaginated()).rejects.toThrow('Invalid API response: pagination page must be a number')
  })

  it('validates pagination structure - limit field', async () => {
    const invalidResponse = {
      conversations: [],
      pagination: {
        page: 1,
        limit: 'twenty', // invalid type
        total: 0,
        totalPages: 0
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidResponse
    } as Response)

    await expect(getConversationsPaginated()).rejects.toThrow('Invalid API response: pagination limit must be a number')
  })

  it('validates pagination structure - total field', async () => {
    const invalidResponse = {
      conversations: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 'zero', // invalid type
        totalPages: 0
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidResponse
    } as Response)

    await expect(getConversationsPaginated()).rejects.toThrow('Invalid API response: pagination total must be a number')
  })

  it('validates pagination structure - totalPages field', async () => {
    const invalidResponse = {
      conversations: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 'zero' // invalid type
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidResponse
    } as Response)

    await expect(getConversationsPaginated()).rejects.toThrow('Invalid API response: pagination totalPages must be a number')
  })

  it('validates each conversation has required fields', async () => {
    const invalidResponse = {
      conversations: [
        {
          // missing conversationId
          title: 'Test',
          participantCount: 2,
          messageCount: 50,
          lastMessageTimestamp: '2024-01-15T10:30:00Z',
          type: 'direct',
          priority: 'normal',
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidResponse
    } as Response)

    await expect(getConversationsPaginated()).rejects.toThrow('Invalid conversation at index 0: missing or invalid conversationId')
  })

  it('handles network errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    await expect(getConversationsPaginated()).rejects.toThrow('Network error')
  })

  it('handles AbortError gracefully by returning empty result', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    
    vi.mocked(fetch).mockRejectedValueOnce(abortError)

    const result = await getConversationsPaginated()

    expect(result).toEqual({
      conversations: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    })
    
    // Should not log error for AbortError
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('handles AbortError with signal parameter', async () => {
    const controller = new AbortController()
    const abortError = new Error('signal is aborted without reason')
    abortError.name = 'AbortError'
    
    vi.mocked(fetch).mockRejectedValueOnce(abortError)

    const result = await getConversationsPaginated({ page: 3, limit: 50 }, controller.signal)

    expect(result).toEqual({
      conversations: [],
      pagination: { page: 3, limit: 50, total: 0, totalPages: 0 }
    })
    
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations?page=3&limit=50',
      {
        signal: controller.signal,
        next: { revalidate: 300 }
      }
    )
  })


  it('constructs URL correctly with multiple parameters', async () => {
    const mockResponse = {
      conversations: [],
      pagination: {
        page: 2,
        limit: 50,
        total: 100,
        totalPages: 2
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    await getConversationsPaginated({ page: 2, limit: 50 })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations?page=2&limit=50',
      {
        signal: undefined,
        next: { revalidate: 300 }
      }
    )
  })

  it('returns properly typed response', async () => {
    const mockResponse = {
      conversations: [
        {
          conversationId: 'conv-1',
          title: 'Test Conversation',
          participantCount: 2,
          messageCount: 50,
          lastMessageTimestamp: '2024-01-15T10:30:00Z',
          type: 'direct',
          priority: 'normal',
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await getConversationsPaginated()

    // Type assertions to ensure proper typing
    const conversation: ConversationSummary = result.conversations[0]
    expect(conversation.conversationId).toBe('conv-1')
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.limit).toBe(20)
    expect(result.pagination.total).toBe(1)
    expect(result.pagination.totalPages).toBe(1)
  })
})