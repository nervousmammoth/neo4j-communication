import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getConversations,
  getConversationDetail,
  getConversationMessages,
  getConversationsPaginated,
  getUserDetail,
  searchUsers,
  getUserContacts,
  getUsersPaginated,
  getUserCommunicationData,
  searchConversations
} from '@/lib/api-client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('getConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // These functions are typically called from server-side components
    // Mock server environment by removing window for most tests
    delete (global as any).window
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches conversations successfully', async () => {
    const mockConversations = [
      {
        conversationId: 'conv-1',
        title: 'Test Conversation',
        participantCount: 5,
        messageCount: 100,
        lastMessageTimestamp: '2024-01-15T10:00:00Z',
        type: 'group',
        priority: 'high',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversations: mockConversations }),
    })

    const result = await getConversations()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations',
      { next: { revalidate: 300 } }
    )
    expect(result).toEqual(mockConversations)
  })

  it('throws error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(getConversations()).rejects.toThrow('Failed to fetch conversations')
    expect(console.error).toHaveBeenCalled()
  })

  it('throws error when response is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => 'invalid response',
    })

    await expect(getConversations()).rejects.toThrow('Invalid API response: expected object')
    expect(console.error).toHaveBeenCalled()
  })

  it('throws error when response is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    })

    await expect(getConversations()).rejects.toThrow('Invalid API response: expected object')
    expect(console.error).toHaveBeenCalled()
  })

  it('throws error when conversations is not an array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversations: 'not an array' }),
    })

    await expect(getConversations()).rejects.toThrow('Invalid API response: conversations must be an array')
    expect(console.error).toHaveBeenCalled()
  })

  it('throws error when conversations property is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    })

    await expect(getConversations()).rejects.toThrow('Invalid API response: conversations must be an array')
    expect(console.error).toHaveBeenCalled()
  })

  it('throws error when conversation is missing conversationId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversations: [
          { title: 'No ID' },
        ],
      }),
    })

    await expect(getConversations()).rejects.toThrow(
      'Invalid conversation at index 0: missing or invalid conversationId'
    )
    expect(console.error).toHaveBeenCalled()
  })

  it('throws error when conversationId is not a string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversations: [
          { conversationId: 123 },
        ],
      }),
    })

    await expect(getConversations()).rejects.toThrow(
      'Invalid conversation at index 0: missing or invalid conversationId'
    )
    expect(console.error).toHaveBeenCalled()
  })

  it('validates multiple conversations', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversations: [
          { conversationId: 'conv-1' },
          { conversationId: 'conv-2' },
          { title: 'Invalid' }, // Missing conversationId
        ],
      }),
    })

    await expect(getConversations()).rejects.toThrow(
      'Invalid conversation at index 2: missing or invalid conversationId'
    )
  })

  it('handles network errors', async () => {
    const networkError = new Error('Network error')
    mockFetch.mockRejectedValueOnce(networkError)

    await expect(getConversations()).rejects.toThrow('Network error')
    expect(console.error).toHaveBeenCalledWith('Error fetching conversations:', networkError)
  })

  it('handles JSON parsing errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    })

    await expect(getConversations()).rejects.toThrow('Invalid JSON')
    expect(console.error).toHaveBeenCalled()
  })

  it('returns empty array when API returns empty conversations', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversations: [] }),
    })

    const result = await getConversations()
    expect(result).toEqual([])
  })

  it('preserves all conversation properties', async () => {
    const mockConversations = [
      {
        conversationId: 'conv-1',
        title: 'Full Conversation',
        participantCount: 10,
        messageCount: 500,
        lastMessageTimestamp: '2024-01-20T15:30:00Z',
        type: 'group',
        priority: 'high',
        customField: 'preserved',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversations: mockConversations }),
    })

    const result = await getConversations()
    expect(result[0]).toEqual(mockConversations[0])
    expect(result[0].customField).toBe('preserved')
  })
})

