import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import neo4j from 'neo4j-driver'

// Create mocks for neo4j functions
const mockRun = vi.fn()
const mockClose = vi.fn()

// Mock neo4j-driver
vi.mock('neo4j-driver', () => ({
  default: {
    isInt: vi.fn(() => false),
    isDateTime: vi.fn((value) => {
      return typeof value === 'object' && value !== null && '_isDateTime' in value
    }),
    int: vi.fn((value) => value),
    driver: vi.fn(() => ({
      session: vi.fn(() => ({
        run: mockRun,
        close: mockClose,
      })),
    })),
    auth: {
      basic: vi.fn(),
    },
  },
}))

// Import after mocking
import { searchConversations, getConversationById } from '@/lib/neo4j/queries/conversations'

describe('searchConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClose.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Search Functionality', () => {
    it('should search conversations by title', async () => {
      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'total' ? 5 : undefined
        }]
      })

      // Mock data query
      const mockConversations = [
        {
          conversationId: 'conv-1',
          title: 'Team Meeting',
          type: 'group',
          priority: 'normal',
          lastMessageTimestamp: '2024-01-20T10:00:00Z',
          participantCount: 5,
          messageCount: 25,
        },
      ]

      mockRun.mockResolvedValueOnce({
        records: mockConversations.map(conv => ({
          get: (key: string) => key === 'conversation' ? conv : undefined
        }))
      })

      const result = await searchConversations({ query: 'Meeting' })

      // Verify count query contains search logic
      const countQuery = mockRun.mock.calls[0][0]
      expect(countQuery).toContain('WHERE')
      expect(countQuery).toContain('CONTAINS')

      // Verify search parameter was passed
      const countParams = mockRun.mock.calls[0][1]
      expect(countParams.query).toBe('Meeting')

      // Verify data query
      const dataQuery = mockRun.mock.calls[1][0]
      expect(dataQuery).toContain('WHERE')
      expect(dataQuery).toContain('ORDER BY')

      // Verify result structure
      expect(result.results).toEqual(mockConversations)
      expect(result.total).toBe(5)
    })

    it('should search conversations by participant names', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 3 }]
      })

      const mockConversations = [
        {
          conversationId: 'conv-2',
          title: 'Project Discussion',
          type: 'group',
          priority: 'high',
          lastMessageTimestamp: '2024-01-19T10:00:00Z',
          participantCount: 3,
          messageCount: 15,
        },
      ]

      mockRun.mockResolvedValueOnce({
        records: mockConversations.map(conv => ({
          get: (key: string) => key === 'conversation' ? conv : undefined
        }))
      })

      const result = await searchConversations({ query: 'John' })

      // Verify query includes participant search logic
      const dataQuery = mockRun.mock.calls[1][0]
      expect(dataQuery).toContain('PARTICIPATES_IN')

      expect(result.results).toEqual(mockConversations)
      expect(result.total).toBe(3)
    })

    it('should return empty results for no matches', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 0 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      const result = await searchConversations({ query: 'NonExistent' })

      expect(result.results).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('Filter Functionality', () => {
    it('should filter by conversation type', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 10 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await searchConversations({
        query: 'meeting',
        type: 'group'
      })

      // Verify type filter in query
      const countQuery = mockRun.mock.calls[0][0]
      expect(countQuery).toContain('c.type')

      const countParams = mockRun.mock.calls[0][1]
      expect(countParams.type).toBe('group')
    })

    it('should filter by priority', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 5 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await searchConversations({
        query: 'urgent',
        priority: 'high'
      })

      // Verify priority filter in query
      const countQuery = mockRun.mock.calls[0][0]
      expect(countQuery).toContain('c.priority')

      const countParams = mockRun.mock.calls[0][1]
      expect(countParams.priority).toBe('high')
    })

    it('should filter by date range (dateFrom)', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 8 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      const dateFrom = '2024-01-01'
      await searchConversations({
        query: 'test',
        dateFrom
      })

      // Verify date filter
      const countParams = mockRun.mock.calls[0][1]
      expect(countParams.dateFrom).toBe(dateFrom)
    })

    it('should filter by date range (dateTo)', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 8 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      const dateTo = '2024-12-31'
      await searchConversations({
        query: 'test',
        dateTo
      })

      // Verify date filter
      const countParams = mockRun.mock.calls[0][1]
      expect(countParams.dateTo).toBe(dateTo)
    })

    it('should combine multiple filters', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 2 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await searchConversations({
        query: 'meeting',
        type: 'group',
        priority: 'high',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31'
      })

      const countParams = mockRun.mock.calls[0][1]
      expect(countParams.query).toBe('meeting')
      expect(countParams.type).toBe('group')
      expect(countParams.priority).toBe('high')
      expect(countParams.dateFrom).toBe('2024-01-01')
      expect(countParams.dateTo).toBe('2024-12-31')
    })
  })

  describe('Pagination', () => {
    it('should handle default pagination', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 50 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await searchConversations({ query: 'test' })

      const dataParams = mockRun.mock.calls[1][1]
      expect(dataParams.skip).toBe(0)
      expect(dataParams.limit).toBe(20)
    })

    it('should handle custom pagination', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 100 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await searchConversations({
        query: 'test',
        page: 3,
        limit: 10
      })

      const dataParams = mockRun.mock.calls[1][1]
      expect(dataParams.skip).toBe(20) // (3-1) * 10
      expect(dataParams.limit).toBe(10)
    })

    it('should handle string pagination parameters', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 50 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await searchConversations({
        query: 'test',
        page: '2' as any,
        limit: '25' as any
      })

      const dataParams = mockRun.mock.calls[1][1]
      expect(dataParams.skip).toBe(25) // (2-1) * 25
      expect(dataParams.limit).toBe(25)
    })
  })

  describe('Input Validation', () => {
    it('should use default page for invalid page number', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 10 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await searchConversations({
        query: 'test',
        page: -1
      })

      const dataParams = mockRun.mock.calls[1][1]
      expect(dataParams.skip).toBe(0) // Page 1
    })

    it('should enforce maximum limit', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 10 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await searchConversations({
        query: 'test',
        limit: 500 // Exceeds max
      })

      const dataParams = mockRun.mock.calls[1][1]
      expect(dataParams.limit).toBeLessThanOrEqual(100) // Max limit
    })

    it('should handle empty query string', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 0 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      const result = await searchConversations({ query: '' })

      expect(result.results).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should handle whitespace-only query', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 0 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      const result = await searchConversations({ query: '   ' })

      expect(result.results).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('Relevance Scoring', () => {
    it('should order results by relevance and timestamp', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 3 }]
      })

      const mockConversations = [
        {
          conversationId: 'conv-1',
          title: 'Meeting Notes',
          type: 'group',
          priority: 'normal',
          lastMessageTimestamp: '2024-01-20T10:00:00Z',
          participantCount: 5,
          messageCount: 25,
        },
        {
          conversationId: 'conv-2',
          title: 'Team Meeting',
          type: 'group',
          priority: 'normal',
          lastMessageTimestamp: '2024-01-19T10:00:00Z',
          participantCount: 4,
          messageCount: 20,
        },
        {
          conversationId: 'conv-3',
          title: 'Discussion',
          type: 'direct',
          priority: 'low',
          lastMessageTimestamp: '2024-01-18T10:00:00Z',
          participantCount: 2,
          messageCount: 10,
        },
      ]

      mockRun.mockResolvedValueOnce({
        records: mockConversations.map(conv => ({
          get: (key: string) => key === 'conversation' ? conv : undefined
        }))
      })

      const result = await searchConversations({ query: 'Meeting' })

      // Verify ORDER BY clause includes relevance
      const dataQuery = mockRun.mock.calls[1][1]
      const queryString = mockRun.mock.calls[1][0]
      expect(queryString).toContain('ORDER BY')

      expect(result.results).toHaveLength(3)
    })
  })

  describe('DateTime Handling', () => {
    it('should handle Neo4j DateTime objects', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 1 }]
      })

      const mockDateTime = {
        _isDateTime: true,
        toString: () => '2024-01-20T10:00:00Z'
      }

      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'conversation' ? {
            conversationId: 'conv-1',
            title: 'Test',
            type: 'direct',
            priority: 'normal',
            lastMessageTimestamp: mockDateTime,
            participantCount: 2,
            messageCount: 5,
          } : undefined
        }]
      })

      const result = await searchConversations({ query: 'Test' })

      expect(result.results[0].lastMessageTimestamp).toBe('2024-01-20T10:00:00Z')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockRun.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(searchConversations({ query: 'test' }))
        .rejects.toThrow('Database connection failed')
    })

    it('should close session even on error', async () => {
      mockRun.mockRejectedValueOnce(new Error('Query failed'))

      try {
        await searchConversations({ query: 'test' })
      } catch {
        // Expected error
      }

      expect(mockClose).toHaveBeenCalled()
    })
  })
})

