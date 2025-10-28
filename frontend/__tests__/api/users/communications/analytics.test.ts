import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/users/communications/[userId1]/[userId2]/analytics/route'
import { NextRequest } from 'next/server'
import { getAggregatedCommunicationData } from '@/lib/neo4j'

// The global mock is already set up in vitest.setup.ts
// Get the mocked function directly
const mockGetAggregatedCommunicationData = vi.mocked(getAggregatedCommunicationData)

describe('/api/users/communications/[userId1]/[userId2]/analytics', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createRequest = (
    userId1: string,
    userId2: string,
    params: Record<string, string> = {}
  ) => {
    const url = new URL(
      `http://localhost:3000/api/users/communications/${userId1}/${userId2}/analytics`
    )
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
    return new NextRequest(url)
  }

  describe('Parameter Validation', () => {
    it('should reject missing userId1', async () => {
      const request = createRequest('', 'user-456')
      const response = await GET(request, {
        params: { userId1: '', userId2: 'user-456' }
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Both user IDs are required')
    })

    it('should reject missing userId2', async () => {
      const request = createRequest('user-123', '')
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: '' }
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Both user IDs are required')
    })

    it('should reject invalid userId1 format', async () => {
      const request = createRequest('user@123', 'user-456')
      const response = await GET(request, {
        params: { userId1: 'user@123', userId2: 'user-456' }
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid userId1')
    })

    it('should reject invalid userId2 format', async () => {
      const request = createRequest('user-123', 'user@456')
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user@456' }
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid userId2')
    })

    it('should reject invalid dateFrom format', async () => {
      const request = createRequest('user-123', 'user-456', {
        dateFrom: '2024-13-45'
      })
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid dateFrom')
    })

    it('should reject dateFrom that passes regex but is invalid date', async () => {
      const request = createRequest('user-123', 'user-456', {
        dateFrom: '2024-99-99' // Invalid month and day
      })
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid dateFrom format. Date is not valid.')
    })

    it('should reject invalid dateTo format', async () => {
      const request = createRequest('user-123', 'user-456', {
        dateTo: 'not-a-date'
      })
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid dateTo')
    })

    it('should reject dateTo that passes regex but is invalid date', async () => {
      const request = createRequest('user-123', 'user-456', {
        dateTo: '2024-99-99' // Invalid month and day
      })
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid dateTo format. Date is not valid.')
    })

    it('should reject invalid granularity values', async () => {
      const request = createRequest('user-123', 'user-456', {
        granularity: 'invalid'
      })
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid granularity')
    })
  })

  describe('Successful Data Aggregation', () => {
    const mockAggregatedData = {
      frequency: [
        { date: '2024-01-01', totalMessages: 100, user1Messages: 60, user2Messages: 40 },
        { date: '2024-01-02', totalMessages: 120, user1Messages: 70, user2Messages: 50 }
      ],
      responseTime: {
        avgResponseTime: 3600000,
        medianResponseTime: 1800000,
        distribution: [
          { range: '<1h', count: 50 },
          { range: '1-6h', count: 30 },
          { range: '6-24h', count: 15 },
          { range: '>24h', count: 5 }
        ]
      },
      activityHeatmap: [
        { hour: 0, dayOfWeek: 1, messageCount: 10 },
        { hour: 9, dayOfWeek: 2, messageCount: 45 },
        { hour: 14, dayOfWeek: 3, messageCount: 60 }
      ],
      talkToListenRatio: {
        user1Messages: 1500,
        user2Messages: 1200,
        user1Percentage: 55.56,
        user2Percentage: 44.44
      },
      conversationTypes: [
        { type: 'group', count: 25, percentage: 62.5 },
        { type: 'direct', count: 15, percentage: 37.5 }
      ]
    }

    it('should return aggregated data with default granularity', async () => {
      mockGetAggregatedCommunicationData.mockResolvedValueOnce(mockAggregatedData)

      const request = createRequest('user-123', 'user-456')
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockAggregatedData)
      expect(mockGetAggregatedCommunicationData).toHaveBeenCalledWith(
        'user-123',
        'user-456',
        {
          dateFrom: undefined,
          dateTo: undefined,
          granularity: 'daily'
        }
      )
    })

    it('should apply date filtering', async () => {
      mockGetAggregatedCommunicationData.mockResolvedValueOnce(mockAggregatedData)

      const request = createRequest('user-123', 'user-456', {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      })
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })

      expect(response.status).toBe(200)
      expect(mockGetAggregatedCommunicationData).toHaveBeenCalledWith(
        'user-123',
        'user-456',
        {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          granularity: 'daily'
        }
      )
    })

    it('should support different granularities', async () => {
      mockGetAggregatedCommunicationData.mockResolvedValueOnce(mockAggregatedData)

      const request = createRequest('user-123', 'user-456', {
        granularity: 'monthly'
      })
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })

      expect(response.status).toBe(200)
      expect(mockGetAggregatedCommunicationData).toHaveBeenCalledWith(
        'user-123',
        'user-456',
        {
          dateFrom: undefined,
          dateTo: undefined,
          granularity: 'monthly'
        }
      )
    })

    it('should cache responses appropriately', async () => {
      mockGetAggregatedCommunicationData.mockResolvedValueOnce(mockAggregatedData)

      const request = createRequest('user-123', 'user-456')
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockGetAggregatedCommunicationData.mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      const request = createRequest('user-123', 'user-456')
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch aggregated communication data')
    })

    it('should handle empty data gracefully', async () => {
      mockGetAggregatedCommunicationData.mockResolvedValueOnce({
        frequency: [],
        responseTime: {
          avgResponseTime: 0,
          medianResponseTime: 0,
          distribution: []
        },
        activityHeatmap: [],
        talkToListenRatio: {
          user1Messages: 0,
          user2Messages: 0,
          user1Percentage: 50,
          user2Percentage: 50
        },
        conversationTypes: []
      })

      const request = createRequest('user-123', 'user-456')
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.frequency).toEqual([])
      expect(data.talkToListenRatio.user1Messages).toBe(0)
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = {
        frequency: Array(365).fill(null).map((_, i) => ({
          date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
          totalMessages: Math.floor(Math.random() * 1000),
          user1Messages: Math.floor(Math.random() * 500),
          user2Messages: Math.floor(Math.random() * 500)
        })),
        responseTime: {
          avgResponseTime: 3600000,
          medianResponseTime: 1800000,
          distribution: Array(24).fill(null).map((_, i) => ({
            range: `${i}h`,
            count: Math.floor(Math.random() * 100)
          }))
        },
        activityHeatmap: Array(168).fill(null).map((_, i) => ({
          hour: i % 24,
          dayOfWeek: Math.floor(i / 24),
          messageCount: Math.floor(Math.random() * 100)
        })),
        talkToListenRatio: {
          user1Messages: 4000000,
          user2Messages: 4000000,
          user1Percentage: 50,
          user2Percentage: 50
        },
        conversationTypes: [
          { type: 'group', count: 750, percentage: 50 },
          { type: 'direct', count: 750, percentage: 50 }
        ]
      }

      mockGetAggregatedCommunicationData.mockResolvedValueOnce(largeDataset)

      const start = Date.now()
      const request = createRequest('user-123', 'user-456')
      const response = await GET(request, {
        params: { userId1: 'user-123', userId2: 'user-456' }
      })
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(1000)
      
      const data = await response.json()
      expect(data.frequency).toHaveLength(365)
      expect(data.activityHeatmap).toHaveLength(168)
    })
  })
})