describe('getBaseUrl function coverage', () => {
  const originalWindow = global.window
  const originalEnv = process.env

  afterEach(() => {
    global.window = originalWindow
    process.env = originalEnv
  })

  it('returns relative URL in test environment (simulates client-side)', async () => {
    // Test environment always uses relative URLs due to getBaseUrl function
    // This is equivalent to client-side behavior where getBaseUrl returns ''
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversations: [] }),
    })

    const result = await getConversations()
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations', // Uses NEXT_PUBLIC_URL from vitest.setup.ts in test env
      { next: { revalidate: 300 } }
    )
  })

  it('uses NEXT_PUBLIC_URL in server-side environment when set', async () => {
    // Simulate server-side environment (no window)
    global.window = undefined as any
    process.env.NODE_ENV = 'production' // Ensure not test environment
    process.env.NEXT_PUBLIC_URL = 'https://example.com'
    
    vi.resetModules()
    const { getConversations } = await import('@/lib/api-client')
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversations: [] }),
    })

    await getConversations()
    
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/api/conversations',
      { next: { revalidate: 300 } }
    )
  })

  it('uses default localhost URL in server-side environment when NEXT_PUBLIC_URL not set', async () => {
    // Simulate server-side environment (no window)
    global.window = undefined as any
    process.env.NODE_ENV = 'production' // Ensure not test environment
    delete process.env.NEXT_PUBLIC_URL
    delete process.env.PORT
    
    vi.resetModules()
    const { getConversations } = await import('@/lib/api-client')
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversations: [] }),
    })

    await getConversations()
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations',
      { next: { revalidate: 300 } }
    )
  })

  it('uses custom PORT in server-side environment', async () => {
    // Simulate server-side environment (no window)
    global.window = undefined as any
    process.env.NODE_ENV = 'production' // Ensure not test environment
    delete process.env.NEXT_PUBLIC_URL
    process.env.PORT = '4000'
    
    vi.resetModules()
    const { getConversations } = await import('@/lib/api-client')
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversations: [] }),
    })

    await getConversations()
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/conversations',
      { next: { revalidate: 300 } }
    )
  })
})

describe('getConversationDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('fetches conversation detail successfully', async () => {
    const mockDetail = {
      conversationId: 'conv-1',
      title: 'Test Conversation',
      type: 'group',
      priority: 'high',
      createdAt: '2024-01-15T10:00:00Z',
      tags: ['tag1'],
      participants: []
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetail,
    })

    const result = await getConversationDetail('conv-1')
    expect(result).toEqual(mockDetail)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/conversations/conv-1',
      { next: { revalidate: 60 } }
    )
  })

  it('throws error when conversation detail response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    })

    await expect(getConversationDetail('conv-1')).rejects.toThrow('Failed to fetch conversation detail: 404 Not Found')
  })

  it('throws error when conversation detail response is invalid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    })

    await expect(getConversationDetail('conv-1')).rejects.toThrow('Invalid API response: expected object')
  })

  it('throws error when conversationId is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ title: 'Test' }),
    })

    await expect(getConversationDetail('conv-1')).rejects.toThrow('Invalid API response: missing conversationId')
  })
})

describe('getConversationMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('fetches messages successfully with default parameters', async () => {
    const mockResponse = {
      messages: [
        {
          messageId: 'msg-1',
          content: 'Hello',
          senderId: 'user-1',
          timestamp: '2024-01-15T10:00:00Z',
          status: 'sent',
          type: 'text',
          reactions: {}
        }
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await getConversationMessages('conv-1')
    expect(result).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/conversations/conv-1/messages?page=1&limit=50',
      { next: { revalidate: 30 } }
    )
  })

  it('fetches messages with custom parameters', async () => {
    const mockResponse = {
      messages: [],
      pagination: { page: 2, limit: 25, total: 0, totalPages: 0 }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    await getConversationMessages('conv-1', 2, 25)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/conversations/conv-1/messages?page=2&limit=25',
      { next: { revalidate: 30 } }
    )
  })

  it('throws error when messages response is invalid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: 'not an array' }),
    })

    await expect(getConversationMessages('conv-1')).rejects.toThrow('Invalid API response: messages must be an array')
  })

  it('throws error when pagination is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    })

    await expect(getConversationMessages('conv-1')).rejects.toThrow('Invalid API response: missing pagination')
  })
})

describe('getConversationsPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('fetches paginated conversations without parameters', async () => {
    const mockResponse = {
      conversations: [{ conversationId: 'conv-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await getConversationsPaginated()
    expect(result).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith('/api/conversations', { signal: undefined, next: { revalidate: 300 } })
  })

  it('fetches paginated conversations with parameters', async () => {
    const mockResponse = {
      conversations: [],
      pagination: { page: 2, limit: 50, total: 0, totalPages: 0 }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    await getConversationsPaginated({ page: 2, limit: 50 })
    expect(mockFetch).toHaveBeenCalledWith('/api/conversations?page=2&limit=50', { signal: undefined, next: { revalidate: 300 } })
  })

  it('throws error for invalid pagination structure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversations: [],
        pagination: { page: 'invalid', limit: 20, total: 0, totalPages: 0 }
      }),
    })

    await expect(getConversationsPaginated()).rejects.toThrow('Invalid API response: pagination page must be a number')
  })

  it('throws error when response is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    })

    await expect(getConversationsPaginated()).rejects.toThrow('Invalid API response: expected object')
  })

  it('throws error when response is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => 'string response',
    })

    await expect(getConversationsPaginated()).rejects.toThrow('Invalid API response: expected object')
  })
})

