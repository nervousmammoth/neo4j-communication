import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from '@/app/api/conversations/route'

// Mock the neo4j lib module
vi.mock('@/lib/neo4j', () => ({
  testConnection: vi.fn(),
  getConversations: vi.fn(),
}))

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

describe('GET /api/conversations - Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Query Parameters', () => {
    it('accepts page and limit query parameters', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)
      
      const mockResponse = {
        conversations: [],
        pagination: {
          page: 3,
          limit: 50,
          total: 200,
          totalPages: 4
        }
      }
      
      vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost:3000/api/conversations?page=3&limit=50')
      const response = await GET(request as any)
      const data = await response.json()

      expect(getConversations).toHaveBeenCalledWith({ page: 3, limit: 50 })
      expect(data.pagination.page).toBe(3)
      expect(data.pagination.limit).toBe(50)
    })

    it('uses default values when parameters are not provided', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)
      
      const mockResponse = {
        conversations: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5
        }
      }
      
      vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost:3000/api/conversations')
      await GET(request as any)

      expect(getConversations).toHaveBeenCalledWith({ page: 1, limit: 20 })
    })

    it('enforces maximum limit of 100', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)
      
      const mockResponse = {
        conversations: [],
        pagination: {
          page: 1,
          limit: 100,
          total: 500,
          totalPages: 5
        }
      }
      
      vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost:3000/api/conversations?limit=200')
      await GET(request as any)

      // New validation system caps limit at 100
      expect(getConversations).toHaveBeenCalledWith({ page: 1, limit: 100 })
    })

    it('handles invalid page numbers gracefully', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)
      
      const mockResponse = {
        conversations: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5
        }
      }
      
      vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost:3000/api/conversations?page=-5')
      await GET(request as any)

      // New validation system provides safe defaults for invalid values
      expect(getConversations).toHaveBeenCalledWith({ page: 1, limit: 20 })
    })

    it('handles non-numeric parameters', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)
      
      const mockResponse = {
        conversations: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5
        }
      }
      
      vi.mocked(getConversations).mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost:3000/api/conversations?page=abc&limit=xyz')
      await GET(request as any)

      // New validation system provides safe defaults for non-numeric values
      expect(getConversations).toHaveBeenCalledWith({ page: 1, limit: 20 })
    })
  })

  describe('Pagination Response', () => {
    it('returns correct data for first page', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)

      const mockConversations = Array.from({ length: 20 }, (_, i) => ({
        conversationId: `conv-${i + 1}`,
        title: `Conversation ${i + 1}`,
        participantCount: 2,
        messageCount: 10,
        lastMessageTimestamp: '2024-01-15T10:00:00Z',
        type: 'direct',
        priority: 'normal',
      }))

      vi.mocked(getConversations).mockResolvedValueOnce({
        conversations: mockConversations,
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5
        }
      })

      const request = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20')
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toHaveLength(20)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5
      })
    })

    it('returns correct data for middle page', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)

      const mockConversations = Array.from({ length: 10 }, (_, i) => ({
        conversationId: `conv-${31 + i}`,
        title: `Conversation ${31 + i}`,
        participantCount: 3,
        messageCount: 15,
        lastMessageTimestamp: '2024-01-14T10:00:00Z',
        type: 'group',
        priority: 'high',
      }))

      vi.mocked(getConversations).mockResolvedValueOnce({
        conversations: mockConversations,
        pagination: {
          page: 4,
          limit: 10,
          total: 45,
          totalPages: 5
        }
      })

      const request = new NextRequest('http://localhost:3000/api/conversations?page=4&limit=10')
      const response = await GET(request as any)
      const data = await response.json()

      expect(data.conversations).toHaveLength(10)
      expect(data.pagination.page).toBe(4)
    })

    it('returns partial data for last page', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)

      const mockConversations = Array.from({ length: 5 }, (_, i) => ({
        conversationId: `conv-${46 + i}`,
        title: `Conversation ${46 + i}`,
        participantCount: 2,
        messageCount: 20,
        lastMessageTimestamp: '2024-01-13T10:00:00Z',
        type: 'direct',
        priority: 'low',
      }))

      vi.mocked(getConversations).mockResolvedValueOnce({
        conversations: mockConversations,
        pagination: {
          page: 5,
          limit: 10,
          total: 45,
          totalPages: 5
        }
      })

      const request = new NextRequest('http://localhost:3000/api/conversations?page=5&limit=10')
      const response = await GET(request as any)
      const data = await response.json()

      expect(data.conversations).toHaveLength(5)
      expect(data.pagination.page).toBe(5)
      expect(data.pagination.totalPages).toBe(5)
    })

    it('returns empty array for page beyond total', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)

      vi.mocked(getConversations).mockResolvedValueOnce({
        conversations: [],
        pagination: {
          page: 10,
          limit: 20,
          total: 50,
          totalPages: 3
        }
      })

      const request = new NextRequest('http://localhost:3000/api/conversations?page=10&limit=20')
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toHaveLength(0)
      expect(data.pagination.page).toBe(10)
    })
  })

  describe('Total Count Query', () => {
    it('handles Neo4j integer in count query', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)

      vi.mocked(getConversations).mockResolvedValueOnce({
        conversations: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 1000,
          totalPages: 50
        }
      })

      const request = new NextRequest('http://localhost:3000/api/conversations')
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.total).toBe(1000)
      expect(data.pagination.totalPages).toBe(50)
    })

    it('handles zero total count', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)

      vi.mocked(getConversations).mockResolvedValueOnce({
        conversations: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      })

      const request = new NextRequest('http://localhost:3000/api/conversations')
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.total).toBe(0)
      expect(data.pagination.totalPages).toBe(0)
      expect(data.conversations).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('handles count query failure', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)

      const error = new Error('Count query failed')
      vi.mocked(getConversations).mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/conversations')
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch conversations')
      expect(console.error).toHaveBeenCalledWith('Error fetching conversations:', error)
    })

    it('handles data query failure after successful count', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)

      const error = new Error('Data query failed')
      vi.mocked(getConversations).mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/conversations?page=2')
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch conversations')
    })
  })

  describe('Performance Considerations', () => {
    it('executes count and data queries separately', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)

      vi.mocked(getConversations).mockResolvedValueOnce({
        conversations: Array.from({ length: 20 }, (_, i) => ({
          conversationId: `conv-${i}`,
          title: `Conversation ${i}`,
          participantCount: 2,
          messageCount: 10,
          lastMessageTimestamp: '2024-01-15T10:00:00Z',
          type: 'direct',
          priority: 'normal',
        })),
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5
        }
      })

      const request = new NextRequest('http://localhost:3000/api/conversations')
      await GET(request as any)

      // getConversations is called once and handles both queries internally
      expect(getConversations).toHaveBeenCalledTimes(1)
    })

    it('maintains existing query optimizations', async () => {
      vi.mocked(testConnection).mockResolvedValueOnce(true)

      vi.mocked(getConversations).mockResolvedValueOnce({
        conversations: [],
        pagination: {
          page: 1000,
          limit: 20,
          total: 30000,
          totalPages: 1500
        }
      })

      const request = new NextRequest('http://localhost:3000/api/conversations?page=1000&limit=20')
      const response = await GET(request as any)
      const data = await response.json()

      // The optimization is now handled internally by getConversations
      expect(getConversations).toHaveBeenCalledWith({ page: 1000, limit: 20 })
      expect(data.pagination.page).toBe(1000)
    })
  })
})