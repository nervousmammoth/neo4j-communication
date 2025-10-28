import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/users/[userId]/route'
import { NextRequest } from 'next/server'
import * as neo4jLib from '@/lib/neo4j'

// Mock the Neo4j module - but use the real convertNeo4jIntegers
vi.mock('@/lib/neo4j', async () => {
  const actual = await vi.importActual('@/lib/neo4j')
  return {
    ...actual,
    executeReadQuery: vi.fn(),
    // Use the real convertNeo4jIntegers function to properly handle DateTime conversion
    convertNeo4jIntegers: actual.convertNeo4jIntegers
  }
})

describe('GET /api/users/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return user details with statistics successfully', async () => {
    const mockUserId = 'user-123'
    const mockUserData = {
      userId: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
      avatarUrl: 'https://example.com/avatar.jpg',
      bio: 'Software Developer',
      status: 'online',
      lastSeen: '2025-01-14T10:00:00Z',
      department: 'Engineering',
      location: 'San Francisco'
    }

    const mockStats = {
      totalMessages: 150,
      totalConversations: 12,
      averageMessagesPerConversation: 12.5,
      mostActiveDay: 'Monday',
      firstActivity: '2024-01-01T08:00:00Z',
      lastActivity: '2025-01-14T10:00:00Z'
    }

    const mockConversations = [
      {
        conversationId: 'conv-1',
        title: 'Project Discussion',
        type: 'group',
        lastMessageTimestamp: '2025-01-14T09:00:00Z',
        messageCount: 25,
        participantCount: 5
      },
      {
        conversationId: 'conv-2',
        title: 'Team Standup',
        type: 'group',
        lastMessageTimestamp: '2025-01-13T15:00:00Z',
        messageCount: 10,
        participantCount: 8
      }
    ]

    const mockActivityTimeline = [
      {
        type: 'message_sent',
        conversationId: 'conv-1',
        conversationTitle: 'Project Discussion',
        timestamp: '2025-01-14T09:00:00Z',
        content: 'Latest update on the project'
      },
      {
        type: 'conversation_joined',
        conversationId: 'conv-3',
        conversationTitle: 'New Team',
        timestamp: '2025-01-13T14:00:00Z'
      }
    ]

    // Mock the Neo4j query response
    vi.mocked(neo4jLib.executeReadQuery).mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            if (key === 'user') return mockUserData
            if (key === 'stats') return mockStats
            if (key === 'conversations') return mockConversations
            if (key === 'activityTimeline') return mockActivityTimeline
            return null
          }
        }
      ]
    } as any)

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`)
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      user: mockUserData,
      stats: mockStats,
      conversations: mockConversations,
      activityTimeline: mockActivityTimeline
    })

    // Verify the query was called with correct parameters
    expect(neo4jLib.executeReadQuery).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (u:User {userId: $userId})'),
      { userId: mockUserId }
    )
  })

  it('should return 404 when user is not found', async () => {
    const mockUserId = 'non-existent-user'

    // Mock empty response from Neo4j
    vi.mocked(neo4jLib.executeReadQuery).mockResolvedValue({
      records: []
    } as any)

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`)
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'User not found' })
  })

  it('should return 400 when userId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/users/')
    const response = await GET(request, { params: Promise.resolve({ userId: '' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'User ID is required' })
  })

  it('should handle database errors gracefully', async () => {
    const mockUserId = 'user-123'
    const mockError = new Error('Database connection failed')

    // Mock database error
    vi.mocked(neo4jLib.executeReadQuery).mockRejectedValue(mockError)

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`)
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: 'Failed to fetch user details',
      details: 'Database connection failed'
    })
  })

  it('should calculate statistics correctly', async () => {
    const mockUserId = 'user-456'
    const mockUserData = {
      userId: 'user-456',
      name: 'Jane Smith',
      email: 'jane@example.com'
    }

    // Mock response with edge cases for statistics
    vi.mocked(neo4jLib.executeReadQuery).mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            if (key === 'user') return mockUserData
            if (key === 'stats') {
              return {
                totalMessages: 0,
                totalConversations: 0,
                averageMessagesPerConversation: 0,
                mostActiveDay: null,
                firstActivity: null,
                lastActivity: null
              }
            }
            if (key === 'conversations') return []
            if (key === 'activityTimeline') return []
            return null
          }
        }
      ]
    } as any)

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`)
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.stats.totalMessages).toBe(0)
    expect(data.stats.averageMessagesPerConversation).toBe(0)
  })

  it('should paginate conversations list', async () => {
    const mockUserId = 'user-789'
    const mockUserData = {
      userId: 'user-789',
      name: 'Bob Johnson',
      email: 'bob@example.com'
    }

    // Mock response with 10 conversations (pagination limit)
    const mockConversations = Array.from({ length: 10 }, (_, i) => ({
      conversationId: `conv-${i}`,
      title: `Conversation ${i}`,
      type: 'group',
      lastMessageTimestamp: `2025-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      messageCount: i * 10,
      participantCount: i + 2
    }))

    vi.mocked(neo4jLib.executeReadQuery).mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            if (key === 'user') return mockUserData
            if (key === 'stats') {
              return {
                totalMessages: 500,
                totalConversations: 25,
                averageMessagesPerConversation: 20
              }
            }
            if (key === 'conversations') return mockConversations
            if (key === 'activityTimeline') return []
            return null
          }
        }
      ]
    } as any)

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`)
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.conversations).toHaveLength(10)
    expect(data.stats.totalConversations).toBe(25) // Total is more than returned
  })

  it('should handle Neo4j DateTime conversion', async () => {
    const mockUserId = 'user-datetime'
    // With disableLosslessIntegers: true, dates may still come as objects
    // Our convertNeo4jIntegers helper will convert them
    const mockNeo4jDateTime = {
      year: 2025,
      month: 1,
      day: 14,
      hour: 10,
      minute: 30,
      second: 45,
      nanosecond: 0,
      toString: () => '2025-01-14T10:30:45Z'
    }

    vi.mocked(neo4jLib.executeReadQuery).mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            if (key === 'user') {
              return {
                userId: mockUserId,
                name: 'DateTime User',
                email: 'datetime@example.com',
                lastSeen: mockNeo4jDateTime
              }
            }
            if (key === 'stats') {
              return {
                totalMessages: 10,
                totalConversations: 2,
                firstActivity: mockNeo4jDateTime,
                lastActivity: mockNeo4jDateTime
              }
            }
            return key === 'conversations' ? [] : []
          }
        }
      ]
    } as any)

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`)
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user.lastSeen).toBe('2025-01-14T10:30:45Z')
    expect(data.stats.firstActivity).toBe('2025-01-14T10:30:45Z')
    expect(data.stats.lastActivity).toBe('2025-01-14T10:30:45Z')
  })

  it('should handle non-array conversations and timeline data', async () => {
    const mockUserId = 'user-edge-case'
    const mockUserData = {
      userId: 'user-edge-case',
      name: 'Edge Case User',
      email: 'edge@example.com'
    }

    // Mock the Neo4j query response with non-array data
    vi.mocked(neo4jLib.executeReadQuery).mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            if (key === 'user') return mockUserData
            if (key === 'stats') {
              return {
                totalMessages: 5,
                totalConversations: 1,
                averageMessagesPerConversation: 5
              }
            }
            // Return non-array values to test edge case handling
            if (key === 'conversations') return null // Non-array conversations
            if (key === 'activityTimeline') return undefined // Non-array timeline
            return null
          }
        }
      ]
    } as any)

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`)
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should fallback to empty arrays when data is not an array
    expect(data.conversations).toEqual([])
    expect(data.activityTimeline).toEqual([])
    expect(data.user).toEqual(mockUserData)
    expect(data.stats.totalMessages).toBe(5)
  })

  it('should filter out invalid conversation objects', async () => {
    const mockUserId = 'user-invalid-data'
    const mockUserData = {
      userId: 'user-invalid-data',
      name: 'Invalid Data User',
      email: 'invalid@example.com'
    }

    // Mock response with mixed valid and invalid conversation objects
    vi.mocked(neo4jLib.executeReadQuery).mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            if (key === 'user') return mockUserData
            if (key === 'stats') {
              return {
                totalMessages: 10,
                totalConversations: 3
              }
            }
            if (key === 'conversations') {
              return [
                // Valid conversation
                {
                  conversationId: 'conv-valid',
                  title: 'Valid Conversation',
                  type: 'group',
                  lastMessageTimestamp: '2025-01-14T10:00:00Z',
                  messageCount: 10,
                  participantCount: 3
                },
                // Invalid: null object
                null,
                // Invalid: missing conversationId
                {
                  title: 'No ID Conversation',
                  type: 'group'
                },
                // Invalid: not an object
                'string-not-object',
                // Valid conversation
                {
                  conversationId: 'conv-valid-2',
                  title: 'Another Valid',
                  type: 'direct',
                  lastMessageTimestamp: '2025-01-14T11:00:00Z',
                  messageCount: 5,
                  participantCount: 2
                }
              ]
            }
            if (key === 'activityTimeline') {
              return [
                // Valid activity
                {
                  type: 'message_sent',
                  conversationId: 'conv-1',
                  timestamp: '2025-01-14T09:00:00Z'
                },
                // Invalid: null
                null,
                // Invalid: missing conversationId
                {
                  type: 'message_sent',
                  timestamp: '2025-01-14T10:00:00Z'
                },
                // Valid activity
                {
                  type: 'conversation_joined',
                  conversationId: 'conv-2',
                  timestamp: '2025-01-14T08:00:00Z'
                }
              ]
            }
            return null
          }
        }
      ]
    } as any)

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`)
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should only include valid conversation objects with conversationId
    expect(data.conversations).toHaveLength(2)
    expect(data.conversations[0].conversationId).toBe('conv-valid')
    expect(data.conversations[1].conversationId).toBe('conv-valid-2')
    
    // Should only include valid activity objects with conversationId
    expect(data.activityTimeline).toHaveLength(2)
    expect(data.activityTimeline[0].conversationId).toBe('conv-1')
    expect(data.activityTimeline[1].conversationId).toBe('conv-2')
  })

  it('should handle non-Error exceptions in catch block', async () => {
    const mockUserId = 'user-123'
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock database error with non-Error object
    vi.mocked(neo4jLib.executeReadQuery).mockRejectedValue('String error')

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`)
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: 'Failed to fetch user details',
      details: 'Unknown error'
    })
    
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching user details:', 'String error')
    consoleSpy.mockRestore()
  })
})