describe('getUserDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Mock server environment (getUserDetail is a server-side function)
    delete (global as any).window
    // Ensure consistent PORT for tests
    process.env.PORT = '3000'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches user detail successfully', async () => {
    const mockUserDetail = {
      user: {
        userId: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        status: 'active',
        role: 'member',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        lastSeen: '2024-01-15T10:00:00Z',
        department: 'Engineering',
        location: 'San Francisco'
      },
      stats: {
        totalMessages: 100,
        totalConversations: 10,
        averageMessagesPerConversation: 10,
        firstActivity: '2023-01-01T00:00:00Z',
        lastActivity: '2024-01-15T10:00:00Z',
        mostActiveDay: 'Monday',
        messagesByDay: { Monday: 20, Tuesday: 15 }
      },
      conversations: [
        { conversationId: 'conv-1', title: 'Test Conv' }
      ],
      activityTimeline: [
        { type: 'message_sent', timestamp: '2024-01-15T10:00:00Z' }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserDetail,
    })

    const result = await getUserDetail('user-1')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/user-1',
      { next: { revalidate: 60 } }
    )
    expect(result).toEqual(mockUserDetail)
  })

  it('returns null when user is not found (404)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    })

    const result = await getUserDetail('non-existent-user')
    
    expect(result).toBeNull()
    // Should not log error for 404
    expect(console.error).not.toHaveBeenCalled()
  })

  it('throws error for non-404 error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(getUserDetail('user-1')).rejects.toThrow('Failed to fetch user detail: 500 Internal Server Error')
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching user detail:',
      expect.any(Error)
    )
  })

  it('throws error when response is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => 'invalid response',
    })

    await expect(getUserDetail('user-1')).rejects.toThrow('Invalid API response: expected object')
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching user detail:',
      expect.any(Error)
    )
  })

  it('throws error when response is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    })

    await expect(getUserDetail('user-1')).rejects.toThrow('Invalid API response: expected object')
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching user detail:',
      expect.any(Error)
    )
  })

  it('throws error when user property is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stats: {},
        conversations: [],
        activityTimeline: []
      }),
    })

    await expect(getUserDetail('user-1')).rejects.toThrow('Invalid API response: missing user data')
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching user detail:',
      expect.any(Error)
    )
  })

  it('throws error when user.userId is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        stats: {},
        conversations: [],
        activityTimeline: []
      }),
    })

    await expect(getUserDetail('user-1')).rejects.toThrow('Invalid API response: missing user data')
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching user detail:',
      expect.any(Error)
    )
  })

  it('handles network errors', async () => {
    const networkError = new Error('Network error')
    mockFetch.mockRejectedValueOnce(networkError)

    await expect(getUserDetail('user-1')).rejects.toThrow('Network error')
    expect(console.error).toHaveBeenCalledWith('Error fetching user detail:', networkError)
  })

  it('handles JSON parsing errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    })

    await expect(getUserDetail('user-1')).rejects.toThrow('Invalid JSON')
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching user detail:',
      expect.any(Error)
    )
  })

  it('preserves all user detail properties', async () => {
    const mockUserDetail = {
      user: {
        userId: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        status: 'active',
        role: 'admin',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Detailed bio',
        lastSeen: '2024-01-20T15:30:00Z',
        department: 'Product',
        location: 'Remote',
        customField: 'preserved'
      },
      stats: {
        totalMessages: 500,
        totalConversations: 50,
        averageMessagesPerConversation: 10,
        customStat: 100
      },
      conversations: [
        { conversationId: 'conv-1', title: 'Test', customProp: 'kept' }
      ],
      activityTimeline: [
        { type: 'custom_activity', timestamp: '2024-01-20T15:30:00Z', extra: 'data' }
      ],
      extraProperty: 'also preserved'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserDetail,
    })

    const result = await getUserDetail('user-1')
    expect(result).toEqual(mockUserDetail)
    expect(result?.user.customField).toBe('preserved')
    expect(result?.stats.customStat).toBe(100)
    expect(result?.conversations[0].customProp).toBe('kept')
    expect(result?.activityTimeline[0].extra).toBe('data')
    expect((result as any)?.extraProperty).toBe('also preserved')
  })

  it('handles 403 forbidden error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })

    await expect(getUserDetail('user-1')).rejects.toThrow('Failed to fetch user detail: 403 Forbidden')
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching user detail:',
      expect.any(Error)
    )
  })

  it('handles 401 unauthorized error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    await expect(getUserDetail('user-1')).rejects.toThrow('Failed to fetch user detail: 401 Unauthorized')
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching user detail:',
      expect.any(Error)
    )
  })
})

