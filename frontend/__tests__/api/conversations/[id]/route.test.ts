import { GET } from '@/app/api/conversations/[id]/route'
import { getConversationById } from '@/lib/neo4j/queries/conversations'
import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/neo4j/queries/conversations', () => ({
  getConversationById: vi.fn()
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

    vi.mocked(getConversationById).mockResolvedValueOnce(mockConversation)

    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001')
    const params = Promise.resolve({ id: 'conv-001' })

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockConversation)
    expect(getConversationById).toHaveBeenCalledWith('conv-001')
  })

  it('should return 404 when conversation not found', async () => {
    vi.mocked(getConversationById).mockResolvedValueOnce(null)

    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/nonexistent')
    const params = Promise.resolve({ id: 'nonexistent' })

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'Conversation not found' })
  })

  it('should handle missing conversationId parameter', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/')
    const params = Promise.resolve({ id: '' })

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Conversation ID is required' })
    expect(getConversationById).not.toHaveBeenCalled()
  })

  it('should handle database query errors', async () => {
    vi.mocked(getConversationById).mockRejectedValueOnce(new Error('Database connection failed'))

    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-001')
    const params = Promise.resolve({ id: 'conv-001' })

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

    vi.mocked(getConversationById).mockResolvedValueOnce(mockConversation)

    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-002')
    const params = Promise.resolve({ id: 'conv-002' })

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.participants).toEqual([])
  })

  it('should call getConversationById with correct ID', async () => {
    const mockConversation = {
      conversationId: 'conv-003',
      title: 'Test',
      type: 'group',
      priority: 'low',
      createdAt: '2024-01-15T10:00:00Z',
      tags: [],
      participants: []
    }

    vi.mocked(getConversationById).mockResolvedValueOnce(mockConversation)

    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-003')
    const params = Promise.resolve({ id: 'conv-003' })

    await GET(mockRequest, { params })

    expect(getConversationById).toHaveBeenCalledWith('conv-003')
  })

  it('should handle database errors', async () => {
    vi.mocked(getConversationById).mockRejectedValueOnce(new Error('Database connection failed'))

    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-error')
    const params = Promise.resolve({ id: 'conv-error' })

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: 'Failed to fetch conversation',
      details: 'Database connection failed'
    })
  })

  it('should return conversation data directly from getConversationById', async () => {
    const mockConversation = {
      conversationId: 'conv-004',
      title: 'DateTime Test',
      type: 'group',
      priority: 'normal',
      createdAt: '2024-01-15T10:30:45Z',
      tags: [],
      participants: []
    }

    vi.mocked(getConversationById).mockResolvedValueOnce(mockConversation)

    const mockRequest = new NextRequest('http://localhost:3000/api/conversations/conv-004')
    const params = Promise.resolve({ id: 'conv-004' })

    const response = await GET(mockRequest, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    // getConversationById handles DateTime conversion internally
    expect(data.createdAt).toBe('2024-01-15T10:30:45Z')
    expect(typeof data.createdAt).toBe('string')
  })
})
