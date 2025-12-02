import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from '@/app/api/conversations/route'

// Mock the neo4j lib module
vi.mock('@/lib/neo4j', () => ({
  testConnection: vi.fn(),
  getConversations: vi.fn(),
}))

// Mock crypto module for ETag generation - use vi.hoisted for Vitest 4.x compatibility
const { mockCreateHash } = vi.hoisted(() => ({
  mockCreateHash: vi.fn(() => {
    let dataContent = ''
    return {
      update: vi.fn((data: string) => {
        dataContent += data
        return { update: vi.fn().mockReturnThis(), digest: vi.fn(() => dataContent.length.toString().padStart(32, 'abcdef1234567890')) }
      }),
      digest: vi.fn(() => dataContent.length.toString().padStart(32, 'abcdef1234567890'))
    }
  }),
}))

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>()
  return {
    ...actual,
    default: { ...actual, createHash: mockCreateHash },
    createHash: mockCreateHash,
  }
})

// Import the mocked functions
import { testConnection, getConversations } from '@/lib/neo4j'

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      headers: new Headers(init?.headers || {}),
    })),
  },
  NextRequest: class {
    constructor(url: string) {
      this.url = url
      const urlObj = new URL(url)
      this.nextUrl = {
        searchParams: urlObj.searchParams
      }
    }
    url: string
    nextUrl: {
      searchParams: URLSearchParams
    }
  }
}))

describe('GET /api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns conversations when database is connected', async () => {
    // Mock successful connection
    vi.mocked(testConnection).mockResolvedValueOnce(true)

    // Mock getConversations response
    const mockResponse = {
      conversations: [
        {
          conversationId: 'conv-1',
          title: 'Test Conversation 1',
          participantCount: 2,
          messageCount: 50,
          lastMessageTimestamp: '2024-01-15T10:30:00Z',
          type: 'direct',
          priority: 'normal',
        },
        {
          conversationId: 'conv-2',
          title: 'Test Conversation 2',
          participantCount: 5,
          messageCount: 123,
          lastMessageTimestamp: '2024-01-14T15:45:00Z',
          type: 'group',
          priority: 'high',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
      },
    }

    vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/conversations')
    const response = await GET(request as any)
    const data = await response.json()


    expect(testConnection).toHaveBeenCalledTimes(1)
    expect(getConversations).toHaveBeenCalledTimes(1)
    expect(getConversations).toHaveBeenCalledWith({ page: 1, limit: 20 })
    
    expect(response.status).toBe(200)
    expect(data).toEqual(mockResponse)
  })

  it('returns 503 when database connection fails', async () => {
    // Mock failed connection
    vi.mocked(testConnection).mockResolvedValueOnce(false)

    const request = new NextRequest('http://localhost:3000/api/conversations')
    const response = await GET(request as any)
    const data = await response.json()

    expect(testConnection).toHaveBeenCalledTimes(1)
    expect(getConversations).not.toHaveBeenCalled()
    
    expect(response.status).toBe(503)
    expect(data).toEqual({
      error: 'Database connection failed',
    })
  })

  it('returns 500 when query execution fails', async () => {
    // Mock successful connection
    vi.mocked(testConnection).mockResolvedValueOnce(true)

    // Mock query failure
    const error = new Error('Query execution failed')
    vi.mocked(getConversations).mockRejectedValueOnce(error)

    const request = new NextRequest('http://localhost:3000/api/conversations')
    const response = await GET(request as any)
    const data = await response.json()

    expect(testConnection).toHaveBeenCalledTimes(1)
    expect(getConversations).toHaveBeenCalledTimes(1)
    
    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: 'Failed to fetch conversations',
    })
    expect(console.error).toHaveBeenCalledWith('Error fetching conversations:', error)
  })

  it('handles pagination parameters correctly', async () => {
    // Mock successful connection
    vi.mocked(testConnection).mockResolvedValueOnce(true)

    const mockResponse = {
      conversations: [],
      pagination: {
        page: 5,
        limit: 10,
        total: 100,
        totalPages: 10
      },
    }

    vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/conversations?page=5&limit=10')
    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(getConversations).toHaveBeenCalledWith({ page: 5, limit: 10 })
    expect(data.pagination.page).toBe(5)
    expect(data.pagination.limit).toBe(10)
  })

  it('handles invalid pagination parameters', async () => {
    // Mock successful connection
    vi.mocked(testConnection).mockResolvedValueOnce(true)

    const mockResponse = {
      conversations: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      },
    }

    vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/conversations?page=invalid&limit=abc')
    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    // New validation system provides safe defaults for invalid values
    expect(getConversations).toHaveBeenCalledWith({ page: 1, limit: 20 })
    expect(data.pagination.page).toBe(1)
    expect(data.pagination.limit).toBe(20)
  })

  it('returns empty array when no conversations exist', async () => {
    // Mock successful connection
    vi.mocked(testConnection).mockResolvedValueOnce(true)

    const mockResponse = {
      conversations: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      },
    }

    vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/conversations')
    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResponse)
  })

  it('handles large page numbers correctly', async () => {
    // Mock successful connection
    vi.mocked(testConnection).mockResolvedValueOnce(true)

    const mockResponse = {
      conversations: [],
      pagination: {
        page: 1500,
        limit: 20,
        total: 30000,
        totalPages: 1500
      },
    }

    vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/conversations?page=1500&limit=20')
    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(getConversations).toHaveBeenCalledWith({ page: 1500, limit: 20 })
    expect(data.pagination.page).toBe(1500)
  })

  it('includes all required fields in the response', async () => {
    // Mock successful connection
    vi.mocked(testConnection).mockResolvedValueOnce(true)

    const mockResponse = {
      conversations: [{
        conversationId: 'conv-test',
        title: 'Complete Test',
        type: 'group',
        priority: 'high',
        lastMessageTimestamp: '2024-01-15T10:00:00Z',
        participantCount: 5,
        messageCount: 100,
      }],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      },
    }

    vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/conversations')
    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    
    const conversation = data.conversations[0]
    expect(conversation).toHaveProperty('conversationId')
    expect(conversation).toHaveProperty('title')
    expect(conversation).toHaveProperty('participantCount')
    expect(conversation).toHaveProperty('messageCount')
    expect(conversation).toHaveProperty('lastMessageTimestamp')
    expect(conversation).toHaveProperty('type')
    expect(conversation).toHaveProperty('priority')
  })

  it('uses default values when no parameters are provided', async () => {
    // Mock successful connection
    vi.mocked(testConnection).mockResolvedValueOnce(true)

    const mockResponse = {
      conversations: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      },
    }

    vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/conversations')
    await GET(request as any)

    expect(getConversations).toHaveBeenCalledWith({ page: 1, limit: 20 })
  })
})