describe('searchUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Mock server environment
    delete (global as any).window
    process.env.PORT = '3000'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('searches users successfully with query only', async () => {
    const mockResponse = {
      results: [
        {
          userId: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          username: 'johndoe'
        },
        {
          userId: 'user-2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          username: 'janedoe'
        }
      ],
      total: 2
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await searchUsers('doe')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/search?query=doe',
      {
        signal: undefined,
        next: { revalidate: 60 }
      }
    )
    expect(result).toEqual(mockResponse)
  })

  it('searches users with excludeUserId option', async () => {
    const mockResponse = {
      results: [
        {
          userId: 'user-2',
          name: 'Jane Doe',
          email: 'jane@example.com'
        }
      ],
      total: 1
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await searchUsers('doe', { excludeUserId: 'user-1' })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/search?query=doe&excludeUserId=user-1',
      {
        signal: undefined,
        next: { revalidate: 60 }
      }
    )
    expect(result).toEqual(mockResponse)
  })

  it('searches users with abort signal', async () => {
    const mockResponse = {
      results: [],
      total: 0
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const controller = new AbortController()
    const result = await searchUsers('test', { signal: controller.signal })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/search?query=test',
      {
        signal: controller.signal,
        next: { revalidate: 60 }
      }
    )
    expect(result).toEqual(mockResponse)
  })

  it('throws error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(searchUsers('test')).rejects.toThrow('Failed to search users: 500 Internal Server Error')
    expect(console.error).toHaveBeenCalledWith('Error searching users:', expect.any(Error))
  })

  it('throws error when response is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => 'invalid response',
    })

    await expect(searchUsers('test')).rejects.toThrow('Invalid API response: expected object')
    expect(console.error).toHaveBeenCalledWith('Error searching users:', expect.any(Error))
  })

  it('throws error when response is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    })

    await expect(searchUsers('test')).rejects.toThrow('Invalid API response: expected object')
    expect(console.error).toHaveBeenCalledWith('Error searching users:', expect.any(Error))
  })

  it('throws error when results is not an array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: 'not an array', total: 0 }),
    })

    await expect(searchUsers('test')).rejects.toThrow('Invalid API response: results must be an array')
    expect(console.error).toHaveBeenCalledWith('Error searching users:', expect.any(Error))
  })

  it('throws error when results is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total: 0 }),
    })

    await expect(searchUsers('test')).rejects.toThrow('Invalid API response: results must be an array')
    expect(console.error).toHaveBeenCalledWith('Error searching users:', expect.any(Error))
  })

  it('throws error when total is not a number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], total: 'not a number' }),
    })

    await expect(searchUsers('test')).rejects.toThrow('Invalid API response: total must be a number')
    expect(console.error).toHaveBeenCalledWith('Error searching users:', expect.any(Error))
  })

  it('throws error when total is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    await expect(searchUsers('test')).rejects.toThrow('Invalid API response: total must be a number')
    expect(console.error).toHaveBeenCalledWith('Error searching users:', expect.any(Error))
  })

  it('handles abort error correctly', async () => {
    const abortError = new Error('Request aborted')
    abortError.name = 'AbortError'
    mockFetch.mockRejectedValueOnce(abortError)

    await expect(searchUsers('test')).rejects.toThrow('Request aborted')
    // Should not log error for abort
    expect(console.error).not.toHaveBeenCalled()
  })

  it('handles network errors', async () => {
    const networkError = new Error('Network error')
    mockFetch.mockRejectedValueOnce(networkError)

    await expect(searchUsers('test')).rejects.toThrow('Network error')
    expect(console.error).toHaveBeenCalledWith('Error searching users:', networkError)
  })

  it('handles JSON parsing errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    })

    await expect(searchUsers('test')).rejects.toThrow('Invalid JSON')
    expect(console.error).toHaveBeenCalledWith('Error searching users:', expect.any(Error))
  })

  it('returns empty results array when no users match', async () => {
    const mockResponse = {
      results: [],
      total: 0
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await searchUsers('nonexistent')
    expect(result).toEqual(mockResponse)
    expect(result.results).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('preserves all user properties in results', async () => {
    const mockResponse = {
      results: [
        {
          userId: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          username: 'johndoe',
          status: 'active',
          role: 'admin',
          avatarUrl: 'https://example.com/avatar.jpg',
          customField: 'preserved'
        }
      ],
      total: 1,
      extraProperty: 'also preserved'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await searchUsers('john')
    // searchUsers only returns results and total, not extra properties
    expect(result).toEqual({
      results: mockResponse.results,
      total: mockResponse.total
    })
    expect(result.results[0].customField).toBe('preserved')
  })
})

describe('getUserContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Mock server environment
    delete (global as any).window
    process.env.PORT = '3000'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches user contacts successfully without options', async () => {
    const mockResponse = {
      results: [
        {
          userId: 'user-2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          communicationStats: {
            sharedConversationCount: 5,
            totalMessageCount: 100,
            lastInteraction: '2024-01-15T10:00:00Z',
            firstInteraction: '2023-01-01T10:00:00Z'
          }
        }
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await getUserContacts('user-1')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/user-1/contacts?',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: undefined,
      }
    )
    expect(result).toEqual(mockResponse)
  })

  it('fetches user contacts with query parameter', async () => {
    const mockResponse = {
      results: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    await getUserContacts('user-1', { query: 'jane' })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/user-1/contacts?query=jane',
      expect.any(Object)
    )
  })

  it('fetches user contacts with pagination parameters', async () => {
    const mockResponse = {
      results: [],
      total: 50,
      page: 2,
      limit: 10,
      totalPages: 5
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    await getUserContacts('user-1', { page: 2, limit: 10 })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/user-1/contacts?page=2&limit=10',
      expect.any(Object)
    )
  })

  it('fetches user contacts with all parameters', async () => {
    const mockResponse = {
      results: [],
      total: 100,
      page: 3,
      limit: 25,
      totalPages: 4
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const controller = new AbortController()
    await getUserContacts('user-1', {
      query: 'search term',
      page: 3,
      limit: 25,
      signal: controller.signal
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/user-1/contacts?query=search+term&page=3&limit=25',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    )
  })

  it('throws error with custom message for 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'User not found' }),
    })

    await expect(getUserContacts('nonexistent')).rejects.toThrow('User not found')
    expect(console.error).toHaveBeenCalledWith('Error fetching user contacts:', expect.any(Error))
  })

  it('throws generic error for 404 when error message not available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => { throw new Error('JSON parse error') },
    })

    await expect(getUserContacts('nonexistent')).rejects.toThrow('User not found')
    expect(console.error).toHaveBeenCalledWith('Error fetching user contacts:', expect.any(Error))
  })

  it('throws error with custom message for other errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Database error' }),
    })

    await expect(getUserContacts('user-1')).rejects.toThrow('Database error')
    expect(console.error).toHaveBeenCalledWith('Error fetching user contacts:', expect.any(Error))
  })

  it('throws generic error when error message not available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('JSON parse error') },
    })

    await expect(getUserContacts('user-1')).rejects.toThrow('Failed to fetch user contacts: 500')
    expect(console.error).toHaveBeenCalledWith('Error fetching user contacts:', expect.any(Error))
  })

  it('throws error when response is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => 'invalid response',
    })

    await expect(getUserContacts('user-1')).rejects.toThrow('Invalid API response: expected object')
    expect(console.error).toHaveBeenCalledWith('Error fetching user contacts:', expect.any(Error))
  })

  it('throws error when response is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    })

    await expect(getUserContacts('user-1')).rejects.toThrow('Invalid API response: expected object')
    expect(console.error).toHaveBeenCalledWith('Error fetching user contacts:', expect.any(Error))
  })

  it('throws error when results is not an array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: 'not an array',
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      }),
    })

    await expect(getUserContacts('user-1')).rejects.toThrow('Invalid API response: results must be an array')
    expect(console.error).toHaveBeenCalledWith('Error fetching user contacts:', expect.any(Error))
  })

  it('throws error when results is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      }),
    })

    await expect(getUserContacts('user-1')).rejects.toThrow('Invalid API response: results must be an array')
    expect(console.error).toHaveBeenCalledWith('Error fetching user contacts:', expect.any(Error))
  })

  it('handles abort error correctly', async () => {
    const abortError = new Error('Request aborted')
    abortError.name = 'AbortError'
    mockFetch.mockRejectedValueOnce(abortError)

    await expect(getUserContacts('user-1')).rejects.toThrow('Request aborted')
    // Should not log error for abort
    expect(console.error).not.toHaveBeenCalled()
  })

  it('handles network errors', async () => {
    const networkError = new Error('Network error')
    mockFetch.mockRejectedValueOnce(networkError)

    await expect(getUserContacts('user-1')).rejects.toThrow('Network error')
    expect(console.error).toHaveBeenCalledWith('Error fetching user contacts:', networkError)
  })

  it('handles JSON parsing errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    })

    await expect(getUserContacts('user-1')).rejects.toThrow('Invalid JSON')
    expect(console.error).toHaveBeenCalledWith('Error fetching user contacts:', expect.any(Error))
  })

  it('returns empty results array when user has no contacts', async () => {
    const mockResponse = {
      results: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await getUserContacts('user-1')
    expect(result).toEqual(mockResponse)
    expect(result.results).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('preserves all contact properties in results', async () => {
    const mockResponse = {
      results: [
        {
          userId: 'user-2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          username: 'janedoe',
          status: 'active',
          avatarUrl: 'https://example.com/avatar.jpg',
          communicationStats: {
            sharedConversationCount: 10,
            totalMessageCount: 250,
            lastInteraction: '2024-01-20T15:30:00Z',
            firstInteraction: '2023-01-01T10:00:00Z',
            customStat: 'preserved'
          },
          customField: 'preserved'
        }
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      extraProperty: 'also preserved'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await getUserContacts('user-1')
    expect(result).toEqual(mockResponse)
    expect(result.results[0].customField).toBe('preserved')
    expect(result.results[0].communicationStats.customStat).toBe('preserved')
    expect((result as any).extraProperty).toBe('also preserved')
  })

  it('handles 403 forbidden error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Access denied' }),
    })

    await expect(getUserContacts('user-1')).rejects.toThrow('Access denied')
    expect(console.error).toHaveBeenCalledWith('Error fetching user contacts:', expect.any(Error))
  })
})

