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
import { getConversations } from '@/lib/neo4j'

describe('getConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClose.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Functionality', () => {
    it('returns conversations with default pagination', async () => {
      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'total' ? 50 : undefined
        }]
      })

      // Mock data query
      const mockConversations = [
        {
          conversationId: 'conv-1',
          title: 'Test Conversation 1',
          type: 'direct',
          priority: 'normal',
          lastMessageTimestamp: '2024-01-20T10:00:00Z',
          participantCount: 2,
          messageCount: 10,
        },
        {
          conversationId: 'conv-2',
          title: 'Test Conversation 2',
          type: 'group',
          priority: 'high',
          lastMessageTimestamp: '2024-01-19T10:00:00Z',
          participantCount: 5,
          messageCount: 25,
        },
      ]

      mockRun.mockResolvedValueOnce({
        records: mockConversations.map(conv => ({
          get: (key: string) => key === 'conversation' ? conv : undefined
        }))
      })

      const result = await getConversations({})

      // Verify count query
      expect(mockRun).toHaveBeenNthCalledWith(1, 
        'MATCH (c:Conversation) RETURN count(c) as total',
        {}
      )

      // Verify data query structure
      const dataQuery = mockRun.mock.calls[1][0]
      expect(dataQuery).toContain('MATCH (c:Conversation)')
      expect(dataQuery).toContain('ORDER BY c.lastMessageTimestamp DESC')
      expect(dataQuery).toContain('SKIP $skip')
      expect(dataQuery).toContain('LIMIT $limit')
      expect(dataQuery).toContain('participantCount: COUNT { (:User)-[:PARTICIPATES_IN]->(c) }')
      expect(dataQuery).toContain('messageCount: COUNT { (:Message)-[:BELONGS_TO]->(c) }')

      // Verify parameters (now plain numbers with disableLosslessIntegers: true)
      expect(mockRun).toHaveBeenNthCalledWith(2, 
        expect.any(String),
        expect.objectContaining({
          skip: 0,
          limit: 20
        })
      )

      // Verify result
      expect(result).toEqual({
        conversations: mockConversations,
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3
        }
      })

      // Verify session was closed
      expect(mockClose).toHaveBeenCalledTimes(2)
    })

    it('handles custom pagination parameters', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 100 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      const result = await getConversations({ page: 5, limit: 10 })

      // Verify skip calculation
      const params = mockRun.mock.calls[1][1]
      expect(params.skip).toBe(40) // (5-1) * 10
      expect(params.limit).toBe(10)

      expect(result.pagination).toEqual({
        page: 5,
        limit: 10,
        total: 100,
        totalPages: 10
      })
    })

    it('handles string input parameters', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 100 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      // Test string inputs
      const result = await getConversations({ page: '3', limit: '25' })

      // Verify string inputs are converted properly
      const params = mockRun.mock.calls[1][1]
      expect(params.skip).toBe(50) // (3-1) * 25
      expect(params.limit).toBe(25)

      expect(result.pagination).toEqual({
        page: 3,
        limit: 25,
        total: 100,
        totalPages: 4
      })
    })

    it('handles decimal string inputs', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 50 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      // Test decimal strings - parseInt will truncate to integers
      await getConversations({ page: '3.5', limit: '20.7' })

      const params = mockRun.mock.calls[1][1]
      expect(params.skip).toBe(40) // parseInt('3.5') = 3, so (3-1) * 20
      expect(params.limit).toBe(20) // parseInt('20.7') = 20
    })

    it('handles invalid string inputs', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 50 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      // Test invalid strings - should use default values
      await getConversations({ page: 'invalid', limit: 'abc' })

      const params = mockRun.mock.calls[1][1]
      expect(params.skip).toBe(0) // Should default to page 1
      expect(params.limit).toBe(20) // Should use default limit
    })

    it('enforces pagination limits', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 50 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      // Test max limit
      await getConversations({ limit: 200 })
      const maxLimitParams = mockRun.mock.calls[1][1]
      expect(maxLimitParams.limit).toBe(100) // Should cap at 100

      // Clear mocks for next test
      vi.clearAllMocks()
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 50 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      // Test min limit
      await getConversations({ limit: 0 })
      const minLimitParams = mockRun.mock.calls[1][1]
      expect(minLimitParams.limit).toBe(20) // Invalid limit defaults to 20
    })

    it('handles invalid page numbers', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 50 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      // Test negative page
      await getConversations({ page: -5 })
      const negativePageParams = mockRun.mock.calls[1][1]
      expect(negativePageParams.skip).toBe(0) // Should use page 1

      // Clear mocks
      vi.clearAllMocks()
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 50 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      // Test page 0
      await getConversations({ page: 0 })
      const zeroPageParams = mockRun.mock.calls[1][1]
      expect(zeroPageParams.skip).toBe(0) // Should use page 1
    })
  })

  describe('Neo4j Type Conversions', () => {
    it('handles Neo4j integer types correctly', async () => {
      // With disableLosslessIntegers: true, integers come as regular numbers
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 100 // Regular number, not Neo4j integer object
        }]
      })

      const mockRecord = {
        get: (key: string) => {
          if (key === 'conversation') {
            return {
              conversationId: 'conv-1',
              title: 'Test',
              type: 'direct',
              priority: 'normal',
              lastMessageTimestamp: '2024-01-20T10:00:00Z',
              participantCount: 5, // Regular number
              messageCount: 50, // Regular number
            }
          }
        }
      }

      mockRun.mockResolvedValueOnce({
        records: [mockRecord]
      })

      const result = await getConversations({})

      expect(result.conversations[0].participantCount).toBe(5)
      expect(result.conversations[0].messageCount).toBe(50)
      expect(result.pagination.total).toBe(100)
    })

    it('handles Neo4j DateTime types correctly', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 1 }]
      })

      const mockDateTime = {
        toString: () => '2024-01-20T10:00:00.000Z',
        _isDateTime: true
      }

      const mockRecord = {
        get: (key: string) => {
          if (key === 'conversation') {
            return {
              conversationId: 'conv-1',
              title: 'Test',
              type: 'direct',
              priority: 'normal',
              lastMessageTimestamp: mockDateTime,
              participantCount: 2,
              messageCount: 10,
            }
          }
        }
      }

      mockRun.mockResolvedValueOnce({
        records: [mockRecord]
      })

      vi.mocked(neo4j.isDateTime).mockReturnValueOnce(true)

      const result = await getConversations({})

      expect(result.conversations[0].lastMessageTimestamp).toBe('2024-01-20T10:00:00.000Z')
    })

    it('handles regular JavaScript numbers and strings', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 25 }] // Regular number
      })

      const mockRecord = {
        get: (key: string) => {
          if (key === 'conversation') {
            return {
              conversationId: 'conv-1',
              title: 'Test',
              type: 'direct',
              priority: 'normal',
              lastMessageTimestamp: '2024-01-20T10:00:00Z', // Regular string
              participantCount: 3, // Regular number
              messageCount: 15, // Regular number
            }
          }
        }
      }

      mockRun.mockResolvedValueOnce({
        records: [mockRecord]
      })

      const result = await getConversations({})

      expect(result.conversations[0].participantCount).toBe(3)
      expect(result.conversations[0].messageCount).toBe(15)
      expect(result.conversations[0].lastMessageTimestamp).toBe('2024-01-20T10:00:00Z')
      expect(result.pagination.total).toBe(25)
    })
  })

  describe('Error Handling', () => {
    it('handles count query failures gracefully', async () => {
      const error = new Error('Count query failed')
      mockRun.mockRejectedValueOnce(error)

      await expect(getConversations({})).rejects.toThrow('Database query failed: Count query failed')
      expect(mockClose).toHaveBeenCalled()
    })

    it('handles data query failures gracefully', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 50 }]
      })

      const error = new Error('Data query failed')
      mockRun.mockRejectedValueOnce(error)

      await expect(getConversations({})).rejects.toThrow('Database query failed: Data query failed')
      expect(mockClose).toHaveBeenCalledTimes(2) // Once for count, once for data
    })

    it('always closes sessions even on error', async () => {
      const error = new Error('Query failed')
      mockRun.mockRejectedValueOnce(error)

      try {
        await getConversations({})
      } catch (e) {
        // Expected error
      }

      expect(mockClose).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty conversation list', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 0 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      const result = await getConversations({})

      expect(result).toEqual({
        conversations: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      })
    })

    it('handles single page of results', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 10 }]
      })

      const mockConversations = Array.from({ length: 10 }, (_, i) => ({
        conversationId: `conv-${i}`,
        title: `Conversation ${i}`,
        type: 'direct',
        priority: 'normal',
        lastMessageTimestamp: `2024-01-${20 - i}T10:00:00Z`,
        participantCount: 2,
        messageCount: i * 5,
      }))

      mockRun.mockResolvedValueOnce({
        records: mockConversations.map(conv => ({
          get: (key: string) => key === 'conversation' ? conv : undefined
        }))
      })

      const result = await getConversations({ limit: 20 })

      expect(result.conversations).toHaveLength(10)
      expect(result.pagination.totalPages).toBe(1)
    })

    it('handles deep pagination correctly', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 30000 }] // Large dataset
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      const result = await getConversations({ page: 1500, limit: 20 })

      const params = mockRun.mock.calls[1][1]
      expect(params.skip).toBe(29980) // (1500-1) * 20
      expect(result.pagination.page).toBe(1500)
      expect(result.pagination.totalPages).toBe(1500)
    })

    it('handles non-numeric pagination parameters', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 50 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      // Test with undefined parameters
      const result = await getConversations({ page: undefined, limit: undefined })
      
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
    })
  })

  describe('Query Optimization', () => {
    it('uses optimized query pattern with pagination before aggregation', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 100 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      await getConversations({ page: 2, limit: 30 })

      const dataQuery = mockRun.mock.calls[1][0]
      
      // Verify query structure follows optimization pattern
      const queryLines = dataQuery.split('\n').map((line: string) => line.trim()).filter(Boolean)
      
      // Find key patterns in order
      const matchIndex = queryLines.findIndex((line: string) => line.includes('MATCH (c:Conversation)'))
      const orderByIndex = queryLines.findIndex((line: string) => line.includes('ORDER BY'))
      const skipIndex = queryLines.findIndex((line: string) => line.includes('SKIP'))
      const limitIndex = queryLines.findIndex((line: string) => line.includes('LIMIT'))
      const returnIndex = queryLines.findIndex((line: string) => line.includes('RETURN'))

      // Verify correct order: MATCH -> ORDER BY -> SKIP -> LIMIT -> RETURN
      expect(matchIndex).toBeLessThan(orderByIndex)
      expect(orderByIndex).toBeLessThan(skipIndex)
      expect(skipIndex).toBeLessThan(limitIndex)
      expect(limitIndex).toBeLessThan(returnIndex)

      // Verify counts are calculated after pagination
      expect(dataQuery).toContain('participantCount: COUNT { (:User)-[:PARTICIPATES_IN]->(c) }')
      expect(dataQuery).toContain('messageCount: COUNT { (:Message)-[:BELONGS_TO]->(c) }')
    })

    it('does not use OPTIONAL MATCH pattern', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 50 }]
      })
      mockRun.mockResolvedValueOnce({ records: [] })

      await getConversations({})

      const dataQuery = mockRun.mock.calls[1][0]
      
      // Verify the query does NOT use OPTIONAL MATCH
      expect(dataQuery).not.toContain('OPTIONAL MATCH')
      
      // Verify it uses COUNT {} pattern instead
      expect(dataQuery).toContain('COUNT {')
    })
  })
})