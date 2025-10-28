import { GET } from '@/app/api/conversations/[id]/messages/route'
import { executeReadQuery } from '@/lib/neo4j'
import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import neo4j from 'neo4j-driver'

vi.mock('@/lib/neo4j', () => ({
  executeReadQuery: vi.fn()
}))

vi.mock('neo4j-driver', () => ({
  default: {
    isDateTime: vi.fn(),
    int: vi.fn((n) => n)
  }
}))

describe('GET /api/conversations/[id]/messages', () => {
  let mockConsoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    mockConsoleError.mockRestore()
  })

  it('should return paginated messages for a conversation', async () => {
    const mockMessages = [
      {
        messageId: 'msg-001',
        content: 'Hello everyone!',
        senderId: 'user-001',
        timestamp: '2024-01-15T10:00:00Z',
        status: 'delivered',
        type: 'text',
        reactions: { '👍': 2, '❤️': 1 }
      },
      {
        messageId: 'msg-002',
        content: 'How is the project going?',
        senderId: 'user-002',
        timestamp: '2024-01-15T10:05:00Z',
        status: 'delivered',
        type: 'text',
        reactions: {}
      }
    ]

    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001/messages?page=1&limit=50')
    const params = { id: 'conv-001' }

    vi.mocked(executeReadQuery)
      .mockResolvedValueOnce({
        records: [{
          get: () => 150  // With disableLosslessIntegers: true, returns plain number
        }]
      } as any)
      .mockResolvedValueOnce({
        records: mockMessages.map(msg => ({
          get: () => msg
        }))
      } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      messages: mockMessages,
      pagination: {
        page: 1,
        limit: 50,
        total: 150,
        totalPages: 3
      }
    })

    expect(executeReadQuery).toHaveBeenCalledTimes(2)
    expect(executeReadQuery).toHaveBeenNthCalledWith(1,
      expect.stringContaining('MATCH (m:Message)-[:BELONGS_TO]->(c:Conversation {conversationId: $conversationId})'),
      { conversationId: 'conv-001' }
    )
    expect(executeReadQuery).toHaveBeenNthCalledWith(2,
      expect.stringContaining('ORDER BY m.timestamp ASC'),
      expect.objectContaining({ conversationId: 'conv-001' })
    )
  })

  it('should handle custom page and limit parameters', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001/messages?page=3&limit=20')
    const params = { id: 'conv-001' }

    vi.mocked(executeReadQuery)
      .mockResolvedValueOnce({
        records: [{
          get: () => 100  // With disableLosslessIntegers: true, returns plain number
        }]
      } as any)
      .mockResolvedValueOnce({
        records: []
      } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination).toEqual({
      page: 3,
      limit: 20,
      total: 100,
      totalPages: 5
    })

    expect(executeReadQuery).toHaveBeenNthCalledWith(2,
      expect.any(String),
      expect.objectContaining({ conversationId: 'conv-001' })
    )
  })

  it('should use default pagination when no parameters provided', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001/messages')
    const params = { id: 'conv-001' }

    vi.mocked(executeReadQuery)
      .mockResolvedValueOnce({
        records: [{
          get: () => ({ toNumber: () => 10 })
        }]
      } as any)
      .mockResolvedValueOnce({
        records: []
      } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.page).toBe(1)
    expect(data.pagination.limit).toBe(50)
  })

  it('should handle invalid page parameter', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001/messages?page=0')
    const params = { id: 'conv-001' }

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Invalid page number' })
  })

  it('should handle invalid limit parameter', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001/messages?limit=0')
    const params = { id: 'conv-001' }

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Invalid limit value' })
  })

  it('should cap limit at 100', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001/messages?limit=200')
    const params = { id: 'conv-001' }

    vi.mocked(executeReadQuery)
      .mockResolvedValueOnce({
        records: [{
          get: () => ({ toNumber: () => 10 })
        }]
      } as any)
      .mockResolvedValueOnce({
        records: []
      } as any)

    await GET(mockRequest, { params })

    expect(executeReadQuery).toHaveBeenNthCalledWith(2,
      expect.any(String),
      expect.objectContaining({ conversationId: 'conv-001' })
    )
  })

  it('should handle missing conversationId parameter', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations//messages')
    const params = { id: '' }

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Conversation ID is required' })
  })

  it('should handle database query errors', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001/messages')
    const params = { id: 'conv-001' }

    vi.mocked(executeReadQuery).mockRejectedValueOnce(new Error('Database connection failed'))

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch messages', details: 'Database connection failed' })
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error fetching messages:',
      expect.any(Error)
    )
  })

  it('should handle non-Error exceptions', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001/messages')
    const params = { id: 'conv-001' }

    // Reject with a non-Error value (string, object, etc.)
    vi.mocked(executeReadQuery).mockRejectedValueOnce('String error')

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch messages', details: 'Unknown error' })
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error fetching messages:',
      'String error'
    )
  })

  it('should return empty messages array when conversation has no messages', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-002/messages')
    const params = { id: 'conv-002' }

    vi.mocked(executeReadQuery)
      .mockResolvedValueOnce({
        records: [{
          get: () => 0  // With disableLosslessIntegers: true, returns plain number
        }]
      } as any)
      .mockResolvedValueOnce({
        records: []
      } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      messages: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      }
    })
  })

  it('should handle count result without toNumber method', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-003/messages')
    const params = { id: 'conv-003' }

    // Mock count query to return a plain number instead of Neo4j Integer
    vi.mocked(executeReadQuery)
      .mockResolvedValueOnce({
        records: [{
          get: () => 42 // Plain number without toNumber method
        }]
      } as any)
      .mockResolvedValueOnce({
        records: []
      } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.total).toBe(42)
    expect(data.pagination.totalPages).toBe(1)
  })

  it('should handle null/undefined count result', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-004/messages')
    const params = { id: 'conv-004' }

    // Mock count query to return null - this is a valid case that returns 0
    vi.mocked(executeReadQuery)
      .mockResolvedValueOnce({
        records: [{
          get: () => null
        }]
      } as any)
      .mockResolvedValueOnce({
        records: []
      } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.total).toBe(0)
    expect(data.pagination.totalPages).toBe(0)
  })

  it('should handle non-Neo4j integer count result', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-006/messages')
    const params = { id: 'conv-006' }

    // With disableLosslessIntegers: true, Neo4j returns plain numbers
    vi.mocked(executeReadQuery)
      .mockResolvedValueOnce({
        records: [{
          get: () => 25  // Plain number returned by driver
        }]
      } as any)
      .mockResolvedValueOnce({
        records: []  // Empty messages for this test
      } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.total).toBe(25)  // Number('25') = 25
    expect(data.pagination.totalPages).toBe(1)  // Math.ceil(25/50) = 1
  })

  it('should handle empty records from count query', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-005/messages')
    const params = { id: 'conv-005' }

    // Mock count query to return empty records - this will cause records[0] to be undefined
    vi.mocked(executeReadQuery)
      .mockResolvedValueOnce({
        records: []
      } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch messages')
  })

  it('should convert Neo4j DateTime objects to strings', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001/messages')
    const params = { id: 'conv-001' }

    // Create a mock Neo4j DateTime object
    const mockDateTime = {
      toString: () => '2024-01-15T16:30:00+01:00'
    }
    Object.defineProperty(mockDateTime, Symbol.toStringTag, { value: 'DateTime' })

    // Mock isDateTime to return true for our mock object
    vi.mocked(neo4j.isDateTime).mockReturnValue(true)

    const messageWithDateTime = {
      messageId: 'msg-001',
      content: 'Test message',
      senderId: 'user-001',
      timestamp: mockDateTime, // Neo4j DateTime object
      status: 'delivered',
      type: 'text',
      reactions: {}
    }

    vi.mocked(executeReadQuery)
      .mockResolvedValueOnce({
        records: [{
          get: () => ({ toNumber: () => 1 })
        }]
      } as any)
      .mockResolvedValueOnce({
        records: [{
          get: () => messageWithDateTime
        }]
      } as any)

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.messages).toHaveLength(1)
    expect(data.messages[0].timestamp).toBe('2024-01-15T16:30:00+01:00') // Should be converted to string
    expect(neo4j.isDateTime).toHaveBeenCalledWith(mockDateTime)
  })
})