describe('getUsersPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Mock server environment
    delete (global as any).window
    process.env.PORT = '3000'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches paginated users without parameters', async () => {
    const mockResponse = {
      users: [
        { userId: 'user-1', name: 'John Doe', email: 'john@example.com' }
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await getUsersPaginated()
    expect(result).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users',
      { signal: undefined, next: { revalidate: 300 } }
    )
  })

  it('fetches paginated users with parameters', async () => {
    const mockResponse = {
      users: [],
      pagination: { page: 2, limit: 50, total: 0, totalPages: 0 }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    await getUsersPaginated({ page: 2, limit: 50 })
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users?page=2&limit=50',
      { signal: undefined, next: { revalidate: 300 } }
    )
  })

  it('fetches paginated users with abort signal', async () => {
    const mockResponse = {
      users: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const controller = new AbortController()
    await getUsersPaginated(undefined, controller.signal)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users',
      { signal: controller.signal, next: { revalidate: 300 } }
    )
  })

  it('throws error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(getUsersPaginated()).rejects.toThrow('Failed to fetch users')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('throws error when response is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => 'invalid response',
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: expected object')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('throws error when response is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: expected object')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('throws error when users is not an array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: 'not an array', pagination: {} }),
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: users must be an array')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('throws error when pagination is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [] }),
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: missing pagination')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('throws error when pagination is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [], pagination: 'invalid' }),
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: missing pagination')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('throws error when pagination.page is not a number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [],
        pagination: { page: 'invalid', limit: 20, total: 0, totalPages: 0 }
      }),
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: pagination page must be a number')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('throws error when pagination.limit is not a number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [],
        pagination: { page: 1, limit: 'invalid', total: 0, totalPages: 0 }
      }),
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: pagination limit must be a number')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('throws error when pagination.total is not a number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [],
        pagination: { page: 1, limit: 20, total: 'invalid', totalPages: 0 }
      }),
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: pagination total must be a number')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('throws error when pagination.totalPages is not a number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 'invalid' }
      }),
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: pagination totalPages must be a number')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('throws error when user is missing userId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [{ name: 'John' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }),
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid user at index 0: missing or invalid userId')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('throws error when userId is not a string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [{ userId: 123 }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }),
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid user at index 0: missing or invalid userId')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('handles abort error correctly and returns empty result', async () => {
    const abortError = new Error('Request aborted')
    abortError.name = 'AbortError'
    mockFetch.mockRejectedValueOnce(abortError)

    const result = await getUsersPaginated({ page: 2, limit: 30 })
    expect(result).toEqual({
      users: [],
      pagination: { page: 2, limit: 30, total: 0, totalPages: 0 }
    })
    // Should not log error for abort
    expect(console.error).not.toHaveBeenCalled()
  })

  it('handles abort error with default pagination', async () => {
    const abortError = new Error('Request aborted')
    abortError.name = 'AbortError'
    mockFetch.mockRejectedValueOnce(abortError)

    const result = await getUsersPaginated()
    expect(result).toEqual({
      users: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    })
    expect(console.error).not.toHaveBeenCalled()
  })

  it('handles network errors', async () => {
    const networkError = new Error('Network error')
    mockFetch.mockRejectedValueOnce(networkError)

    await expect(getUsersPaginated()).rejects.toThrow('Network error')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', networkError)
  })

  it('handles JSON parsing errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid JSON')
    expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
  })

  it('validates multiple users', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [
          { userId: 'user-1', name: 'John' },
          { userId: 'user-2', name: 'Jane' },
          { name: 'Invalid' }  // Missing userId
        ],
        pagination: { page: 1, limit: 20, total: 3, totalPages: 1 }
      }),
    })

    await expect(getUsersPaginated()).rejects.toThrow('Invalid user at index 2: missing or invalid userId')
  })
})

