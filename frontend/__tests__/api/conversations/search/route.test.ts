import { NextRequest } from 'next/server'
import { GET } from '@/app/api/conversations/search/route'

// Mock the Neo4j module
vi.mock('@/lib/neo4j', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/neo4j')>()
  return {
    ...actual,
    searchConversations: vi.fn(),
    testConnection: vi.fn().mockResolvedValue(true)
  }
})

describe('/api/conversations/search route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Success Cases', () => {
    it('should return search results with query parameter', async () => {
      const mockResults = {
        results: [
          {
            conversationId: 'conv-1',
            title: 'Team Meeting',
            participantCount: 5,
            messageCount: 25,
            lastMessageTimestamp: '2024-01-20T10:00:00Z',
            type: 'group',
            priority: 'normal'
          }
        ],
        total: 1
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=Meeting')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toEqual(mockResults)
      expect(searchConversations).toHaveBeenCalledWith({
        query: 'Meeting',
        page: 1,
        limit: 20
      })
    })

    it('should handle type filter parameter', async () => {
      const mockResults = {
        results: [],
        total: 0
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test&type=group')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(searchConversations).toHaveBeenCalledWith({
        query: 'test',
        type: 'group',
        page: 1,
        limit: 20
      })
    })

    it('should handle priority filter parameter', async () => {
      const mockResults = {
        results: [],
        total: 0
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=urgent&priority=high')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(searchConversations).toHaveBeenCalledWith({
        query: 'urgent',
        priority: 'high',
        page: 1,
        limit: 20
      })
    })

    it('should handle date range filter parameters', async () => {
      const mockResults = {
        results: [],
        total: 0
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest(
        'http://localhost:3000/api/conversations/search?query=test&dateFrom=2024-01-01&dateTo=2024-12-31'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(searchConversations).toHaveBeenCalledWith({
        query: 'test',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        page: 1,
        limit: 20
      })
    })

    it('should handle all filters combined', async () => {
      const mockResults = {
        results: [],
        total: 0
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest(
        'http://localhost:3000/api/conversations/search?query=meeting&type=group&priority=high&dateFrom=2024-01-01&dateTo=2024-12-31&page=2&limit=10'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(searchConversations).toHaveBeenCalledWith({
        query: 'meeting',
        type: 'group',
        priority: 'high',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        page: 2,
        limit: 10
      })
    })

    it('should handle pagination parameters', async () => {
      const mockResults = {
        results: [],
        total: 50
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test&page=3&limit=15')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(searchConversations).toHaveBeenCalledWith({
        query: 'test',
        page: 3,
        limit: 15
      })
    })
  })

  describe('Error Cases', () => {
    it('should return 400 when query parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/search')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Query parameter is required')
    })

    it('should return 400 when query parameter is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Query parameter is required')
    })

    it('should return 400 when query parameter is whitespace only', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=%20%20%20')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Query parameter is required')
    })

    it('should return 400 for invalid type parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test&type=invalid')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('type')
    })

    it('should return 400 for invalid priority parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test&priority=invalid')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('priority')
    })

    it('should return 400 for invalid dateFrom format', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test&dateFrom=invalid-date')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('dateFrom')
    })

    it('should return 400 for invalid dateTo format', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test&dateTo=2024-13-45')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('dateTo')
    })

    it('should return 400 when query exceeds maximum length', async () => {
      const longQuery = 'a'.repeat(201) // 201 characters
      const request = new NextRequest(`http://localhost:3000/api/conversations/search?query=${longQuery}`)
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Query parameter')
      expect(data.error).toContain('200')
    })

    it('should return 400 when dateTo is before dateFrom', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/conversations/search?query=test&dateFrom=2024-12-31&dateTo=2024-01-01'
      )
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('dateTo')
      expect(data.error).toContain('dateFrom')
    })

    it('should return 503 when database connection fails', async () => {
      const { testConnection } = await import('@/lib/neo4j')
      ;(testConnection as any).mockResolvedValueOnce(false)

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test')
      const response = await GET(request)

      expect(response.status).toBe(503)
      const data = await response.json()
      expect(data.error).toBe('Database connection failed')
    })

    it('should return 500 when search fails', async () => {
      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockRejectedValueOnce(new Error('Search failed'))

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to search conversations')
    })
  })

  describe('Input Validation', () => {
    it('should handle invalid page parameter gracefully', async () => {
      const mockResults = {
        results: [],
        total: 0
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test&page=invalid')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(searchConversations).toHaveBeenCalledWith({
        query: 'test',
        page: 1, // Should default to 1
        limit: 20
      })
    })

    it('should handle invalid limit parameter gracefully', async () => {
      const mockResults = {
        results: [],
        total: 0
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test&limit=abc')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(searchConversations).toHaveBeenCalledWith({
        query: 'test',
        page: 1,
        limit: 20 // Should default to 20
      })
    })

    it('should cap limit at maximum allowed value', async () => {
      const mockResults = {
        results: [],
        total: 0
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test&limit=1000')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const callArgs = (searchConversations as any).mock.calls[0][0]
      expect(callArgs.limit).toBeLessThanOrEqual(100)
    })

    it('should handle negative page number', async () => {
      const mockResults = {
        results: [],
        total: 0
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test&page=-1')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(searchConversations).toHaveBeenCalledWith({
        query: 'test',
        page: 1, // Should default to 1
        limit: 20
      })
    })
  })

  describe('Response Format', () => {
    it('should return results in correct format', async () => {
      const mockResults = {
        results: [
          {
            conversationId: 'conv-1',
            title: 'Meeting',
            participantCount: 3,
            messageCount: 15,
            lastMessageTimestamp: '2024-01-20T10:00:00Z',
            type: 'group',
            priority: 'normal'
          },
          {
            conversationId: 'conv-2',
            title: 'Discussion',
            participantCount: 2,
            messageCount: 8,
            lastMessageTimestamp: '2024-01-19T10:00:00Z',
            type: 'direct',
            priority: 'high'
          }
        ],
        total: 2
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=test')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toHaveProperty('results')
      expect(data).toHaveProperty('total')
      expect(Array.isArray(data.results)).toBe(true)
      expect(typeof data.total).toBe('number')
      expect(data.results).toHaveLength(2)
      expect(data.total).toBe(2)
    })

    it('should handle empty results', async () => {
      const mockResults = {
        results: [],
        total: 0
      }

      const { searchConversations } = await import('@/lib/neo4j')
      ;(searchConversations as any).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/conversations/search?query=nonexistent')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.results).toEqual([])
      expect(data.total).toBe(0)
    })
  })
})
