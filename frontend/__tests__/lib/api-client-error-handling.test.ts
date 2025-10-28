import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  getCommunicationData,
  fetchAggregatedData 
} from '@/lib/api-client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('api-client error handling and edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCommunicationData with query parameters', () => {
    it('should include conversationId in query params when provided', async () => {
      const mockResponse = {
        user1: { userId: 'user-1', name: 'Alice' },
        user2: { userId: 'user-2', name: 'Bob' },
        communicationStats: {
          totalMessages: 100,
          totalSharedConversations: 5,
          firstInteraction: '2024-01-01',
          lastInteraction: '2024-03-01',
          user1Messages: 50,
          user2Messages: 50
        },
        sharedConversations: [],
        messageTimeline: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          hasMore: false
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await getCommunicationData('user-1', 'user-2', {
        conversationId: 'conv-123'
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('conversationId=conv-123'),
        { next: { revalidate: 300 } }
      )
    })

    it('should include dateFrom in query params when provided', async () => {
      const mockResponse = {
        user1: { userId: 'user-1', name: 'Alice' },
        user2: { userId: 'user-2', name: 'Bob' },
        communicationStats: {
          totalMessages: 100,
          totalSharedConversations: 5,
          firstInteraction: '2024-01-01',
          lastInteraction: '2024-03-01',
          user1Messages: 50,
          user2Messages: 50
        },
        sharedConversations: [],
        messageTimeline: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          hasMore: false
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await getCommunicationData('user-1', 'user-2', {
        dateFrom: '2024-01-01'
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('dateFrom=2024-01-01'),
        { next: { revalidate: 300 } }
      )
    })

    it('should include dateTo in query params when provided', async () => {
      const mockResponse = {
        user1: { userId: 'user-1', name: 'Alice' },
        user2: { userId: 'user-2', name: 'Bob' },
        communicationStats: {
          totalMessages: 100,
          totalSharedConversations: 5,
          firstInteraction: '2024-01-01',
          lastInteraction: '2024-03-01',
          user1Messages: 50,
          user2Messages: 50
        },
        sharedConversations: [],
        messageTimeline: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          hasMore: false
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await getCommunicationData('user-1', 'user-2', {
        dateTo: '2024-03-31'
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('dateTo=2024-03-31'),
        { next: { revalidate: 300 } }
      )
    })

    it('should include all parameters when provided', async () => {
      const mockResponse = {
        user1: { userId: 'user-1', name: 'Alice' },
        user2: { userId: 'user-2', name: 'Bob' },
        communicationStats: {
          totalMessages: 100,
          totalSharedConversations: 5,
          firstInteraction: '2024-01-01',
          lastInteraction: '2024-03-01',
          user1Messages: 50,
          user2Messages: 50
        },
        sharedConversations: [],
        messageTimeline: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          hasMore: false
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await getCommunicationData('user-1', 'user-2', {
        conversationId: 'conv-123',
        dateFrom: '2024-01-01',
        dateTo: '2024-03-31'
      })

      const callUrl = mockFetch.mock.calls[0][0]
      expect(callUrl).toContain('conversationId=conv-123')
      expect(callUrl).toContain('dateFrom=2024-01-01')
      expect(callUrl).toContain('dateTo=2024-03-31')
    })

    it('should handle fetch network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        getCommunicationData('user-1', 'user-2')
      ).rejects.toThrow('Network error')
    })

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      await expect(
        getCommunicationData('user-1', 'user-2')
      ).rejects.toThrow('Invalid JSON')
    })
  })

  describe('fetchAggregatedData', () => {
    it('should fetch aggregated data successfully', async () => {
      const mockAggregatedData = {
        frequency: [
          { date: '2024-01-01', totalMessages: 10, user1Messages: 6, user2Messages: 4 }
        ],
        responseTime: {
          avgResponseTime: 3600000,
          medianResponseTime: 1800000,
          distribution: []
        },
        activityHeatmap: [],
        talkToListenRatio: {
          user1Messages: 100,
          user2Messages: 80,
          user1Percentage: 55.56,
          user2Percentage: 44.44
        },
        conversationTypes: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAggregatedData
      })

      const result = await fetchAggregatedData(
        'user-1',
        'user-2',
        { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
        'daily'
      )

      expect(result).toEqual(mockAggregatedData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/communications/user-1/user-2/analytics')
      )
      
      const callUrl = mockFetch.mock.calls[0][0]
      expect(callUrl).toContain('dateFrom=2024-01-01')
      expect(callUrl).toContain('dateTo=2024-01-31')
      expect(callUrl).toContain('granularity=daily')
    })

    it('should handle different granularities', async () => {
      const mockData = {
        frequency: [],
        responseTime: { avgResponseTime: 0, medianResponseTime: 0, distribution: [] },
        activityHeatmap: [],
        talkToListenRatio: { user1Messages: 0, user2Messages: 0, user1Percentage: 50, user2Percentage: 50 },
        conversationTypes: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      await fetchAggregatedData(
        'user-1',
        'user-2',
        { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
        'monthly'
      )

      const callUrl = mockFetch.mock.calls[0][0]
      expect(callUrl).toContain('granularity=monthly')
    })

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(
        fetchAggregatedData(
          'user-1',
          'user-2',
          { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
          'daily'
        )
      ).rejects.toThrow('Failed to fetch aggregated data')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      await expect(
        fetchAggregatedData(
          'user-1',
          'user-2',
          { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
          'daily'
        )
      ).rejects.toThrow('Network failure')
    })

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('JSON parse error')
        }
      })

      await expect(
        fetchAggregatedData(
          'user-1',
          'user-2',
          { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
          'daily'
        )
      ).rejects.toThrow('JSON parse error')
    })

    it('should correctly format dates in ISO format', async () => {
      const mockData = {
        frequency: [],
        responseTime: { avgResponseTime: 0, medianResponseTime: 0, distribution: [] },
        activityHeatmap: [],
        talkToListenRatio: { user1Messages: 0, user2Messages: 0, user1Percentage: 50, user2Percentage: 50 },
        conversationTypes: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      // Use dates with specific times to ensure proper formatting
      const fromDate = new Date('2024-01-15T10:30:00.000Z')
      const toDate = new Date('2024-02-20T15:45:00.000Z')

      await fetchAggregatedData(
        'user-1',
        'user-2',
        { from: fromDate, to: toDate },
        'weekly'
      )

      const callUrl = mockFetch.mock.calls[0][0]
      // Should only include date part, not time
      expect(callUrl).toContain('dateFrom=2024-01-15')
      expect(callUrl).toContain('dateTo=2024-02-20')
      expect(callUrl).not.toContain('T10:30')
      expect(callUrl).not.toContain('T15:45')
    })

    it('should handle 400 errors appropriately', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      await expect(
        fetchAggregatedData(
          'user-1',
          'user-2',
          { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
          'daily'
        )
      ).rejects.toThrow('Failed to fetch aggregated data')
    })

    it('should handle 404 errors appropriately', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(
        fetchAggregatedData(
          'user-1',
          'user-2',
          { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
          'daily'
        )
      ).rejects.toThrow('Failed to fetch aggregated data')
    })
  })
})