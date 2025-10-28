import { GET } from '@/app/api/conversations/[id]/route'
import { executeReadQuery } from '@/lib/neo4j'
import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/neo4j', () => ({
  executeReadQuery: vi.fn()
}))

describe('GET /api/conversations/[id]', () => {
  let mockConsoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    mockConsoleError.mockRestore()
  })

  it('should return conversation details with participants', async () => {
    const mockConversation = {
      conversationId: 'conv-001',
      title: 'Project Discussion',
      type: 'group',
      priority: 'high',
      createdAt: '2024-01-15T10:00:00Z',
      tags: ['project', 'urgent'],
      participants: [
        {
          userId: 'user-001',
          name: 'Alice Johnson',
          email: 'alice@company.com',
          avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=alice',
          status: 'online'
        },
        {
          userId: 'user-002',
          name: 'Bob Smith',
          email: 'bob@company.com',
          avatarUrl: null,
          status: 'offline'
        }
      ]
    }

    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001')
    const params = { id: 'conv-001' }

    vi.mocked(executeReadQuery).mockResolvedValueOnce({
      records: [{
        get: () => mockConversation
      }]
    } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockConversation)
    expect(executeReadQuery).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (c:Conversation {conversationId: $conversationId})'),
      { conversationId: 'conv-001' }
    )
  })

  it('should return 404 when conversation not found', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/nonexistent')
    const params = { id: 'nonexistent' }

    vi.mocked(executeReadQuery).mockResolvedValueOnce({
      records: []
    } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'Conversation not found' })
  })

  it('should handle missing conversationId parameter', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/')
    const params = { id: '' }

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Conversation ID is required' })
    expect(executeReadQuery).not.toHaveBeenCalled()
  })

  it('should handle database query errors', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001')
    const params = { id: 'conv-001' }

    vi.mocked(executeReadQuery).mockRejectedValueOnce(new Error('Database connection failed'))

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch conversation', details: 'Database connection failed' })
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error fetching conversation:',
      expect.any(Error)
    )
  })

  it('should handle conversation with no participants', async () => {
    const mockConversation = {
      conversationId: 'conv-002',
      title: 'Empty Conversation',
      type: 'direct',
      priority: 'normal',
      createdAt: '2024-01-15T10:00:00Z',
      tags: [],
      participants: []
    }

    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-002')
    const params = { id: 'conv-002' }

    vi.mocked(executeReadQuery).mockResolvedValueOnce({
      records: [{
        get: () => mockConversation
      }]
    } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.participants).toEqual([])
  })

  it('should use proper Neo4j query with collect for participants', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-003')
    const params = { id: 'conv-003' }

    vi.mocked(executeReadQuery).mockResolvedValueOnce({
      records: [{
        get: () => ({
          conversationId: 'conv-003',
          title: 'Test',
          type: 'group',
          priority: 'low',
          createdAt: '2024-01-15T10:00:00Z',
          tags: [],
          participants: []
        })
      }]
    } as any)

    await GET(mockRequest, { params })

    const query = vi.mocked(executeReadQuery).mock.calls[0][0]
    expect(query).toContain('MATCH (c:Conversation {conversationId: $conversationId})')
    expect(query).toContain('OPTIONAL MATCH (u:User)-[:PARTICIPATES_IN]->(c)')
    expect(query).toContain('collect(DISTINCT u {')
    expect(query).toContain('userId: u.userId')
    expect(query).toContain('name: u.name')
    expect(query).toContain('email: u.email')
    expect(query).toContain('avatarUrl: u.avatarUrl')
    expect(query).toContain('status: u.status')
  })

  it('should handle database errors', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-error')
    const params = { id: 'conv-error' }

    // Mock executeReadQuery to throw an error
    vi.mocked(executeReadQuery).mockRejectedValueOnce(new Error('Database connection failed'))

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: 'Failed to fetch conversation',
      details: 'Database connection failed'
    })
  })

  it('should convert Neo4j DateTime objects to ISO strings', async () => {
    const mockConversation = {
      conversationId: 'conv-004',
      title: 'DateTime Test',
      type: 'group',
      priority: 'normal',
      // Mock Neo4j DateTime object structure
      createdAt: {
        year: 2024,
        month: 1,
        day: 15,
        hour: 10,
        minute: 30,
        second: 45,
        toString: () => '2024-01-15T10:30:45Z'
      },
      tags: [],
      participants: []
    }

    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-004')
    const params = { id: 'conv-004' }

    vi.mocked(executeReadQuery).mockResolvedValueOnce({
      records: [{
        get: () => mockConversation
      }]
    } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should convert DateTime object to string
    expect(data.createdAt).toBe('2024-01-15T10:30:45Z')
    expect(typeof data.createdAt).toBe('string')
  })
})