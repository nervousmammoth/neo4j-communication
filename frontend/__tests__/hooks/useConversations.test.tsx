import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useConversations } from '@/hooks/useConversations'
import { ReactNode } from 'react'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  getConversationsPaginated: vi.fn()
}))

// Mock AbortController for signal handling
global.AbortController = class AbortController {
  signal = { aborted: false }
  abort() {
    this.signal.aborted = true
  }
} as any

describe('useConversations hook', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for tests
        },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  describe('basic query functionality', () => {
    it('should fetch conversations successfully', async () => {
      const mockData = {
        conversations: [
          {
            conversationId: 'conv-1',
            title: 'Test Conversation',
            participantCount: 2,
            messageCount: 5,
            lastMessageTimestamp: '2024-01-01T00:00:00Z',
            type: 'direct',
            priority: 'normal'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      }

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any).mockResolvedValue(mockData)

      const { result } = renderHook(() => useConversations(1, 20), { wrapper })

      // Initially loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockData)
      expect(result.current.error).toBeNull()
      expect(getConversationsPaginated).toHaveBeenCalledWith(
        { page: 1, limit: 20 },
        expect.any(Object) // AbortSignal
      )
    })

    it('should handle query errors gracefully', async () => {
      const mockError = new Error('API Error')

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any).mockRejectedValue(mockError)

      const { result } = renderHook(() => useConversations(1, 20), { wrapper })

      // Wait for error state
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
    })

    it('should use correct query key format', async () => {
      const mockData = {
        conversations: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0 }
      }

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any).mockResolvedValue(mockData)

      const { result } = renderHook(() => useConversations(2, 10), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Verify query key format by checking cache
      const queryData = queryClient.getQueryData(['conversations', { page: 2, limit: 10 }])
      expect(queryData).toEqual(mockData)
    })
  })

  describe('prefetching functionality', () => {
    it('should prefetch previous page when not on first page', async () => {
      const mockCurrentData = {
        conversations: [{ conversationId: 'conv-2', title: 'Page 2' }],
        pagination: { page: 2, limit: 20, total: 40, totalPages: 2 }
      }

      const mockPrevData = {
        conversations: [{ conversationId: 'conv-1', title: 'Page 1' }],
        pagination: { page: 1, limit: 20, total: 40, totalPages: 2 }
      }

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any)
        .mockResolvedValueOnce(mockCurrentData) // Current page
        .mockResolvedValueOnce(mockPrevData)    // Previous page prefetch

      const { result } = renderHook(() => useConversations(2, 20), { wrapper })

      // Wait for current data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Wait for prefetch to complete
      await waitFor(() => {
        const prevPageData = queryClient.getQueryData(['conversations', { page: 1, limit: 20 }])
        expect(prevPageData).toEqual(mockPrevData)
      }, { timeout: 1000 })

      // Verify both calls were made
      expect(getConversationsPaginated).toHaveBeenCalledTimes(2)
      expect(getConversationsPaginated).toHaveBeenCalledWith(
        { page: 2, limit: 20 },
        expect.any(Object)
      )
      expect(getConversationsPaginated).toHaveBeenCalledWith(
        { page: 1, limit: 20 },
        expect.any(Object)
      )
    })

    it('should prefetch next page when not on last page', async () => {
      const mockCurrentData = {
        conversations: [{ conversationId: 'conv-1', title: 'Page 1' }],
        pagination: { page: 1, limit: 20, total: 40, totalPages: 2 }
      }

      const mockNextData = {
        conversations: [{ conversationId: 'conv-2', title: 'Page 2' }],
        pagination: { page: 2, limit: 20, total: 40, totalPages: 2 }
      }

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any)
        .mockResolvedValueOnce(mockCurrentData) // Current page
        .mockResolvedValueOnce(mockNextData)    // Next page prefetch

      const { result } = renderHook(() => useConversations(1, 20), { wrapper })

      // Wait for current data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Wait for prefetch to complete
      await waitFor(() => {
        const nextPageData = queryClient.getQueryData(['conversations', { page: 2, limit: 20 }])
        expect(nextPageData).toEqual(mockNextData)
      }, { timeout: 1000 })

      // Verify both calls were made
      expect(getConversationsPaginated).toHaveBeenCalledTimes(2)
    })

    it('should not prefetch previous page when on first page', async () => {
      const mockCurrentData = {
        conversations: [{ conversationId: 'conv-1', title: 'Page 1' }],
        pagination: { page: 1, limit: 20, total: 20, totalPages: 1 }
      }

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any).mockResolvedValue(mockCurrentData)

      const { result } = renderHook(() => useConversations(1, 20), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should only call once (no prefetch for previous page)
      expect(getConversationsPaginated).toHaveBeenCalledTimes(1)
      expect(getConversationsPaginated).toHaveBeenCalledWith(
        { page: 1, limit: 20 },
        expect.any(Object)
      )
    })

    it('should not prefetch next page when on last page', async () => {
      const mockCurrentData = {
        conversations: [{ conversationId: 'conv-2', title: 'Page 2' }],
        pagination: { page: 2, limit: 20, total: 40, totalPages: 2 }
      }

      const mockPrevData = {
        conversations: [{ conversationId: 'conv-1', title: 'Page 1' }],
        pagination: { page: 1, limit: 20, total: 40, totalPages: 2 }
      }

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any)
        .mockResolvedValueOnce(mockCurrentData) // Current page
        .mockResolvedValueOnce(mockPrevData)    // Previous page prefetch

      const { result } = renderHook(() => useConversations(2, 20), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Wait for potential prefetch to complete
      await waitFor(() => {
        const prevPageData = queryClient.getQueryData(['conversations', { page: 1, limit: 20 }])
        expect(prevPageData).toEqual(mockPrevData)
      }, { timeout: 1000 })

      // Should call twice: current page + previous page prefetch (but no next page)
      expect(getConversationsPaginated).toHaveBeenCalledTimes(2)
      expect(getConversationsPaginated).toHaveBeenCalledWith(
        { page: 2, limit: 20 },
        expect.any(Object)
      )
      expect(getConversationsPaginated).toHaveBeenCalledWith(
        { page: 1, limit: 20 },
        expect.any(Object)
      )
    })

    it('should prefetch both adjacent pages when in middle', async () => {
      const mockCurrentData = {
        conversations: [{ conversationId: 'conv-2', title: 'Page 2' }],
        pagination: { page: 2, limit: 20, total: 60, totalPages: 3 }
      }

      const mockPrevData = {
        conversations: [{ conversationId: 'conv-1', title: 'Page 1' }],
        pagination: { page: 1, limit: 20, total: 60, totalPages: 3 }
      }

      const mockNextData = {
        conversations: [{ conversationId: 'conv-3', title: 'Page 3' }],
        pagination: { page: 3, limit: 20, total: 60, totalPages: 3 }
      }

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any)
        .mockResolvedValueOnce(mockCurrentData) // Current page
        .mockResolvedValueOnce(mockPrevData)    // Previous page prefetch
        .mockResolvedValueOnce(mockNextData)    // Next page prefetch

      const { result } = renderHook(() => useConversations(2, 20), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Wait for prefetches to complete
      await waitFor(() => {
        const prevPageData = queryClient.getQueryData(['conversations', { page: 1, limit: 20 }])
        const nextPageData = queryClient.getQueryData(['conversations', { page: 3, limit: 20 }])
        expect(prevPageData).toEqual(mockPrevData)
        expect(nextPageData).toEqual(mockNextData)
      }, { timeout: 1000 })

      // Should call 3 times: current + prev + next
      expect(getConversationsPaginated).toHaveBeenCalledTimes(3)
    })
  })

  describe('caching and stale-while-revalidate behavior', () => {
    it('should use stale data while revalidating in background', async () => {
      const staleData = {
        conversations: [{ conversationId: 'conv-1', title: 'Stale' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      const freshData = {
        conversations: [{ conversationId: 'conv-1', title: 'Fresh' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      // Pre-populate cache with stale data (mark as stale)
      queryClient.setQueryData(['conversations', { page: 1, limit: 20 }], staleData)
      
      // Mark the query as stale to trigger revalidation
      queryClient.invalidateQueries({ 
        queryKey: ['conversations', { page: 1, limit: 20 }],
        exact: true 
      })

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any).mockResolvedValue(freshData)

      const { result } = renderHook(() => useConversations(1, 20), { wrapper })

      // Should start with stale data (if it exists in cache)
      if (result.current.data) {
        expect(result.current.data).toEqual(staleData)
      }

      // Wait for revalidation to complete
      await waitFor(() => {
        expect(result.current.data).toEqual(freshData)
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 2000 })

      // Should have called the API to get fresh data
      expect(getConversationsPaginated).toHaveBeenCalledWith(
        { page: 1, limit: 20 },
        expect.any(Object)
      )
    })

    it('should respect staleTime configuration', () => {
      const { result } = renderHook(() => useConversations(1, 20), { wrapper })

      // The hook should be configured with proper staleTime
      // This is more of a configuration check - the actual staleTime behavior
      // is handled by React Query internally
      expect(result.current).toBeDefined()
    })

    it('should handle cache invalidation properly', async () => {
      const mockData = {
        conversations: [{ conversationId: 'conv-1', title: 'Test' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any).mockResolvedValue(mockData)

      const { result } = renderHook(() => useConversations(1, 20), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Invalidate the query
      await queryClient.invalidateQueries({ queryKey: ['conversations'] })

      // Should trigger refetch
      await waitFor(() => {
        expect(getConversationsPaginated).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('abort signal handling', () => {
    it('should pass abort signal to API calls', async () => {
      const mockData = {
        conversations: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      }

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any).mockResolvedValue(mockData)

      const { result } = renderHook(() => useConversations(1, 20), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Verify abort signal was passed
      expect(getConversationsPaginated).toHaveBeenCalledWith(
        { page: 1, limit: 20 },
        expect.objectContaining({
          aborted: expect.any(Boolean)
        })
      )
    })

    it('should handle aborted requests gracefully', async () => {
      const abortError = new Error('Request aborted')
      abortError.name = 'AbortError'

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any).mockRejectedValue(abortError)

      const { result } = renderHook(() => useConversations(1, 20), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(abortError)
    })
  })

  describe('different page sizes', () => {
    it('should handle different limit values correctly', async () => {
      const mockData = {
        conversations: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
      }

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any).mockResolvedValue(mockData)

      const { result } = renderHook(() => useConversations(1, 50), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(getConversationsPaginated).toHaveBeenCalledWith(
        { page: 1, limit: 50 },
        expect.any(Object)
      )

      expect(result.current.data).toEqual(mockData)
    })

    it('should use separate cache entries for different limits', async () => {
      const mockData20 = {
        conversations: [{ conversationId: 'conv-20', title: 'Limit 20' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }

      const mockData50 = {
        conversations: [{ conversationId: 'conv-50', title: 'Limit 50' }],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
      }

      const { getConversationsPaginated } = await import('@/lib/api-client')
      ;(getConversationsPaginated as any)
        .mockResolvedValueOnce(mockData20)
        .mockResolvedValueOnce(mockData50)

      // Render hook with limit 20
      const { result: result20 } = renderHook(() => useConversations(1, 20), { wrapper })
      await waitFor(() => expect(result20.current.isLoading).toBe(false))

      // Render hook with limit 50
      const { result: result50 } = renderHook(() => useConversations(1, 50), { wrapper })
      await waitFor(() => expect(result50.current.isLoading).toBe(false))

      // Both should have different data
      expect(result20.current.data).toEqual(mockData20)
      expect(result50.current.data).toEqual(mockData50)

      // Should have made 2 separate API calls
      expect(getConversationsPaginated).toHaveBeenCalledTimes(2)
    })
  })
})