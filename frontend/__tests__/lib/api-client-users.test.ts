import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getUsersPaginated } from '@/lib/api-client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock console.error
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('getUsersPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy.mockClear()
    // Reset environment for each test
    delete process.env.NEXT_PUBLIC_URL
    delete process.env.PORT
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic functionality', () => {
    it('fetches users with default pagination parameters', async () => {
      const mockResponse = {
        users: [
          {
            userId: 'user-1',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            avatar: 'https://example.com/avatar1.png',
            conversationCount: 3,
            messageCount: 15,
            lastActiveTimestamp: '2024-01-01T10:00:00Z'
          },
          {
            userId: 'user-2',
            name: 'Bob Smith', 
            email: 'bob@example.com',
            avatar: null,
            conversationCount: 2,
            messageCount: 8,
            lastActiveTimestamp: '2024-01-01T09:30:00Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1000,
          totalPages: 50
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getUsersPaginated()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          next: { revalidate: 300 }
        })
      )

      expect(result).toEqual(mockResponse)
    })

    it('constructs correct URL with pagination parameters', async () => {
      const mockResponse = {
        users: [],
        pagination: { page: 2, limit: 10, total: 100, totalPages: 10 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await getUsersPaginated({ page: 2, limit: 10 })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users?page=2&limit=10',
        expect.objectContaining({
          next: { revalidate: 300 }
        })
      )
    })

    it('handles single pagination parameter', async () => {
      const mockResponse = {
        users: [],
        pagination: { page: 3, limit: 20, total: 100, totalPages: 5 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await getUsersPaginated({ page: 3 })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users?page=3',
        expect.objectContaining({
          next: { revalidate: 300 }
        })
      )
    })

    it('passes AbortSignal when provided', async () => {
      const mockResponse = {
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const controller = new AbortController()
      await getUsersPaginated({}, controller.signal)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          signal: controller.signal,
          next: { revalidate: 300 }
        })
      )
    })
  })

  describe('URL construction', () => {
    it('uses relative URL in client environment', async () => {
      // Simulate client-side environment
      Object.defineProperty(window, 'window', {
        value: {},
        writable: true
      })

      const mockResponse = {
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await getUsersPaginated()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.any(Object)
      )

      // Clean up
      delete (global as any).window
    })

    it('uses absolute URL in server environment with NEXT_PUBLIC_URL', async () => {
      process.env.NEXT_PUBLIC_URL = 'https://example.com'

      const mockResponse = {
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await getUsersPaginated()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/users',
        expect.any(Object)
      )
    })

    it('uses localhost with PORT in server environment without NEXT_PUBLIC_URL', async () => {
      process.env.PORT = '4000'

      const mockResponse = {
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await getUsersPaginated()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users',
        expect.any(Object)
      )
    })

    it('defaults to localhost:3000 in server environment', async () => {
      const mockResponse = {
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await getUsersPaginated()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/users',
        expect.any(Object)
      )
    })
  })

  describe('Error handling', () => {
    it('throws error when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(getUsersPaginated()).rejects.toThrow('Network error')
    })

    it('throws error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(getUsersPaginated()).rejects.toThrow('Failed to fetch users')
    })

    it('throws error when response is not valid JSON object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null)
      })

      await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: expected object')
    })

    it('throws error when response is not an object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve('invalid response')
      })

      await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: expected object')
    })

    it('throws error when users field is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
        })
      })

      await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: users must be an array')
    })

    it('throws error when users is not an array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          users: 'not an array',
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
        })
      })

      await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: users must be an array')
    })

    it('throws error when pagination field is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          users: []
        })
      })

      await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: missing pagination')
    })

    it('throws error when pagination is not an object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          users: [],
          pagination: 'not an object'
        })
      })

      await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: missing pagination')
    })

    it('validates pagination structure fields', async () => {
      const invalidPaginationTests = [
        { pagination: { limit: 20, total: 100, totalPages: 5 }, error: 'pagination page must be a number' },
        { pagination: { page: 1, total: 100, totalPages: 5 }, error: 'pagination limit must be a number' },
        { pagination: { page: 1, limit: 20, totalPages: 5 }, error: 'pagination total must be a number' },
        { pagination: { page: 1, limit: 20, total: 100 }, error: 'pagination totalPages must be a number' },
        { pagination: { page: '1', limit: 20, total: 100, totalPages: 5 }, error: 'pagination page must be a number' },
        { pagination: { page: 1, limit: '20', total: 100, totalPages: 5 }, error: 'pagination limit must be a number' },
      ]

      for (const testCase of invalidPaginationTests) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            users: [],
            pagination: testCase.pagination
          })
        })

        await expect(getUsersPaginated()).rejects.toThrow(testCase.error)
      }
    })

    it('validates individual user objects', async () => {
      const usersWithInvalidUser = [
        {
          name: 'Valid User',
          email: 'valid@example.com',
          avatar: null,
          conversationCount: 1,
          messageCount: 5,
          lastActiveTimestamp: '2024-01-01T10:00:00Z'
          // Missing userId
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          users: usersWithInvalidUser,
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
        })
      })

      await expect(getUsersPaginated()).rejects.toThrow('Invalid user at index 0: missing or invalid userId')
    })

    it('validates user with invalid userId type', async () => {
      const usersWithInvalidUserId = [
        {
          userId: 123, // Should be string
          name: 'Invalid User',
          email: 'invalid@example.com',
          avatar: null,
          conversationCount: 1,
          messageCount: 5,
          lastActiveTimestamp: '2024-01-01T10:00:00Z'
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          users: usersWithInvalidUserId,
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
        })
      })

      await expect(getUsersPaginated()).rejects.toThrow('Invalid user at index 0: missing or invalid userId')
    })
  })

  describe('Response validation', () => {
    it('accepts valid user objects with all required fields', async () => {
      const validUsers = [
        {
          userId: 'user-1',
          name: 'Complete User',
          email: 'complete@example.com',
          avatar: 'https://example.com/avatar.png',
          conversationCount: 5,
          messageCount: 25,
          lastActiveTimestamp: '2024-01-01T12:00:00Z'
        },
        {
          userId: 'user-2',
          name: 'User Without Avatar',
          email: 'noavatar@example.com',
          avatar: null,
          conversationCount: 0,
          messageCount: 0,
          lastActiveTimestamp: '2024-01-01T10:00:00Z'
        }
      ]

      const mockResponse = {
        users: validUsers,
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getUsersPaginated()

      expect(result).toEqual(mockResponse)
      expect(result.users).toHaveLength(2)
      expect(result.users[0].userId).toBe('user-1')
      expect(result.users[1].avatar).toBeNull()
    })

    it('logs errors when fetch fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      await expect(getUsersPaginated()).rejects.toThrow('Network failure')
      
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('logs errors when validation fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      })

      await expect(getUsersPaginated()).rejects.toThrow('Invalid API response: users must be an array')
      
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('Caching behavior', () => {
    it('includes correct revalidation cache setting', async () => {
      const mockResponse = {
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await getUsersPaginated()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: { revalidate: 300 } // 5 minutes cache
        })
      )
    })
  })

  describe('AbortError handling', () => {
    it('handles AbortError gracefully by returning empty result', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      
      mockFetch.mockRejectedValueOnce(abortError)

      const result = await getUsersPaginated()

      expect(result).toEqual({
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })
      
      // Should not log error for AbortError
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('handles AbortError with signal parameter', async () => {
      const controller = new AbortController()
      const abortError = new Error('signal is aborted without reason')
      abortError.name = 'AbortError'
      
      mockFetch.mockRejectedValueOnce(abortError)

      const result = await getUsersPaginated({ page: 2, limit: 25 }, controller.signal)

      expect(result).toEqual({
        users: [],
        pagination: { page: 2, limit: 25, total: 0, totalPages: 0 }
      })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/users?page=2&limit=25',
        {
          signal: controller.signal,
          next: { revalidate: 300 }
        }
      )
      
      // Should not log error for AbortError
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

  })
})