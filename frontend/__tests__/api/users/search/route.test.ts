import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/users/search/route'
import * as neo4jLib from '@/lib/neo4j'

vi.mock('@/lib/neo4j', () => ({
  searchUsers: vi.fn(),
  testConnection: vi.fn()
}))

describe('/api/users/search route', () => {
  const mockSearchUsers = vi.mocked(neo4jLib.searchUsers)
  const mockTestConnection = vi.mocked(neo4jLib.testConnection)

  beforeEach(() => {
    vi.clearAllMocks()
    mockTestConnection.mockResolvedValue(true)
  })

  describe('Basic functionality', () => {
    it('should search users by query parameter', async () => {
      const mockUsers = [
        {
          userId: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
          username: 'johndoe',
          status: 'online',
          role: 'user',
          avatarUrl: null,
          department: 'Engineering',
          location: 'San Francisco',
          bio: 'Software Engineer',
          lastSeen: '2024-01-15T10:30:00.000Z'
        }
      ]

      mockSearchUsers.mockResolvedValue({
        results: mockUsers,
        total: 1
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=john')
      const response = await GET(request)
      const data = await response.json()

      expect(mockSearchUsers).toHaveBeenCalledWith({
        query: 'john',
        excludeUserId: undefined,
        page: 1,
        limit: 10
      })
      expect(data.results).toEqual(mockUsers)
      expect(data.total).toBe(1)
      expect(response.status).toBe(200)
    })

    it('should search with excludeUserId parameter', async () => {
      mockSearchUsers.mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=john&excludeUserId=user123')
      await GET(request)

      expect(mockSearchUsers).toHaveBeenCalledWith({
        query: 'john',
        excludeUserId: 'user123',
        page: 1,
        limit: 10
      })
    })

    it('should handle pagination parameters', async () => {
      mockSearchUsers.mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test&page=2&limit=20')
      await GET(request)

      expect(mockSearchUsers).toHaveBeenCalledWith({
        query: 'test',
        excludeUserId: undefined,
        page: 2,
        limit: 20
      })
    })

    it('should return empty results when no query provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/search')
      const response = await GET(request)
      const data = await response.json()

      expect(mockSearchUsers).not.toHaveBeenCalled()
      expect(data.results).toEqual([])
      expect(data.total).toBe(0)
      expect(response.status).toBe(200)
    })

    it('should handle empty search results', async () => {
      mockSearchUsers.mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=nonexistent')
      const response = await GET(request)
      const data = await response.json()

      expect(data.results).toEqual([])
      expect(data.total).toBe(0)
      expect(response.status).toBe(200)
    })

    it('should handle multiple search results', async () => {
      const mockUsers = [
        {
          userId: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
          username: 'johndoe',
          status: 'online',
          role: 'user',
          avatarUrl: null,
          department: null,
          location: null,
          bio: null,
          lastSeen: null
        },
        {
          userId: 'user2',
          name: 'John Smith',
          email: 'johnsmith@example.com',
          username: 'jsmith',
          status: 'offline',
          role: 'admin',
          avatarUrl: null,
          department: null,
          location: null,
          bio: null,
          lastSeen: null
        }
      ]

      mockSearchUsers.mockResolvedValue({
        results: mockUsers,
        total: 2
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=john')
      const response = await GET(request)
      const data = await response.json()

      expect(data.results).toHaveLength(2)
      expect(data.results).toEqual(mockUsers)
      expect(data.total).toBe(2)
    })
  })

  describe('Error handling', () => {
    it('should return 503 when database connection fails', async () => {
      mockTestConnection.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test')
      const response = await GET(request)
      const data = await response.json()

      expect(data.error).toBe('Database connection failed')
      expect(response.status).toBe(503)
      expect(mockSearchUsers).not.toHaveBeenCalled()
    })

    it('should handle search errors gracefully', async () => {
      mockSearchUsers.mockRejectedValue(new Error('Neo4j query failed'))

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test')
      const response = await GET(request)
      const data = await response.json()

      expect(data.error).toBe('Failed to search users')
      expect(response.status).toBe(500)
    })

    it('should handle non-Error exceptions', async () => {
      mockSearchUsers.mockRejectedValue('String error')

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test')
      const response = await GET(request)
      const data = await response.json()

      expect(data.error).toBe('Failed to search users')
      expect(response.status).toBe(500)
    })
  })

  describe('Parameter validation', () => {
    it('should cap limit at maximum value', async () => {
      mockSearchUsers.mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test&limit=1000')
      await GET(request)

      expect(mockSearchUsers).toHaveBeenCalledWith({
        query: 'test',
        excludeUserId: undefined,
        page: 1,
        limit: 50 // Should be capped at 50
      })
    })

    it('should use default limit for invalid values', async () => {
      mockSearchUsers.mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test&limit=abc')
      await GET(request)

      expect(mockSearchUsers).toHaveBeenCalledWith({
        query: 'test',
        excludeUserId: undefined,
        page: 1,
        limit: 10 // Default
      })
    })

    it('should use default page for invalid values', async () => {
      mockSearchUsers.mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test&page=invalid')
      await GET(request)

      expect(mockSearchUsers).toHaveBeenCalledWith({
        query: 'test',
        excludeUserId: undefined,
        page: 1, // Default
        limit: 10
      })
    })

    it('should handle negative page numbers', async () => {
      mockSearchUsers.mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test&page=-1')
      await GET(request)

      expect(mockSearchUsers).toHaveBeenCalledWith({
        query: 'test',
        excludeUserId: undefined,
        page: 1, // Should be set to 1
        limit: 10
      })
    })

    it('should handle minimum limit value', async () => {
      mockSearchUsers.mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test&limit=0')
      await GET(request)

      expect(mockSearchUsers).toHaveBeenCalledWith({
        query: 'test',
        excludeUserId: undefined,
        page: 1,
        limit: 10 // Default value when 0 is provided
      })
    })
  })

  describe('Search by different fields', () => {
    it('should find users by partial name match', async () => {
      const mockUser = {
        userId: 'user1',
        name: 'Jonathan Doe',
        email: 'jdoe@example.com',
        username: 'jdoe',
        status: 'online',
        role: 'user',
        avatarUrl: null,
        department: null,
        location: null,
        bio: null,
        lastSeen: null
      }

      mockSearchUsers.mockResolvedValue({
        results: [mockUser],
        total: 1
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=nathan')
      const response = await GET(request)
      const data = await response.json()

      expect(data.results[0].name).toContain('nathan')
      expect(data.total).toBe(1)
    })

    it('should find users by email match', async () => {
      const mockUser = {
        userId: 'user1',
        name: 'John Doe',
        email: 'john.doe@company.com',
        username: 'johnd',
        status: 'online',
        role: 'user',
        avatarUrl: null,
        department: null,
        location: null,
        bio: null,
        lastSeen: null
      }

      mockSearchUsers.mockResolvedValue({
        results: [mockUser],
        total: 1
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=company.com')
      const response = await GET(request)
      const data = await response.json()

      expect(data.results[0].email).toContain('company.com')
      expect(data.total).toBe(1)
    })

    it('should find users by username match', async () => {
      const mockUser = {
        userId: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe123',
        status: 'online',
        role: 'user',
        avatarUrl: null,
        department: null,
        location: null,
        bio: null,
        lastSeen: null
      }

      mockSearchUsers.mockResolvedValue({
        results: [mockUser],
        total: 1
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=doe123')
      const response = await GET(request)
      const data = await response.json()

      expect(data.results[0].username).toContain('doe123')
      expect(data.total).toBe(1)
    })
  })

  describe('Response format', () => {
    it('should include query in response', async () => {
      mockSearchUsers.mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test')
      const response = await GET(request)
      const data = await response.json()

      expect(data.query).toBe('test')
    })

    it('should include execution metadata', async () => {
      mockSearchUsers.mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('executionTime')
      expect(typeof data.executionTime).toBe('number')
      expect(data.executionTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle special characters in query', async () => {
      mockSearchUsers.mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest('http://localhost:3000/api/users/search?query=test%40example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(mockSearchUsers).toHaveBeenCalledWith({
        query: 'test@example.com',
        excludeUserId: undefined,
        page: 1,
        limit: 10
      })
      expect(data.query).toBe('test@example.com')
    })
  })
})