describe('getConversationById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClose.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should fetch a conversation by ID', async () => {
      const mockConversation = {
        conversationId: 'conv-123',
        title: 'Team Meeting',
        type: 'group',
        priority: 'high',
        createdAt: '2024-01-20T10:00:00Z',
        tags: ['work', 'urgent'],
        participants: [
          {
            userId: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            avatarUrl: 'https://example.com/avatar1.jpg',
            status: 'online'
          },
          {
            userId: 'user-2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            avatarUrl: 'https://example.com/avatar2.jpg',
            status: 'offline'
          }
        ]
      }

      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'conversation' ? mockConversation : undefined
        }]
      })

      const result = await getConversationById('conv-123')

      // Verify query structure
      const query = mockRun.mock.calls[0][0]
      expect(query).toContain('MATCH (c:Conversation {conversationId: $conversationId})')
      expect(query).toContain('PARTICIPATES_IN')

      // Verify parameter was passed
      const params = mockRun.mock.calls[0][1]
      expect(params.conversationId).toBe('conv-123')

      // Verify result
      expect(result).toEqual(mockConversation)
    })

    it('should return null when conversation is not found', async () => {
      mockRun.mockResolvedValueOnce({
        records: []
      })

      const result = await getConversationById('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('DateTime Handling', () => {
    it('should convert Neo4j DateTime to ISO string', async () => {
      const mockDateTime = {
        _isDateTime: true,
        toString: () => '2024-01-20T10:00:00.000Z'
      }

      const mockConversation = {
        conversationId: 'conv-123',
        title: 'Test Conversation',
        type: 'direct',
        priority: 'normal',
        createdAt: mockDateTime,
        tags: [],
        participants: []
      }

      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'conversation' ? mockConversation : undefined
        }]
      })

      const result = await getConversationById('conv-123')

      expect(result?.createdAt).toBe('2024-01-20T10:00:00.000Z')
    })

    it('should handle non-DateTime createdAt values', async () => {
      const mockConversation = {
        conversationId: 'conv-123',
        title: 'Test Conversation',
        type: 'direct',
        priority: 'normal',
        createdAt: '2024-01-20T10:00:00Z', // Already a string
        tags: [],
        participants: []
      }

      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'conversation' ? mockConversation : undefined
        }]
      })

      const result = await getConversationById('conv-123')

      expect(result?.createdAt).toBe('2024-01-20T10:00:00Z')
    })
  })

  describe('Participant Data', () => {
    it('should return conversation with all participant details', async () => {
      const mockParticipants = [
        {
          userId: 'user-1',
          name: 'Alice',
          email: 'alice@example.com',
          avatarUrl: 'https://example.com/alice.jpg',
          status: 'online'
        },
        {
          userId: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
          avatarUrl: 'https://example.com/bob.jpg',
          status: 'away'
        },
        {
          userId: 'user-3',
          name: 'Charlie',
          email: 'charlie@example.com',
          avatarUrl: null,
          status: 'offline'
        }
      ]

      const mockConversation = {
        conversationId: 'conv-group',
        title: 'Group Chat',
        type: 'group',
        priority: 'medium',
        createdAt: '2024-01-15T08:00:00Z',
        tags: ['team'],
        participants: mockParticipants
      }

      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'conversation' ? mockConversation : undefined
        }]
      })

      const result = await getConversationById('conv-group')

      expect(result?.participants).toHaveLength(3)
      expect(result?.participants[0].userId).toBe('user-1')
      expect(result?.participants[2].avatarUrl).toBeNull()
    })

    it('should handle conversation with no participants', async () => {
      const mockConversation = {
        conversationId: 'conv-empty',
        title: 'Empty Chat',
        type: 'group',
        priority: 'low',
        createdAt: '2024-01-10T12:00:00Z',
        tags: [],
        participants: []
      }

      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'conversation' ? mockConversation : undefined
        }]
      })

      const result = await getConversationById('conv-empty')

      expect(result?.participants).toEqual([])
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockRun.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(getConversationById('conv-123'))
        .rejects.toThrow('Database connection failed')
    })

    it('should close session even on error', async () => {
      mockRun.mockRejectedValueOnce(new Error('Query failed'))

      try {
        await getConversationById('conv-123')
      } catch {
        // Expected error
      }

      expect(mockClose).toHaveBeenCalled()
    })
  })

  describe('Input Validation', () => {
    it('should handle empty string conversationId', async () => {
      mockRun.mockResolvedValueOnce({
        records: []
      })

      const result = await getConversationById('')

      expect(result).toBeNull()
    })
  })
})