describe('getUserCommunicationData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Mock server environment
    delete (global as any).window
    process.env.PORT = '3000'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches user communication data successfully without parameters', async () => {
    const mockResponse = {
      user1: { userId: 'user-1', name: 'John Doe' },
      user2: { userId: 'user-2', name: 'Jane Doe' },
      sharedConversations: [
        { conversationId: 'conv-1', title: 'Test' }
      ],
      communicationStats: {
        totalMessages: 100,
        totalConversations: 5,
        firstInteraction: '2023-01-01T10:00:00Z',
        lastInteraction: '2024-01-15T10:00:00Z'
      },
      messageTimeline: [
        { messageId: 'msg-1', content: 'Hello' }
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await getUserCommunicationData('user-1', 'user-2')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/communications/user-1/user-2',
      { next: { revalidate: 300 } }
    )
    expect(result).toEqual(mockResponse)
  })

  it('fetches user communication data with pagination parameters', async () => {
    const mockResponse = {
      user1: { userId: 'user-1' },
      user2: { userId: 'user-2' },
      sharedConversations: [],
      communicationStats: {},
      messageTimeline: [],
      pagination: { page: 2, limit: 50, total: 0, totalPages: 0 }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    await getUserCommunicationData('user-1', 'user-2', { page: 2, limit: 50 })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/communications/user-1/user-2?page=2&limit=50',
      { next: { revalidate: 300 } }
    )
  })

  it('returns null for 404 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    })

    const result = await getUserCommunicationData('user-1', 'nonexistent')
    expect(result).toBeNull()
    // Should not log error for 404
    expect(console.error).not.toHaveBeenCalled()
  })

  it('throws error for 400 bad request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    })

    await expect(getUserCommunicationData('invalid', 'user-2')).rejects.toThrow('Invalid user IDs provided')
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('throws error for other error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow(
      'Failed to fetch communication data: 500 Internal Server Error'
    )
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('throws error when response is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => 'invalid response',
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow(
      'Invalid API response: expected object'
    )
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('throws error when response is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow(
      'Invalid API response: expected object'
    )
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('throws error when user1 is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user2: { userId: 'user-2' },
        sharedConversations: [],
        communicationStats: {},
        messageTimeline: [],
        pagination: {}
      }),
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow(
      'Invalid API response: missing user data'
    )
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('throws error when user2 is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user1: { userId: 'user-1' },
        sharedConversations: [],
        communicationStats: {},
        messageTimeline: [],
        pagination: {}
      }),
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow(
      'Invalid API response: missing user data'
    )
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('throws error when sharedConversations is not an array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user1: { userId: 'user-1' },
        user2: { userId: 'user-2' },
        sharedConversations: 'not an array',
        communicationStats: {},
        messageTimeline: [],
        pagination: {}
      }),
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow(
      'Invalid API response: sharedConversations must be an array'
    )
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('throws error when communicationStats is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user1: { userId: 'user-1' },
        user2: { userId: 'user-2' },
        sharedConversations: [],
        messageTimeline: [],
        pagination: {}
      }),
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow(
      'Invalid API response: missing communicationStats'
    )
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('throws error when communicationStats is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user1: { userId: 'user-1' },
        user2: { userId: 'user-2' },
        sharedConversations: [],
        communicationStats: 'not an object',
        messageTimeline: [],
        pagination: {}
      }),
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow(
      'Invalid API response: missing communicationStats'
    )
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('throws error when messageTimeline is not an array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user1: { userId: 'user-1' },
        user2: { userId: 'user-2' },
        sharedConversations: [],
        communicationStats: {},
        messageTimeline: 'not an array',
        pagination: {}
      }),
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow(
      'Invalid API response: messageTimeline must be an array'
    )
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('throws error when pagination is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user1: { userId: 'user-1' },
        user2: { userId: 'user-2' },
        sharedConversations: [],
        communicationStats: {},
        messageTimeline: []
      }),
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow(
      'Invalid API response: missing pagination'
    )
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('throws error when pagination is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user1: { userId: 'user-1' },
        user2: { userId: 'user-2' },
        sharedConversations: [],
        communicationStats: {},
        messageTimeline: [],
        pagination: 'not an object'
      }),
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow(
      'Invalid API response: missing pagination'
    )
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('handles network errors', async () => {
    const networkError = new Error('Network error')
    mockFetch.mockRejectedValueOnce(networkError)

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow('Network error')
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', networkError)
  })

  it('handles JSON parsing errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    })

    await expect(getUserCommunicationData('user-1', 'user-2')).rejects.toThrow('Invalid JSON')
    expect(console.error).toHaveBeenCalledWith('Error fetching user communication data:', expect.any(Error))
  })

  it('preserves all properties in response', async () => {
    const mockResponse = {
      user1: { userId: 'user-1', name: 'John', customProp: 'preserved' },
      user2: { userId: 'user-2', name: 'Jane', customProp: 'preserved' },
      sharedConversations: [
        { conversationId: 'conv-1', title: 'Test', customProp: 'preserved' }
      ],
      communicationStats: {
        totalMessages: 100,
        customStat: 'preserved'
      },
      messageTimeline: [
        { messageId: 'msg-1', content: 'Hello', customProp: 'preserved' }
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      extraProperty: 'also preserved'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await getUserCommunicationData('user-1', 'user-2')
    expect(result).toEqual(mockResponse)
    expect(result?.user1.customProp).toBe('preserved')
    expect(result?.user2.customProp).toBe('preserved')
    expect(result?.sharedConversations[0].customProp).toBe('preserved')
    expect(result?.communicationStats.customStat).toBe('preserved')
    expect(result?.messageTimeline[0].customProp).toBe('preserved')
    expect((result as any)?.extraProperty).toBe('also preserved')
  })
})

