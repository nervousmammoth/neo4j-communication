import { NextRequest } from 'next/server'
import { GET } from '@/app/api/conversations/route'

// Mock the Neo4j module
vi.mock('@/lib/neo4j', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/neo4j')>()
  return {
    ...actual,
    executeReadQuery: vi.fn(),
    getConversations: vi.fn(),
    testConnection: vi.fn().mockResolvedValue(true)
  }
})

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

describe('/api/conversations route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Enable ETags for this test suite
    process.env.ETAGS_ENABLED = 'true'
  })

  afterEach(() => {
    // Restore ETAGS_ENABLED to default for other tests
    process.env.ETAGS_ENABLED = 'false'
  })

  describe('ETag implementation', () => {
    it('should generate ETag header from response data', async () => {
      const mockData = {
        conversations: [
          {
            conversationId: 'conv-1',
            title: 'Test Conversation',
            participantCount: 2,
            messageCount: 5
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      }

      // Mock the getConversations function
      const { getConversations } = await import('@/lib/neo4j')
      ;(getConversations as any).mockResolvedValue(mockData)

      const request = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20')
      const response = await GET(request)

      expect(response.status).toBe(200)
      
      const etag = response.headers.get('ETag')
      expect(etag).toBeTruthy()
      expect(etag).toMatch(/^[a-f0-9]{32}$/) // MD5 hash format
      
      const data = await response.json()
      expect(data).toEqual(mockData)
    })

    it('should return 304 Not Modified when If-None-Match matches ETag', async () => {
      const mockData = {
        conversations: [{ conversationId: 'conv-1', title: 'Test' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      // Mock the getConversations function
      const { getConversations } = await import('@/lib/neo4j')
      ;(getConversations as any).mockResolvedValue(mockData)

      // First request to get the ETag
      const initialRequest = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20')
      const initialResponse = await GET(initialRequest)
      const etag = initialResponse.headers.get('ETag')

      expect(etag).toBeTruthy()

      // Second request with matching ETag
      const request = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20', {
        headers: {
          'If-None-Match': etag!
        }
      })

      const response = await GET(request)

      expect(response.status).toBe(304)
      expect(response.headers.get('ETag')).toBe(etag)
      
      // Body should be empty for 304 responses
      const text = await response.text()
      expect(text).toBe('')
    })

    it('should return fresh data when If-None-Match does not match ETag', async () => {
      const mockData = {
        conversations: [{ conversationId: 'conv-1', title: 'Updated Title' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      // Mock the getConversations function
      const { getConversations } = await import('@/lib/neo4j')
      ;(getConversations as any).mockResolvedValue(mockData)

      // Request with different ETag
      const request = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20', {
        headers: {
          'If-None-Match': 'different-etag-hash'
        }
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
      
      const etag = response.headers.get('ETag')
      expect(etag).toBeTruthy()
      expect(etag).not.toBe('different-etag-hash')
      
      const data = await response.json()
      expect(data).toEqual(mockData)
    })

    it('should handle requests without If-None-Match header', async () => {
      const mockData = {
        conversations: [{ conversationId: 'conv-1', title: 'Test' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      // Mock the getConversations function
      const { getConversations } = await import('@/lib/neo4j')
      ;(getConversations as any).mockResolvedValue(mockData)

      const request = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20')
      const response = await GET(request)

      expect(response.status).toBe(200)
      
      const etag = response.headers.get('ETag')
      expect(etag).toBeTruthy()
      expect(etag).toMatch(/^[a-f0-9]{32}$/)
      
      const data = await response.json()
      expect(data).toEqual(mockData)
    })

    it('should generate different ETags for different data', async () => {
      const mockData1 = {
        conversations: [{ conversationId: 'conv-1', title: 'First' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      const mockData2 = {
        conversations: [{ conversationId: 'conv-1', title: 'Second' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      // Mock the getConversations function for first request
      const { getConversations } = await import('@/lib/neo4j')
      ;(getConversations as any).mockResolvedValueOnce(mockData1)

      const request1 = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20')
      const response1 = await GET(request1)

      expect(response1.status).toBe(200)
      const etag1 = response1.headers.get('ETag')
      expect(etag1).toBeTruthy()

      // Mock the getConversations function for second request
      ;(getConversations as any).mockResolvedValueOnce(mockData2)

      const request2 = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20')
      const response2 = await GET(request2)

      expect(response2.status).toBe(200)
      const etag2 = response2.headers.get('ETag')
      expect(etag2).toBeTruthy()

      // ETags should be different for different data
      expect(etag1).not.toBe(etag2)
    })

    it('should handle errors gracefully and not return ETag on error', async () => {
      // Mock the getConversations function to throw an error
      const { getConversations } = await import('@/lib/neo4j')
      ;(getConversations as any).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20')
      const response = await GET(request)

      expect(response.status).toBe(500)
      expect(response.headers.get('ETag')).toBeNull()
    })

    it('should support cache validation with different query parameters', async () => {
      const mockData = {
        conversations: [{ conversationId: 'conv-1', title: 'Test' }],
        pagination: { page: 2, limit: 10, total: 1, totalPages: 1 }
      }

      // Mock the getConversations function
      const { getConversations } = await import('@/lib/neo4j')
      ;(getConversations as any).mockResolvedValue(mockData)

      // Different query parameters should still support ETag
      const request = new NextRequest('http://localhost:3000/api/conversations?page=2&limit=10')
      const response = await GET(request)

      expect(response.status).toBe(200)
      
      const etag = response.headers.get('ETag')
      expect(etag).toBeTruthy()
      expect(etag).toMatch(/^[a-f0-9]{32}$/)
      
      const data = await response.json()
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(10)
    })

    it('should generate consistent ETags for identical data', async () => {
      const mockData = {
        conversations: [{ conversationId: 'conv-1', title: 'Consistent' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      // Mock the getConversations function
      const { getConversations } = await import('@/lib/neo4j')
      ;(getConversations as any).mockResolvedValue(mockData)

      // Make two identical requests
      const request1 = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20')
      const response1 = await GET(request1)
      const etag1 = response1.headers.get('ETag')

      const request2 = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20')
      const response2 = await GET(request2)
      const etag2 = response2.headers.get('ETag')

      // ETags should be identical for identical data
      expect(etag1).toBe(etag2)
      expect(etag1).toBeTruthy()
    })
  })

  describe('backward compatibility', () => {
    it('should maintain existing API contract', async () => {
      const mockConversations = [
        {
          conversationId: 'conv-1',
          title: 'Test Conversation',
          type: 'direct',
          priority: 'normal',
          tags: [],
          createdAt: '2024-01-01T00:00:00Z',
          lastMessageTimestamp: '2024-01-01T01:00:00Z',
          lastMessagePreview: 'Hello world'
        }
      ]

      const mockData = {
        conversations: mockConversations,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      // Mock the getConversations function
      const { getConversations } = await import('@/lib/neo4j')
      ;(getConversations as any).mockResolvedValue(mockData)

      const request = new NextRequest('http://localhost:3000/api/conversations?page=1&limit=20')
      const response = await GET(request)
      const data = await response.json()

      // Verify existing API structure is maintained
      expect(data).toHaveProperty('conversations')
      expect(data).toHaveProperty('pagination')
      expect(data.conversations[0]).toHaveProperty('conversationId')
      expect(data.conversations[0]).toHaveProperty('title')
      expect(data.pagination).toHaveProperty('page')
      expect(data.pagination).toHaveProperty('limit')
      expect(data.pagination).toHaveProperty('total')
      expect(data.pagination).toHaveProperty('totalPages')

      // Verify ETag header is present
      expect(response.headers.get('ETag')).toBeTruthy()
    })
  })
})