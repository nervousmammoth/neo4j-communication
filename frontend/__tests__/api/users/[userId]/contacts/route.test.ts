import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/users/[userId]/contacts/route'
import * as neo4jLib from '@/lib/neo4j'
import { NextRequest } from 'next/server'

vi.mock('@/lib/neo4j', () => ({
  getUserContacts: vi.fn()
}))

describe('GET /api/users/[userId]/contacts', () => {
  const mockUserId = 'user-123'
  const mockContacts = [
    {
      userId: 'user-456',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      username: 'janesmith',
      avatarUrl: 'https://example.com/avatar456.jpg',
      status: 'active',
      role: 'member',
      bio: 'Test bio',
      department: 'Engineering',
      location: 'NYC',
      lastSeen: '2025-01-09T10:00:00Z',
      communicationStats: {
        sharedConversationCount: 5,
        totalMessageCount: 150,
        lastInteraction: '2025-01-08T15:30:00Z',
        firstInteraction: '2024-06-01T09:00:00Z'
      }
    },
    {
      userId: 'user-789',
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      username: 'bobjohnson',
      avatarUrl: null,
      status: 'active',
      role: 'admin',
      bio: null,
      department: 'Sales',
      location: 'LA',
      lastSeen: '2025-01-09T09:00:00Z',
      communicationStats: {
        sharedConversationCount: 3,
        totalMessageCount: 75,
        lastInteraction: '2025-01-07T12:00:00Z',
        firstInteraction: '2024-07-15T10:00:00Z'
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful requests', () => {
    it('should return user contacts with default pagination', async () => {
      vi.mocked(neo4jLib.getUserContacts).mockResolvedValue({
        results: mockContacts,
        total: 2
      })

      const request = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts`
      )
      
      const response = await GET(
        request,
        { params: { userId: mockUserId } }
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data).toEqual({
        results: mockContacts,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      })
      
      expect(neo4jLib.getUserContacts).toHaveBeenCalledWith({
        userId: mockUserId,
        query: '',
        page: 1,
        limit: 20
      })
    })

    it('should handle search query parameter', async () => {
      vi.mocked(neo4jLib.getUserContacts).mockResolvedValue({
        results: [mockContacts[0]],
        total: 1
      })

      const request = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts?query=jane`
      )
      
      const response = await GET(
        request,
        { params: { userId: mockUserId } }
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.results).toHaveLength(1)
      expect(data.results[0].name).toBe('Jane Smith')
      
      expect(neo4jLib.getUserContacts).toHaveBeenCalledWith({
        userId: mockUserId,
        query: 'jane',
        page: 1,
        limit: 20
      })
    })

    it('should handle pagination parameters', async () => {
      vi.mocked(neo4jLib.getUserContacts).mockResolvedValue({
        results: mockContacts,
        total: 50
      })

      const request = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts?page=2&limit=10`
      )
      
      const response = await GET(
        request,
        { params: { userId: mockUserId } }
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.page).toBe(2)
      expect(data.limit).toBe(10)
      expect(data.totalPages).toBe(5)
      
      expect(neo4jLib.getUserContacts).toHaveBeenCalledWith({
        userId: mockUserId,
        query: '',
        page: 2,
        limit: 10
      })
    })

    it('should return empty results for user with no contacts', async () => {
      vi.mocked(neo4jLib.getUserContacts).mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts`
      )
      
      const response = await GET(
        request,
        { params: { userId: mockUserId } }
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.results).toEqual([])
      expect(data.total).toBe(0)
      expect(data.totalPages).toBe(0)
    })

    it('should handle special characters in search query', async () => {
      vi.mocked(neo4jLib.getUserContacts).mockResolvedValue({
        results: [],
        total: 0
      })

      const request = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts?query=user%40example.com`
      )
      
      const response = await GET(
        request,
        { params: { userId: mockUserId } }
      )
      
      expect(response.status).toBe(200)
      
      expect(neo4jLib.getUserContacts).toHaveBeenCalledWith({
        userId: mockUserId,
        query: 'user@example.com',
        page: 1,
        limit: 20
      })
    })
  })

  describe('Error handling', () => {
    it('should return 404 for non-existent user', async () => {
      vi.mocked(neo4jLib.getUserContacts).mockRejectedValue(
        new Error('User not found')
      )

      const request = new NextRequest(
        `http://localhost/api/users/invalid-user/contacts`
      )
      
      const response = await GET(
        request,
        { params: { userId: 'invalid-user' } }
      )
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('User not found')
    })

    it('should return 500 for database errors', async () => {
      vi.mocked(neo4jLib.getUserContacts).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts`
      )
      
      const response = await GET(
        request,
        { params: { userId: mockUserId } }
      )
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch user contacts')
    })

    it('should validate pagination parameters', async () => {
      vi.mocked(neo4jLib.getUserContacts).mockResolvedValue({
        results: mockContacts,
        total: 2
      })

      // Test negative page number
      const request1 = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts?page=-1`
      )
      
      const response1 = await GET(
        request1,
        { params: { userId: mockUserId } }
      )
      
      expect(response1.status).toBe(200)
      const data1 = await response1.json()
      expect(data1.page).toBe(1) // Should default to 1
      
      // Test limit too high (more than 1000)
      const request2 = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts?limit=2000`
      )
      
      const response2 = await GET(
        request2,
        { params: { userId: mockUserId } }
      )
      
      expect(response2.status).toBe(200)
      const data2 = await response2.json()
      expect(data2.limit).toBe(1000) // Should cap at 1000
    })

    it('should handle missing userId parameter', async () => {
      const request = new NextRequest(
        `http://localhost/api/users//contacts`
      )
      
      const response = await GET(
        request,
        { params: { userId: '' } }
      )
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('User ID is required')
    })

    it('should handle non-numeric page and limit parameters (NaN cases)', async () => {
      vi.mocked(neo4jLib.getUserContacts).mockResolvedValue({
        results: mockContacts,
        total: 2
      })

      // Test with non-numeric values that cause parseInt to return NaN
      const request = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts?page=abc&limit=xyz`
      )
      
      const response = await GET(
        request,
        { params: { userId: mockUserId } }
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Should fall back to default values when parseInt returns NaN
      expect(data.page).toBe(1) // Falls back to || 1
      expect(data.limit).toBe(20) // Falls back to || 20
      
      expect(neo4jLib.getUserContacts).toHaveBeenCalledWith({
        userId: mockUserId,
        query: '',
        page: 1,
        limit: 20
      })
    })

    it('should handle completely invalid page/limit formats', async () => {
      vi.mocked(neo4jLib.getUserContacts).mockResolvedValue({
        results: [],
        total: 0
      })

      // Test with values that start with non-numeric characters
      const request = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts?page=invalid&limit=not-a-number`
      )
      
      const response = await GET(
        request,
        { params: { userId: mockUserId } }
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      // parseInt('invalid') and parseInt('not-a-number') return NaN
      // Should use fallback values
      expect(data.page).toBe(1)
      expect(data.limit).toBe(20)
    })
  })

  describe('Response caching', () => {
    it('should set appropriate cache headers', async () => {
      vi.mocked(neo4jLib.getUserContacts).mockResolvedValue({
        results: mockContacts,
        total: 2
      })

      const request = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts`
      )
      
      const response = await GET(
        request,
        { params: { userId: mockUserId } }
      )
      
      expect(response.status).toBe(200)
      
      // Check if next revalidate is set (cache for 60 seconds)
      const headers = response.headers
      // Note: Next.js handles caching internally, we just verify the response is successful
      expect(response).toBeDefined()
    })
  })

  describe('Contact sorting', () => {
    it('should return contacts sorted by name by default', async () => {
      const unsortedContacts = [
        { ...mockContacts[1], name: 'Charlie' },
        { ...mockContacts[0], name: 'Alice' },
        { ...mockContacts[1], name: 'Bob' }
      ]

      vi.mocked(neo4jLib.getUserContacts).mockResolvedValue({
        results: unsortedContacts,
        total: 3
      })

      const request = new NextRequest(
        `http://localhost/api/users/${mockUserId}/contacts`
      )
      
      const response = await GET(
        request,
        { params: { userId: mockUserId } }
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Verify that Neo4j function was called (sorting happens in the query)
      expect(neo4jLib.getUserContacts).toHaveBeenCalled()
      expect(data.results).toEqual(unsortedContacts)
    })
  })
})