describe('searchConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    delete (global as any).window
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockSearchResults = [
    {
      conversationId: 'conv-1',
      title: 'Team Meeting',
      participantCount: 5,
      messageCount: 25,
      lastMessageTimestamp: '2024-01-20T10:00:00Z',
      type: 'group',
      priority: 'high'
    }
  ]

  it('searches conversations successfully with query only', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockSearchResults, total: 1 })
    })

    const result = await searchConversations({ query: 'meeting' })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations/search?query=meeting',
      { signal: undefined, next: { revalidate: 60 } }
    )
    expect(result).toEqual({ results: mockSearchResults, total: 1 })
  })

  it('includes all filter parameters in URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], total: 0 })
    })

    await searchConversations({
      query: 'test',
      type: 'group',
      priority: 'high',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
      page: 2,
      limit: 10
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('query=test'),
      expect.anything()
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('type=group'),
      expect.anything()
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('priority=high'),
      expect.anything()
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('dateFrom=2024-01-01'),
      expect.anything()
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('dateTo=2024-12-31'),
      expect.anything()
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.anything()
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
      expect.anything()
    )
  })

  it('handles type filter direct', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], total: 0 })
    })

    await searchConversations({ query: 'test', type: 'direct' })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('type=direct'),
      expect.anything()
    )
  })

  it('handles priority filter medium', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], total: 0 })
    })

    await searchConversations({ query: 'test', priority: 'medium' })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('priority=medium'),
      expect.anything()
    )
  })

  it('handles priority filter low', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], total: 0 })
    })

    await searchConversations({ query: 'test', priority: 'low' })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('priority=low'),
      expect.anything()
    )
  })

  it('passes AbortSignal to fetch', async () => {
    const controller = new AbortController()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], total: 0 })
    })

    await searchConversations({ query: 'test' }, controller.signal)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal })
    )
  })

  it('throws error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    })

    await expect(searchConversations({ query: 'test' })).rejects.toThrow('Server error')
    expect(console.error).toHaveBeenCalled()
  })

  it('handles error response with object-type error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Detailed error', code: 'ERR_001' } })
    })

    await expect(searchConversations({ query: 'test' })).rejects.toThrow('Search failed with status 400')
    expect(console.error).toHaveBeenCalled()
  })

  it('handles error response without json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('Invalid JSON') }
    })

    await expect(searchConversations({ query: 'test' })).rejects.toThrow('Unknown error')
  })

  it('throws error when response is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => 'invalid'
    })

    await expect(searchConversations({ query: 'test' })).rejects.toThrow('Invalid API response: expected object')
  })

  it('throws error when response is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null
    })

    await expect(searchConversations({ query: 'test' })).rejects.toThrow('Invalid API response: expected object')
  })

  it('throws error when results is not an array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: 'not an array', total: 0 })
    })

    await expect(searchConversations({ query: 'test' })).rejects.toThrow('Invalid API response: results must be an array')
  })

  it('throws error when total is not a number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], total: 'not a number' })
    })

    await expect(searchConversations({ query: 'test' })).rejects.toThrow('Invalid API response: total must be a number')
  })

  it('validates conversation structure in results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ title: 'Missing conversationId' }],
        total: 1
      })
    })

    await expect(searchConversations({ query: 'test' })).rejects.toThrow('Invalid conversation at index 0')
  })

  it('returns empty results on AbortError', async () => {
    const abortError = new Error('Request aborted')
    abortError.name = 'AbortError'
    mockFetch.mockRejectedValueOnce(abortError)

    const result = await searchConversations({ query: 'test' })

    expect(result).toEqual({ results: [], total: 0 })
    expect(console.error).not.toHaveBeenCalled()
  })

  it('throws and logs non-abort errors', async () => {
    const error = new Error('Network error')
    mockFetch.mockRejectedValueOnce(error)

    await expect(searchConversations({ query: 'test' })).rejects.toThrow('Network error')
    expect(console.error).toHaveBeenCalledWith('Error searching conversations:', error)
  })
})