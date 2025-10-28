import { NextRequest } from 'next/server'
import { GET } from '@/app/api/users/route'

// Mock the Neo4j module
vi.mock('@/lib/neo4j', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/neo4j')>()
  return {
    ...actual,
    executeReadQuery: vi.fn(),
    getUsers: vi.fn(),
    testConnection: vi.fn().mockResolvedValue(true)
  }
})

// Mock crypto module for ETag generation
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createHash: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => 'mock-users-hash-12345')
      }))
    }))
  }
})

describe('/api/users route', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Enable ETags for this test suite
    process.env.ETAGS_ENABLED = 'true'
    
    // Mock testConnection to return true by default (unless overridden in specific tests)
    const { testConnection } = await import('@/lib/neo4j')
    ;(testConnection as any).mockResolvedValue(true)
  })

  afterEach(() => {
    // Restore ETAGS_ENABLED to default for other tests
    process.env.ETAGS_ENABLED = 'false'
  })

  describe('Basic functionality', () => {
    it('should return users with pagination when no parameters provided', async () => {
      const mockData = {
        users: [
          {
            userId: 'user-1',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            avatar: 'https://example.com/avatar1.png',
            conversationCount: 3,
            messageCount: 15,
            lastActiveTimestamp: '2024-01-01T10:00:00Z'
          },
          {
            userId: 'user-2', 
            name: 'Bob Smith',
            email: 'bob@example.com',
            avatar: null,
            conversationCount: 2,
            messageCount: 8,
            lastActiveTimestamp: '2024-01-01T09:30:00Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1000,
          totalPages: 50
        }
      }

      // Mock the getUsers function
      const { getUsers } = await import('@/lib/neo4j')
      ;(getUsers as any).mockResolvedValue(mockData)

      const request = new NextRequest('http://localhost:3000/api/users')
      const response = await GET(request)

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toEqual(mockData)
      expect(data.users).toHaveLength(2)
      expect(data.users[0]).toHaveProperty('userId')
      expect(data.users[0]).toHaveProperty('name')
      expect(data.users[0]).toHaveProperty('email')
      expect(data.users[0]).toHaveProperty('conversationCount')
      expect(data.users[0]).toHaveProperty('messageCount')
      expect(data.pagination.total).toBe(1000)
    })

    it('should handle pagination parameters correctly', async () => {
      const mockData = {
        users: [
          {
            userId: 'user-21',
            name: 'User Twenty-One',
            email: 'user21@example.com',
            avatar: null,
            conversationCount: 1,
            messageCount: 5,
            lastActiveTimestamp: '2024-01-01T08:00:00Z'
          }
        ],
        pagination: {
          page: 2,
          limit: 10,
          total: 1000,
          totalPages: 100
        }
      }

      // Mock the getUsers function
      const { getUsers } = await import('@/lib/neo4j')
      ;(getUsers as any).mockResolvedValue(mockData)

      const request = new NextRequest('http://localhost:3000/api/users?page=2&limit=10')
      const response = await GET(request)

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(10)
      
      // Verify getUsers was called with correct parameters
      expect(getUsers).toHaveBeenCalledWith({ page: 2, limit: 10 })
    })

    it('should handle invalid pagination parameters gracefully', async () => {
      const mockData = {
        users: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 1000,
          totalPages: 50
        }
      }

      // Mock the getUsers function
      const { getUsers } = await import('@/lib/neo4j')
      ;(getUsers as any).mockResolvedValue(mockData)

      const request = new NextRequest('http://localhost:3000/api/users?page=-1&limit=abc')
      const response = await GET(request)

      expect(response.status).toBe(200)
      
      // Should use default values for invalid parameters
      expect(getUsers).toHaveBeenCalledWith({ page: 1, limit: 20 })
    })
  })

  describe('Error handling', () => {
    it('should return 503 when database connection fails', async () => {
      // Mock connection test to fail
      const { testConnection } = await import('@/lib/neo4j')
      ;(testConnection as any).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/users')
      const response = await GET(request)

      expect(response.status).toBe(503)
      
      const data = await response.json()
      expect(data.error).toBe('Database connection failed')
    })

    it('should return 500 when getUsers throws an error', async () => {
      // Mock the getUsers function to throw an error
      const { getUsers } = await import('@/lib/neo4j')
      ;(getUsers as any).mockRejectedValue(new Error('Neo4j query failed'))

      const request = new NextRequest('http://localhost:3000/api/users')
      const response = await GET(request)

      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch users')
    })

    it('should not return ETag header on error responses', async () => {
      // Mock the getUsers function to throw an error
      const { getUsers } = await import('@/lib/neo4j')
      ;(getUsers as any).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/users')
      const response = await GET(request)

      expect(response.status).toBe(500)
      expect(response.headers.get('ETag')).toBeNull()
    })
  })

  describe('ETag implementation', () => {
    it('should generate ETag header from response data', async () => {
      const mockData = {
        users: [
          {
            userId: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            avatar: null,
            conversationCount: 2,
            messageCount: 5,
            lastActiveTimestamp: '2024-01-01T10:00:00Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      }

      // Mock the getUsers function
      const { getUsers } = await import('@/lib/neo4j')
      ;(getUsers as any).mockResolvedValue(mockData)

      const request = new NextRequest('http://localhost:3000/api/users?page=1&limit=20')
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
        users: [{ userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, conversationCount: 1, messageCount: 3, lastActiveTimestamp: '2024-01-01T10:00:00Z' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      // Mock the getUsers function
      const { getUsers } = await import('@/lib/neo4j')
      ;(getUsers as any).mockResolvedValue(mockData)

      // First request to get the ETag
      const initialRequest = new NextRequest('http://localhost:3000/api/users?page=1&limit=20')
      const initialResponse = await GET(initialRequest)
      const etag = initialResponse.headers.get('ETag')

      expect(etag).toBeTruthy()

      // Second request with matching ETag
      const request = new NextRequest('http://localhost:3000/api/users?page=1&limit=20', {
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

    it('should generate different ETags for different user data', async () => {
      const mockData1 = {
        users: [{ userId: 'user-1', name: 'First User', email: 'first@example.com', avatar: null, conversationCount: 1, messageCount: 3, lastActiveTimestamp: '2024-01-01T10:00:00Z' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      const mockData2 = {
        users: [{ userId: 'user-1', name: 'Second User', email: 'second@example.com', avatar: null, conversationCount: 2, messageCount: 5, lastActiveTimestamp: '2024-01-01T11:00:00Z' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      // Mock the getUsers function for first request
      const { getUsers } = await import('@/lib/neo4j')
      ;(getUsers as any).mockResolvedValueOnce(mockData1)

      const request1 = new NextRequest('http://localhost:3000/api/users?page=1&limit=20')
      const response1 = await GET(request1)

      expect(response1.status).toBe(200)
      const etag1 = response1.headers.get('ETag')
      expect(etag1).toBeTruthy()

      // Mock the getUsers function for second request
      ;(getUsers as any).mockResolvedValueOnce(mockData2)

      const request2 = new NextRequest('http://localhost:3000/api/users?page=1&limit=20')
      const response2 = await GET(request2)

      expect(response2.status).toBe(200)
      const etag2 = response2.headers.get('ETag')
      expect(etag2).toBeTruthy()

      // ETags should be different for different data
      expect(etag1).not.toBe(etag2)
    })
  })

  describe('API contract', () => {
    it('should maintain correct response structure for users API', async () => {
      const mockUsers = [
        {
          userId: 'user-1',
          name: 'Complete User',
          email: 'complete@example.com',
          avatar: 'https://example.com/avatar.png',
          conversationCount: 5,
          messageCount: 25,
          lastActiveTimestamp: '2024-01-01T12:00:00Z'
        }
      ]

      const mockData = {
        users: mockUsers,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      // Mock the getUsers function
      const { getUsers } = await import('@/lib/neo4j')
      ;(getUsers as any).mockResolvedValue(mockData)

      const request = new NextRequest('http://localhost:3000/api/users?page=1&limit=20')
      const response = await GET(request)
      const data = await response.json()

      // Verify users API structure
      expect(data).toHaveProperty('users')
      expect(data).toHaveProperty('pagination')
      expect(data.users[0]).toHaveProperty('userId')
      expect(data.users[0]).toHaveProperty('name')
      expect(data.users[0]).toHaveProperty('email')
      expect(data.users[0]).toHaveProperty('avatar')
      expect(data.users[0]).toHaveProperty('conversationCount')
      expect(data.users[0]).toHaveProperty('messageCount')
      expect(data.users[0]).toHaveProperty('lastActiveTimestamp')
      expect(data.pagination).toHaveProperty('page')
      expect(data.pagination).toHaveProperty('limit')
      expect(data.pagination).toHaveProperty('total')
      expect(data.pagination).toHaveProperty('totalPages')

      // Verify ETag header is present
      expect(response.headers.get('ETag')).toBeTruthy()
    })
  })

  describe('Parameter validation', () => {
    it('should handle extremely large limit values gracefully', async () => {
      const mockData = {
        users: [],
        pagination: { page: 1, limit: 100, total: 1000, totalPages: 10 }
      }

      // Mock the getUsers function
      const { getUsers } = await import('@/lib/neo4j')
      ;(getUsers as any).mockResolvedValue(mockData)

      const request = new NextRequest('http://localhost:3000/api/users?page=1&limit=999999')
      const response = await GET(request)

      expect(response.status).toBe(200)
      
      // Should cap limit at reasonable maximum (e.g., 100)
      expect(getUsers).toHaveBeenCalledWith({ page: 1, limit: 100 })
    })

    it('should handle negative page numbers gracefully', async () => {
      const mockData = {
        users: [],
        pagination: { page: 1, limit: 20, total: 1000, totalPages: 50 }
      }

      // Mock the getUsers function
      const { getUsers } = await import('@/lib/neo4j')
      ;(getUsers as any).mockResolvedValue(mockData)

      const request = new NextRequest('http://localhost:3000/api/users?page=-5&limit=20')
      const response = await GET(request)

      expect(response.status).toBe(200)
      
      // Should use page 1 for negative values
      expect(getUsers).toHaveBeenCalledWith({ page: 1, limit: 20 })
    })
  })
})