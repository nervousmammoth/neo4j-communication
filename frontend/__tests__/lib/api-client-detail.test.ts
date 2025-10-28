import { getConversationDetail, getConversationMessages } from '@/lib/api-client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock global fetch
global.fetch = vi.fn()

describe('api-client detail functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // These functions are typically called from server-side components
    // Mock server environment by removing window
    delete (global as any).window
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getConversationDetail', () => {
    const mockConversation = {
      conversationId: 'conv-001',
      title: 'Test Conversation',
      type: 'group',
      priority: 'high',
      createdAt: '2024-01-15T10:00:00Z',
      tags: ['test'],
      participants: []
    }

    it('should fetch conversation detail successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation
      } as Response)

      const result = await getConversationDetail('conv-001')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/conversations/conv-001',
        { next: { revalidate: 60 } }
      )
      expect(result).toEqual(mockConversation)
    })

    it('should throw error when response is not ok', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      } as Response)

      await expect(getConversationDetail('conv-001')).rejects.toThrow(
        'Failed to fetch conversation detail'
      )
    })

    it('should throw error when response is not an object', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => null
      } as Response)

      await expect(getConversationDetail('conv-001')).rejects.toThrow(
        'Invalid API response: expected object'
      )
    })

    it('should throw error when conversationId is missing', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'Test' })
      } as Response)

      await expect(getConversationDetail('conv-001')).rejects.toThrow(
        'Invalid API response: missing conversationId'
      )
    })

    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Network error')
      
      vi.mocked(global.fetch).mockRejectedValueOnce(error)

      await expect(getConversationDetail('conv-001')).rejects.toThrow('Network error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching conversation detail:', error)
    })
  })

  describe('getConversationMessages', () => {
    const mockResponse = {
      messages: [
        {
          messageId: 'msg-001',
          content: 'Hello',
          senderId: 'user-001',
          timestamp: '2024-01-15T10:00:00Z',
          status: 'delivered',
          type: 'text',
          reactions: {}
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 100,
        totalPages: 2
      }
    }

    it('should fetch messages successfully with default params', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await getConversationMessages('conv-001')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/conversations/conv-001/messages?page=1&limit=50',
        { next: { revalidate: 30 } }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should fetch messages with custom page and limit', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await getConversationMessages('conv-001', 3, 20)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/conversations/conv-001/messages?page=3&limit=20',
        { next: { revalidate: 30 } }
      )
    })

    it('should throw error when response is not ok', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      } as Response)

      await expect(getConversationMessages('conv-001')).rejects.toThrow(
        'Failed to fetch messages'
      )
    })

    it('should throw error when response is not an object', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => 'not-an-object'
      } as Response)

      await expect(getConversationMessages('conv-001')).rejects.toThrow(
        'Invalid API response: expected object'
      )
    })

    it('should throw error when messages is not an array', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: 'not-an-array', pagination: {} })
      } as Response)

      await expect(getConversationMessages('conv-001')).rejects.toThrow(
        'Invalid API response: messages must be an array'
      )
    })

    it('should throw error when pagination is missing', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] })
      } as Response)

      await expect(getConversationMessages('conv-001')).rejects.toThrow(
        'Invalid API response: missing pagination'
      )
    })

    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Network error')
      
      vi.mocked(global.fetch).mockRejectedValueOnce(error)

      await expect(getConversationMessages('conv-001')).rejects.toThrow('Network error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching messages:', error)
    })
  })
})