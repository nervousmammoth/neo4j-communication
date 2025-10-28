import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import neo4j from 'neo4j-driver'

// Restore the actual implementation for this test file
vi.unmock('@/lib/neo4j')

import {
  getDriver,
  getSession,
  closeDriver,
  executeReadQuery,
  testConnection,
  resetDriver,
  convertNeo4jIntegers,
  formatDateTime,
  searchUsers,
  getUserContacts,
} from '@/lib/neo4j'

// Create mock functions that we can control
const mockRun = vi.fn()
const mockClose = vi.fn()
const mockDriverClose = vi.fn()
const mockSessionFn = vi.fn()

// Mock the neo4j-driver module
vi.mock('neo4j-driver', () => {
  return {
    default: {
      driver: vi.fn(() => ({
        session: mockSessionFn,
        close: mockDriverClose,
      })),
      auth: {
        basic: vi.fn((user, password) => ({ user, password })),
      },
      isDateTime: vi.fn(),
      int: vi.fn((value) => value), // Mock neo4j.int to return the value as-is
    },
  }
})

describe('Neo4j Driver Management', () => {
  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Reset mock implementations
    mockRun.mockReset()
    mockClose.mockReset()
    mockDriverClose.mockReset()
    mockSessionFn.mockReset()
    
    // Setup default mock behavior - mockRun should return a result by default
    mockRun.mockResolvedValue({ records: [] })
    mockClose.mockResolvedValue(undefined)
    mockDriverClose.mockResolvedValue(undefined)
    mockSessionFn.mockReturnValue({
      run: mockRun,
      close: mockClose,
    })
    
    // Reset the driver singleton
    resetDriver()
  })

  afterEach(async () => {
    // Clean up after each test
    resetDriver()
  })

  describe('getDriver', () => {
    it('creates a new driver instance when called for the first time', () => {
      const driver = getDriver()

      expect(neo4j.driver).toHaveBeenCalledWith(
        'bolt://localhost:7687',
        expect.objectContaining({
          user: 'neo4j',
          password: 'test-password', // From vitest.setup.ts
        }),
        expect.objectContaining({
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 30000,
          connectionTimeout: 30000,
        })
      )
      expect(driver).toBeDefined()
    })

    it('returns the same driver instance on subsequent calls', () => {
      const driver1 = getDriver()
      const driver2 = getDriver()

      expect(driver1).toBe(driver2)
      expect(neo4j.driver).toHaveBeenCalledTimes(1)
    })

    it('uses environment variables for configuration', () => {
      // Note: The Neo4j configuration is read at module load time,
      // so we can only verify that the driver is created with the
      // environment variables that were set when the module was loaded
      getDriver()

      expect(neo4j.driver).toHaveBeenCalledWith(
        'bolt://localhost:7687', // From vitest.setup.ts
        expect.objectContaining({
          user: 'neo4j',
          password: 'test-password',
        }),
        expect.any(Object)
      )
    })
  })

  describe('getSession', () => {
    it('creates a new session from the driver', () => {
      const session = getSession()

      expect(mockSessionFn).toHaveBeenCalledTimes(1)
      expect(session).toHaveProperty('run')
      expect(session).toHaveProperty('close')
    })

    it('creates a new session each time it is called', () => {
      const session1 = getSession()
      const session2 = getSession()

      expect(mockSessionFn).toHaveBeenCalledTimes(2)
      // Both sessions have the same structure in our mock
      expect(session1).toHaveProperty('run')
      expect(session2).toHaveProperty('run')
    })
  })

  describe('closeDriver', () => {
    it('closes the driver and resets the singleton', async () => {
      // Create a driver first
      const driver = getDriver()
      expect(driver).toBeDefined()

      // Close the driver
      await closeDriver()

      expect(mockDriverClose).toHaveBeenCalledTimes(1)

      // Verify that a new driver is created on next call
      vi.clearAllMocks()
      const newDriver = getDriver()
      expect(neo4j.driver).toHaveBeenCalledTimes(1)
    })

    it('handles multiple close calls gracefully', async () => {
      // First close - no driver exists
      await closeDriver()
      expect(mockDriverClose).not.toHaveBeenCalled()
      
      // Create a driver
      getDriver()
      
      // Close it
      await closeDriver()
      expect(mockDriverClose).toHaveBeenCalledTimes(1)
      
      // Close again - should not throw
      await closeDriver()
      expect(mockDriverClose).toHaveBeenCalledTimes(1) // Still only once
    })

    it('allows driver recreation after closing', async () => {
      getDriver()
      await closeDriver()
      
      vi.clearAllMocks()
      const newDriver = getDriver()

      expect(neo4j.driver).toHaveBeenCalledTimes(1)
      expect(newDriver).toBeDefined()
    })
  })

  describe('executeReadQuery', () => {
    it('executes a query and returns mapped results', async () => {
      const mockRecords = [
        { toObject: () => ({ id: 1, name: 'Test 1' }) },
        { toObject: () => ({ id: 2, name: 'Test 2' }) },
      ]

      const mockResult = {
        records: mockRecords,
      }

      mockRun.mockResolvedValueOnce(mockResult)

      const result = await executeReadQuery(
        'MATCH (n) RETURN n',
        { limit: 10 }
      )

      expect(mockRun).toHaveBeenCalledWith(
        'MATCH (n) RETURN n',
        { limit: 10 }
      )
      expect(mockClose).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })

    it('handles empty result sets', async () => {
      const mockResult = {
        records: [],
      }

      mockRun.mockResolvedValueOnce(mockResult)

      const result = await executeReadQuery('MATCH (n) RETURN n')

      expect(result).toEqual(mockResult)
      expect(mockClose).toHaveBeenCalled()
    })

    it('closes session even when query fails', async () => {
      const error = new Error('Query failed')
      mockRun.mockRejectedValueOnce(error)

      await expect(
        executeReadQuery('INVALID QUERY')
      ).rejects.toThrow('Database query failed')

      expect(mockClose).toHaveBeenCalled()
    })

    it('logs error details when query fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Neo4j error')
      mockRun.mockRejectedValueOnce(error)

      await expect(
        executeReadQuery('INVALID QUERY')
      ).rejects.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith('Neo4j query error:', error)
      consoleSpy.mockRestore()
    })

    it('handles non-Error exceptions with Unknown error message', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const nonErrorException = 'String error'
      mockRun.mockRejectedValueOnce(nonErrorException)

      await expect(
        executeReadQuery('INVALID QUERY')
      ).rejects.toThrow('Database query failed: Unknown error')

      expect(consoleSpy).toHaveBeenCalledWith('Neo4j query error:', nonErrorException)
      expect(mockClose).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('accepts queries without parameters', async () => {
      mockRun.mockResolvedValueOnce({
        records: [],
      })

      await executeReadQuery('MATCH (n) RETURN n')

      expect(mockRun).toHaveBeenCalledWith('MATCH (n) RETURN n', {})
    })
  })

  describe('testConnection', () => {
    it('returns true when connection is successful', async () => {
      mockRun.mockResolvedValueOnce({})

      const result = await testConnection()

      expect(result).toBe(true)
      expect(mockRun).toHaveBeenCalledWith('RETURN 1')
      expect(mockClose).toHaveBeenCalled()
    })

    it('returns false when connection fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockRun.mockRejectedValueOnce(new Error('Connection failed'))

      const result = await testConnection()

      expect(result).toBe(false)
      expect(mockClose).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Neo4j connection test failed:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('closes session even when connection test fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockRun.mockRejectedValueOnce(new Error('Connection failed'))

      await testConnection()

      expect(mockClose).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Type Definitions', () => {
    it('exports User interface with all required fields', () => {
      const user: import('@/lib/neo4j').User = {
        userId: '123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        status: 'active',
        role: 'user',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        lastSeen: '2024-01-01T00:00:00Z',
      }

      expect(user).toBeDefined()
    })

    it('exports User interface with optional fields', () => {
      const user: import('@/lib/neo4j').User = {
        userId: '123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        status: 'active',
        role: 'user',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        lastSeen: '2024-01-01T00:00:00Z',
        department: 'Engineering',
        location: 'San Francisco',
      }

      expect(user.department).toBe('Engineering')
      expect(user.location).toBe('San Francisco')
    })

    it('exports Conversation interface with all required fields', () => {
      const conversation: import('@/lib/neo4j').Conversation = {
        conversationId: 'conv-123',
        title: 'Test Conversation',
        type: 'direct',
        priority: 'normal',
        tags: ['test', 'demo'],
        createdAt: '2024-01-01T00:00:00Z',
        lastMessageTimestamp: '2024-01-01T01:00:00Z',
        lastMessagePreview: 'Last message preview',
      }

      expect(conversation).toBeDefined()
    })

    it('exports Message interface with all fields', () => {
      const message: import('@/lib/neo4j').Message = {
        messageId: 'msg-123',
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Test message',
        timestamp: '2024-01-01T00:00:00Z',
        status: 'sent',
        type: 'text',
        reactions: ['👍', '❤️'],
        edited: true,
      }

      expect(message).toBeDefined()
    })

    it('exports ConversationSummary interface', () => {
      const summary: import('@/lib/neo4j').ConversationSummary = {
        conversationId: 'conv-123',
        title: 'Test Conversation',
        participantCount: 5,
        messageCount: 100,
        lastMessageTimestamp: '2024-01-01T00:00:00Z',
        type: 'group',
        priority: 'high',
      }

      expect(summary).toBeDefined()
    })
  })

  describe('formatDateTime', () => {
    it('should format Neo4j DateTime object', () => {
      const dateTime = {
        year: 2024,
        month: 1,
        day: 15,
        hour: 10,
        minute: 30,
        second: 45
      }
      
      const result = formatDateTime(dateTime)
      expect(result).toBe('2024-01-15T10:30:45Z')
    })

    it('should handle DateTime object with missing time components', () => {
      const dateTime = {
        year: 2024,
        month: 3,
        day: 5
      }
      
      const result = formatDateTime(dateTime)
      expect(result).toBe('2024-03-05T00:00:00Z')
    })

    it('should handle DateTime object with missing date components', () => {
      const dateTime = {
        year: 2024
      }
      
      const result = formatDateTime(dateTime)
      expect(result).toBe('2024-01-01T00:00:00Z')
    })

    it('should return string input unchanged', () => {
      const dateTime = '2024-01-15T10:30:45Z'
      const result = formatDateTime(dateTime)
      expect(result).toBe(dateTime)
    })

    it('should return null for null input', () => {
      expect(formatDateTime(null)).toBeNull()
    })

    it('should return null for undefined input', () => {
      expect(formatDateTime(undefined)).toBeNull()
    })

    it('should return null for invalid input types', () => {
      expect(formatDateTime(123 as any)).toBeNull()
      expect(formatDateTime(true as any)).toBeNull()
      expect(formatDateTime([] as any)).toBeNull()
    })

    it('should handle Neo4j DateTime with toString method', () => {
      const dateTime = {
        toString: vi.fn(() => '2024-01-15T10:30:45Z')
      }
      
      vi.mocked(neo4j.isDateTime).mockReturnValue(true)
      
      const result = formatDateTime(dateTime)
      expect(result).toBe('2024-01-15T10:30:45Z')
      expect(dateTime.toString).toHaveBeenCalled()
    })
  })

  describe('searchUsers', () => {
    beforeEach(() => {
      // Reset mocks
      vi.clearAllMocks()
      mockRun.mockReset()
      mockClose.mockReset()
      mockClose.mockResolvedValue(undefined)
    })

    it('should search users with query', async () => {
      const mockUsers = [{
        userId: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        status: 'active',
        role: 'user',
        avatarUrl: null,
        department: 'Engineering',
        location: 'NYC',
        bio: 'Test bio',
        lastSeen: '2024-01-15T10:30:45Z'
      }]

      // Mock count query result
      const countResult = {
        records: [{
          get: vi.fn((key: string) => {
            if (key === 'total') return 1
            return null
          })
        }]
      }

      // Mock data query result
      const dataResult = {
        records: [{
          get: vi.fn((key: string) => {
            if (key === 'user') return mockUsers[0]
            return null
          })
        }]
      }

      // Mock session.run to return different results for count and data queries
      mockRun
        .mockResolvedValueOnce(countResult as any)
        .mockResolvedValueOnce(dataResult as any)

      const result = await searchUsers({
        query: 'john',
        page: 1,
        limit: 10
      })

      expect(result.results).toHaveLength(1)
      expect(result.results[0].name).toBe('John Doe')
      expect(result.total).toBe(1)
    })

    it('should handle excludeUserId parameter', async () => {
      const countResult = {
        records: [{
          get: vi.fn(() => 0)
        }]
      }

      const dataResult = {
        records: []
      }

      mockRun
        .mockResolvedValueOnce(countResult as any)
        .mockResolvedValueOnce(dataResult as any)

      const result = await searchUsers({
        query: 'test',
        excludeUserId: 'user-to-exclude',
        page: 1,
        limit: 10
      })

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
      
      // Verify the exclude parameter was passed
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('u.userId <> $excludeUserId'),
        expect.objectContaining({ excludeUserId: 'user-to-exclude' })
      )
    })

    it('should handle pagination', async () => {
      const countResult = {
        records: [{
          get: vi.fn(() => 100)
        }]
      }

      const dataResult = {
        records: []
      }

      mockRun
        .mockResolvedValueOnce(countResult as any)
        .mockResolvedValueOnce(dataResult as any)

      const result = await searchUsers({
        query: 'test',
        page: 3,
        limit: 20
      })

      expect(result.total).toBe(100)
      
      // Verify pagination parameters in query
      expect(mockRun).toHaveBeenNthCalledWith(2,
        expect.stringContaining('SKIP $skip'),
        expect.objectContaining({ skip: 40, limit: 20 })
      )
    })

    it('should cap limit at 50', async () => {
      const countResult = {
        records: [{
          get: vi.fn(() => 100)
        }]
      }

      const dataResult = {
        records: []
      }

      mockRun
        .mockResolvedValueOnce(countResult as any)
        .mockResolvedValueOnce(dataResult as any)

      await searchUsers({
        query: 'test',
        page: 1,
        limit: 100 // Should be capped at 50
      })

      // Verify limit was capped  
      expect(mockRun).toHaveBeenNthCalledWith(2,
        expect.stringContaining('LIMIT $limit'),
        expect.objectContaining({ limit: 50 })
      )
    })

    it('should handle Neo4j Integer for total count', async () => {
      const neo4jInt = {
        low: 42,
        high: 0,
        toNumber: vi.fn(() => 42)
      }

      const countResult = {
        records: [{
          get: vi.fn(() => neo4jInt)
        }]
      }

      const dataResult = {
        records: []
      }

      mockRun
        .mockResolvedValueOnce(countResult as any)
        .mockResolvedValueOnce(dataResult as any)

      const result = await searchUsers({
        query: 'test',
        page: 1,
        limit: 10
      })

      expect(result.total).toBe(42)
    })

    it('should handle Neo4j DateTime in user data', async () => {
      const mockDateTime = {
        year: 2024,
        month: 1,
        day: 15,
        hour: 10,
        minute: 30,
        second: 45,
        toString: vi.fn(() => '2024-01-15T10:30:45Z')
      }

      vi.mocked(neo4j.isDateTime).mockReturnValue(true)

      const mockUser = {
        userId: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        status: 'active',
        role: 'user',
        avatarUrl: null,
        department: null,
        location: null,
        bio: null,
        lastSeen: mockDateTime
      }

      const countResult = {
        records: [{
          get: vi.fn(() => 1)
        }]
      }

      const dataResult = {
        records: [{
          get: vi.fn(() => mockUser)
        }]
      }

      mockRun
        .mockResolvedValueOnce(countResult as any)
        .mockResolvedValueOnce(dataResult as any)

      const result = await searchUsers({
        query: 'john',
        page: 1,
        limit: 10
      })

      expect(result.results[0].lastSeen).toBe('2024-01-15T10:30:45Z')
    })
  })

  describe('getUserContacts', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should get user contacts without query', async () => {
      const mockContacts = [{
        userId: 'contact-1',
        name: 'Jane Smith',
        email: 'jane@example.com',
        username: 'janesmith',
        status: 'active',
        role: 'user',
        avatarUrl: null,
        department: 'Sales',
        location: 'LA',
        bio: null,
        lastSeen: '2024-01-10T09:00:00Z',
        sharedConversationCount: 5,
        totalMessageCount: 150,
        lastInteraction: '2024-01-09T15:30:00Z',
        firstInteraction: '2023-06-01T10:00:00Z'
      }]

      // Mock user exists result
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn(() => ({ userId: 'user-1' }))
        }]
      })

      // Mock total count result (comes before data query)
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn(() => 1)
        }]
      })

      // Mock contacts query result
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn((key: string) => {
            if (key === 'u2') return { properties: mockContacts[0] }
            if (key === 'sharedConversationCount') return 5
            if (key === 'totalMessageCount') return 150
            if (key === 'lastInteraction') return '2024-01-09T15:30:00Z'
            if (key === 'firstInteraction') return '2023-06-01T10:00:00Z'
            return null
          })
        }]
      })

      const result = await getUserContacts({
        userId: 'user-1',
        page: 1,
        limit: 20
      })

      expect(result.results).toHaveLength(1)
      expect(result.results[0].name).toBe('Jane Smith')
      expect(result.results[0].communicationStats.sharedConversationCount).toBe(5)
      expect(result.total).toBe(1)
      expect(mockClose).toHaveBeenCalled()
    })

    it('should filter contacts with query', async () => {
      // Mock user exists
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn(() => ({ userId: 'user-1' }))
        }]
      })

      // Mock empty contacts result
      mockRun.mockResolvedValueOnce({
        records: []
      })

      // Mock total count
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn(() => 0)
        }]
      })

      const result = await getUserContacts({
        userId: 'user-1',
        query: 'jane',
        page: 1,
        limit: 20
      })

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
      
      // Verify query parameter was used
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('toLower($query)'),
        expect.objectContaining({ query: 'jane' })
      )
    })

    it('should throw error when user does not exist', async () => {
      // Mock user doesn't exist
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await expect(getUserContacts({
        userId: 'nonexistent-user',
        page: 1,
        limit: 20
      })).rejects.toThrow('User not found')

      expect(mockClose).toHaveBeenCalled()
    })

    it('should handle pagination', async () => {
      // Mock user exists
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn(() => ({ userId: 'user-1' }))
        }]
      })

      // Mock total (comes before data query)
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn(() => 50)
        }]
      })

      // Mock contacts result
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await getUserContacts({
        userId: 'user-1',
        page: 3,
        limit: 10
      })

      // Verify pagination in query - page 3 with limit 10 means skip 20
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('SKIP $skip'),
        expect.objectContaining({ skip: 20, limit: 10 })
      )
    })

    it('should cap limit at 1000', async () => {
      // Mock user exists
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn(() => ({ userId: 'user-1' }))
        }]
      })

      // Mock total (non-zero so data query will run)
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn(() => 1500)
        }]
      })

      // Mock contacts
      mockRun.mockResolvedValueOnce({
        records: []
      })

      await getUserContacts({
        userId: 'user-1',
        page: 1,
        limit: 2000 // Should be capped at 1000
      })

      // Check that the limit was capped at 1000 in the parameters (3rd call is the data query)
      expect(mockRun).toHaveBeenNthCalledWith(3,
        expect.stringContaining('LIMIT $limit'),
        expect.objectContaining({ limit: 1000 })
      )
    })

    it('should handle Neo4j Integer types in counts', async () => {
      const neo4jInt = {
        low: 42,
        high: 0,
        toNumber: vi.fn(() => 42)
      }

      // Mock user exists
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn(() => ({ userId: 'user-1' }))
        }]
      })

      // Mock total as Neo4j integer (comes before data query)
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn(() => neo4jInt)
        }]
      })

      const mockContact = {
        properties: {
          userId: 'contact-1',
          name: 'Jane Smith',
          email: 'jane@example.com',
          username: 'janesmith',
          status: 'active',
          role: 'user',
          avatarUrl: null,
          department: null,
          location: null,
          bio: null,
          lastSeen: null
        }
      }

      // Mock contacts with Neo4j integers
      mockRun.mockResolvedValueOnce({
        records: [{
          get: vi.fn((key: string) => {
            if (key === 'u2') return mockContact
            if (key === 'sharedConversationCount') return neo4jInt
            if (key === 'totalMessageCount') return neo4jInt
            if (key === 'firstInteraction') return null
            if (key === 'lastInteraction') return null
            return null
          })
        }]
      })

      const result = await getUserContacts({
        userId: 'user-1',
        page: 1,
        limit: 20
      })

      expect(result.results[0].communicationStats.sharedConversationCount).toBe(42)
      expect(result.results[0].communicationStats.totalMessageCount).toBe(42)
      expect(result.total).toBe(42)
    })

    it('should close session on error', async () => {
      mockRun.mockRejectedValueOnce(new Error('Database error'))

      await expect(getUserContacts({
        userId: 'user-1',
        page: 1,
        limit: 20
      })).rejects.toThrow('Database error')

      expect(mockClose).toHaveBeenCalled()
    })
  })

  describe('convertNeo4jIntegers edge cases', () => {
    it('handles Neo4j Integer without toNumber method', () => {
      const mockInt = { low: 42, high: 0 } // No toNumber method
      const result = convertNeo4jIntegers(mockInt)
      expect(result).toBe(42)
    })

    it('handles Neo4j Integer with toNumber method', () => {
      const mockInt = { 
        low: 42, 
        high: 0,
        toNumber: () => 100 
      }
      const result = convertNeo4jIntegers(mockInt)
      expect(result).toBe(100)
    })

    it('handles DateTime without toString method', () => {
      const mockDateTime = {
        year: 2025,
        month: 1,
        day: 14,
        hour: 10,
        minute: 30,
        second: 45,
        nanosecond: 0
        // No toString method
      }
      const result = convertNeo4jIntegers(mockDateTime)
      expect(result).toBe('2025-01-14T10:30:45Z')
    })

    it('handles DateTime with toString method', () => {
      const mockDateTime = {
        year: 2025,
        month: 1,
        day: 14,
        hour: 10,
        minute: 30,
        second: 45,
        toString: () => '2025-01-14T10:30:45.000Z'
      }
      const result = convertNeo4jIntegers(mockDateTime)
      expect(result).toBe('2025-01-14T10:30:45.000Z')
    })

    it('handles DateTime with missing hour, minute, second fields', () => {
      const mockDateTime = {
        year: 2025,
        month: 1,
        day: 14
        // Missing hour, minute, second - should default to 0
      }
      const result = convertNeo4jIntegers(mockDateTime)
      expect(result).toBe('2025-01-14T00:00:00Z')
    })

    it('handles DateTime with single-digit month and day needing padding', () => {
      const mockDateTime = {
        year: 2025,
        month: 3,
        day: 5,
        hour: 9,
        minute: 7,
        second: 2
      }
      const result = convertNeo4jIntegers(mockDateTime)
      expect(result).toBe('2025-03-05T09:07:02Z')
    })

    it('returns null values unchanged', () => {
      expect(convertNeo4jIntegers(null)).toBe(null)
    })

    it('returns undefined values unchanged', () => {
      expect(convertNeo4jIntegers(undefined)).toBe(undefined)
    })

    it('returns regular numbers unchanged', () => {
      expect(convertNeo4jIntegers(42)).toBe(42)
    })

    it('returns strings unchanged', () => {
      expect(convertNeo4jIntegers('test')).toBe('test')
    })

    it('returns booleans unchanged', () => {
      expect(convertNeo4jIntegers(true)).toBe(true)
      expect(convertNeo4jIntegers(false)).toBe(false)
    })

    it('recursively processes arrays with mixed types', () => {
      const input = [
        42,
        'string',
        { low: 10, high: 0 }, // Neo4j Integer
        {
          year: 2025,
          month: 1,
          day: 14,
          hour: 12,
          minute: 0,
          second: 0
        }, // DateTime
        null,
        [{ low: 20, high: 0 }] // Nested array
      ]
      
      const result = convertNeo4jIntegers(input) as any[]
      expect(result).toEqual([
        42,
        'string',
        10,
        '2025-01-14T12:00:00Z',
        null,
        [20]
      ])
    })

    it('recursively processes nested objects', () => {
      const input = {
        name: 'test',
        count: { low: 100, high: 0 },
        nested: {
          date: {
            year: 2025,
            month: 12,
            day: 25,
            hour: 0,
            minute: 0,
            second: 0
          },
          value: { low: 50, high: 0 }
        }
      }
      
      const result = convertNeo4jIntegers(input) as any
      expect(result).toEqual({
        name: 'test',
        count: 100,
        nested: {
          date: '2025-12-25T00:00:00Z',
          value: 50
        }
      })
    })

    it('skips Date object instances', () => {
      const date = new Date('2025-01-14T10:00:00Z')
      const result = convertNeo4jIntegers(date)
      expect(result).toBe(date)
      expect(result).toBeInstanceOf(Date)
    })

    it('handles objects with both low/high and other properties', () => {
      const input = {
        low: 42,
        high: 0,
        someOtherProp: 'test'
      }
      const result = convertNeo4jIntegers(input)
      expect(result).toBe(42) // Should still be treated as Neo4j Integer
    })

    it('handles objects with year/month/day and other properties', () => {
      const input = {
        year: 2025,
        month: 1,
        day: 14,
        someOtherProp: 'test'
      }
      const result = convertNeo4jIntegers(input)
      expect(result).toBe('2025-01-14T00:00:00Z') // Should still be treated as DateTime
    })

    it('processes complex nested structure with all edge cases', () => {
      const input = {
        user: {
          id: { low: 1, high: 0 },
          name: 'Test User',
          lastSeen: {
            year: 2025,
            month: 1,
            day: 14,
            hour: 15,
            minute: 30,
            second: 45
          }
        },
        stats: {
          messages: { low: 1000, high: 0, toNumber: () => 999 }, // With toNumber
          conversations: { low: 50, high: 0 }, // Without toNumber
        },
        activities: [
          {
            timestamp: {
              year: 2025,
              month: 2,
              day: 1,
              toString: () => '2025-02-01T00:00:00.000Z'
            },
            count: { low: 5, high: 0 }
          }
        ]
      }
      
      const result = convertNeo4jIntegers(input) as any
      expect(result).toEqual({
        user: {
          id: 1,
          name: 'Test User',
          lastSeen: '2025-01-14T15:30:45Z'
        },
        stats: {
          messages: 999,
          conversations: 50
        },
        activities: [
          {
            timestamp: '2025-02-01T00:00:00.000Z',
            count: 5
          }
        ]
      })
    })
  })
})