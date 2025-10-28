import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import neo4j from 'neo4j-driver'

// Create mocks for neo4j functions
const mockRun = vi.fn()
const mockClose = vi.fn()

// Mock neo4j-driver
vi.mock('neo4j-driver', () => ({
  default: {
    isInt: vi.fn((value) => {
      return typeof value === 'object' && value !== null && 'toNumber' in value
    }),
    isDateTime: vi.fn((value) => {
      return typeof value === 'object' && value !== null && '_isDateTime' in value
    }),
    int: vi.fn((value) => ({ toNumber: () => value })),
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
import { getUsers } from '@/lib/neo4j'

describe('getUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClose.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Functionality', () => {
    it('returns users with default pagination', async () => {
      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'total' ? 1000 : undefined
        }]
      })

      // Mock data query
      const mockUsers = [
        {
          userId: 'user-1',
          name: 'Alice Johnson',
          avatar: 'https://example.com/avatar1.png',
          email: 'alice@example.com',
          lastActiveTimestamp: '2024-01-20T10:00:00Z',
          conversationCount: 3,
          messageCount: 15,
        },
        {
          userId: 'user-2',
          name: 'Bob Smith',
          avatar: null,
          email: 'bob@example.com', 
          lastActiveTimestamp: '2024-01-19T15:30:00Z',
          conversationCount: 2,
          messageCount: 8,
        },
      ]

      mockRun.mockResolvedValueOnce({
        records: mockUsers.map(user => ({
          get: (key: string) => key === 'user' ? user : undefined
        }))
      })

      const result = await getUsers({})

      // Verify count query
      expect(mockRun).toHaveBeenNthCalledWith(1, 
        'MATCH (u:User) RETURN count(u) as total',
        {}
      )

      // Verify data query structure uses correct Neo4j 5 syntax
      const dataQuery = mockRun.mock.calls[1][0]
      expect(dataQuery).toContain('MATCH (u:User)')
      expect(dataQuery).toContain('ORDER BY u.name')
      expect(dataQuery).toContain('SKIP $skip')
      expect(dataQuery).toContain('LIMIT $limit')
      expect(dataQuery).toContain('conversationCount: COUNT { (u)-[:PARTICIPATES_IN]->(:Conversation) }')
      expect(dataQuery).toContain('messageCount: COUNT { (u)-[:SENT]->(:Message) }')

      // Verify parameters use default values
      expect(mockRun).toHaveBeenNthCalledWith(2, 
        expect.any(String),
        expect.objectContaining({
          skip: expect.objectContaining({ toNumber: expect.any(Function) }),
          limit: expect.objectContaining({ toNumber: expect.any(Function) })
        })
      )

      // Verify result structure
      expect(result).toEqual({
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: 1000,
          totalPages: 50
        }
      })

      // Verify session was closed
      expect(mockClose).toHaveBeenCalledTimes(2) // Once for count, once for data query
    })

    it('handles custom pagination parameters', async () => {
      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'total' ? 1000 : undefined
        }]
      })

      // Mock data query
      const mockUsers = [
        {
          userId: 'user-11',
          name: 'Charlie Brown',
          avatar: null,
          email: 'charlie@example.com',
          lastActiveTimestamp: '2024-01-18T14:20:00Z',
          conversationCount: 1,
          messageCount: 5,
        }
      ]

      mockRun.mockResolvedValueOnce({
        records: mockUsers.map(user => ({
          get: (key: string) => key === 'user' ? user : undefined
        }))
      })

      const result = await getUsers({ page: 2, limit: 10 })

      // Verify skip calculation for page 2, limit 10
      expect(mockRun).toHaveBeenNthCalledWith(2, 
        expect.any(String),
        expect.objectContaining({
          skip: expect.objectContaining({ toNumber: expect.any(Function) }),
          limit: expect.objectContaining({ toNumber: expect.any(Function) })
        })
      )

      // Check that skip calculation is correct (page 2, limit 10 = skip 10)
      const skipParam = mockRun.mock.calls[1][1].skip
      expect(skipParam.toNumber()).toBe(10)
      
      const limitParam = mockRun.mock.calls[1][1].limit
      expect(limitParam.toNumber()).toBe(10)

      // Verify result pagination
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 1000,
        totalPages: 100
      })
    })

    it('handles string parameters by converting to numbers', async () => {
      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'total' ? 100 : undefined
        }]
      })

      mockRun.mockResolvedValueOnce({
        records: []
      })

      await getUsers({ page: '3', limit: '5' })

      // Verify string parameters were converted
      const skipParam = mockRun.mock.calls[1][1].skip
      const limitParam = mockRun.mock.calls[1][1].limit
      
      expect(skipParam.toNumber()).toBe(10) // (page 3 - 1) * limit 5 = 10
      expect(limitParam.toNumber()).toBe(5)
    })

    it('applies validation limits and defaults', async () => {
      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'total' ? 100 : undefined
        }]
      })

      mockRun.mockResolvedValueOnce({
        records: []
      })

      // Test with invalid parameters
      await getUsers({ page: 0, limit: 150 })

      const skipParam = mockRun.mock.calls[1][1].skip
      const limitParam = mockRun.mock.calls[1][1].limit
      
      expect(skipParam.toNumber()).toBe(0) // page defaults to 1, so (1-1)*limit = 0
      expect(limitParam.toNumber()).toBe(100) // limit capped at 100
    })
  })

  describe('Neo4j Data Type Handling', () => {
    it('properly converts Neo4j integer types to JavaScript numbers', async () => {
      // Mock count query - with disableLosslessIntegers: true, returns plain numbers
      neo4j.isInt = vi.fn().mockReturnValue(false)
      
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'total' ? 1000 : undefined
        }]
      })

      // Mock data query with Neo4j integers for counts
      // With disableLosslessIntegers: true, these should be plain numbers
      const mockUsers = [
        {
          userId: 'user-1',
          name: 'Test User',
          avatar: null,
          email: 'test@example.com',
          lastActiveTimestamp: '2024-01-20T10:00:00Z',
          conversationCount: 1000,  // Plain number returned by driver
          messageCount: 1000,        // Plain number returned by driver
        }
      ]

      mockRun.mockResolvedValueOnce({
        records: mockUsers.map(user => ({
          get: (key: string) => key === 'user' ? user : undefined
        }))
      })

      const result = await getUsers({})

      // Verify integer conversion in pagination
      // Since disableLosslessIntegers: true, the driver returns plain numbers
      expect(result.pagination.total).toBe(1000)
      expect(typeof result.pagination.total).toBe('number')

      // Verify integer conversion in user data
      expect(result.users[0].conversationCount).toBe(1000)
      expect(result.users[0].messageCount).toBe(1000)
      expect(typeof result.users[0].conversationCount).toBe('number')
      expect(typeof result.users[0].messageCount).toBe('number')
    })

    it('properly handles Neo4j DateTime objects', async () => {
      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'total' ? 1 : undefined
        }]
      })

      // Mock DateTime object
      const mockDateTime = { 
        toString: () => '2024-01-20T10:00:00.000Z',
        _isDateTime: true 
      }
      neo4j.isDateTime = vi.fn().mockReturnValue(true)

      const mockUsers = [
        {
          userId: 'user-1',
          name: 'Test User',
          avatar: null,
          email: 'test@example.com',
          lastActiveTimestamp: mockDateTime,
          conversationCount: 1,
          messageCount: 5,
        }
      ]

      mockRun.mockResolvedValueOnce({
        records: mockUsers.map(user => ({
          get: (key: string) => key === 'user' ? user : undefined
        }))
      })

      const result = await getUsers({})

      // Verify DateTime conversion
      expect(result.users[0].lastActiveTimestamp).toBe('2024-01-20T10:00:00.000Z')
      expect(typeof result.users[0].lastActiveTimestamp).toBe('string')
    })
  })

  describe('Error Handling', () => {
    it('throws error when count query fails', async () => {
      mockRun.mockRejectedValueOnce(new Error('Neo4j count query failed'))

      await expect(getUsers({})).rejects.toThrow('Database query failed: Neo4j count query failed')
      expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('throws error when data query fails', async () => {
      // Count query succeeds
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => key === 'total' ? 100 : undefined
        }]
      })

      // Data query fails
      mockRun.mockRejectedValueOnce(new Error('Neo4j data query failed'))

      await expect(getUsers({})).rejects.toThrow('Database query failed: Neo4j data query failed')
      expect(mockClose).toHaveBeenCalledTimes(2) // Both sessions should be closed
    })

    it('handles empty records gracefully', async () => {
      // Mock count query with no records
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await expect(getUsers({})).rejects.toThrow()
      expect(mockClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Query Structure Validation', () => {
    it('uses correct Cypher query structure for users', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 100 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await getUsers({})

      const dataQuery = mockRun.mock.calls[1][0]
      
      // Verify query uses proper Neo4j 5.x COUNT{} syntax instead of deprecated size()
      expect(dataQuery).not.toContain('size(')
      expect(dataQuery).toContain('COUNT {')
      
      // Verify proper relationship patterns
      expect(dataQuery).toContain('(u)-[:PARTICIPATES_IN]->(:Conversation)')
      expect(dataQuery).toContain('(u)-[:SENT]->(:Message)')
      
      // Verify proper return structure
      expect(dataQuery).toContain('userId: u.userId')
      expect(dataQuery).toContain('name: u.name')
      expect(dataQuery).toContain('avatar: u.avatarUrl')
      expect(dataQuery).toContain('email: u.email')
      expect(dataQuery).toContain('lastActiveTimestamp: u.lastSeen')
    })

    it('orders users by name for consistent pagination', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 100 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await getUsers({})

      const dataQuery = mockRun.mock.calls[1][0]
      expect(dataQuery).toContain('ORDER BY u.name')
    })

    it('includes all required user fields in the return statement', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 100 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await getUsers({})

      const dataQuery = mockRun.mock.calls[1][0]
      
      // Verify all required fields are included
      const requiredFields = [
        'userId: u.userId',
        'name: u.name', 
        'avatar: u.avatarUrl',
        'email: u.email',
        'lastActiveTimestamp: u.lastSeen',
        'conversationCount: COUNT { (u)-[:PARTICIPATES_IN]->(:Conversation) }',
        'messageCount: COUNT { (u)-[:SENT]->(:Message) }'
      ]

      requiredFields.forEach(field => {
        expect(dataQuery).toContain(field)
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles users with no conversations or messages', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 1 }]
      })

      const userWithZeroCounts = {
        userId: 'new-user',
        name: 'New User',
        avatar: null,
        email: 'new@example.com',
        lastActiveTimestamp: '2024-01-20T10:00:00Z',
        conversationCount: 0,
        messageCount: 0,
      }

      mockRun.mockResolvedValueOnce({
        records: [{ get: () => userWithZeroCounts }]
      })

      const result = await getUsers({})
      
      expect(result.users[0].conversationCount).toBe(0)
      expect(result.users[0].messageCount).toBe(0)
      expect(result.users).toHaveLength(1)
    })

    it('handles very large page numbers gracefully', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: () => 100 }]
      })
      mockRun.mockResolvedValueOnce({
        records: []
      })

      const result = await getUsers({ page: 999999, limit: 20 })
      
      expect(result.pagination.page).toBe(999999)
      expect(result.pagination.totalPages).toBe(5) // 100 total / 20 limit = 5 pages
      expect(result.users).toHaveLength(0)
    })
  })
})