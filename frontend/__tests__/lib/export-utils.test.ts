import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportToCSV, downloadFile } from '@/lib/export-utils'
import type { 
  SharedConversation, 
  TimelineMessage, 
  CommunicationStats 
} from '@/lib/neo4j'

describe('export-utils', () => {
  describe('exportToCSV', () => {
    const mockData = {
      conversations: [
        {
          conversationId: 'conv1',
          title: 'Test Conversation',
          type: 'direct' as const,
          createdAt: '2024-01-01T00:00:00Z',
          participantCount: 2,
          messageCount: 10,
          lastMessageTimestamp: '2024-01-02T00:00:00Z',
          lastMessagePreview: 'Last message'
        }
      ] as SharedConversation[],
      messages: [
        {
          messageId: 'msg1',
          conversationId: 'conv1',
          conversationTitle: 'Test Conversation',
          senderId: 'user1',
          content: 'Hello, world!',
          timestamp: '2024-01-01T12:00:00Z',
          type: 'text' as const,
          status: 'sent' as const
        },
        {
          messageId: 'msg2',
          conversationId: 'conv1',
          conversationTitle: 'Test Conversation',
          senderId: 'user2',
          content: 'Message with "quotes" and, commas',
          timestamp: '2024-01-01T12:01:00Z',
          type: 'text' as const,
          status: 'sent' as const
        }
      ] as TimelineMessage[],
      stats: {
        totalSharedConversations: 1,
        totalMessages: 2,
        user1Messages: 1,
        user2Messages: 1,
        averageResponseTime: 60,
        firstInteraction: '2024-01-01T12:00:00Z',
        lastInteraction: '2024-01-01T12:01:00Z',
        messageTypes: {
          text: 2,
          image: 0,
          file: 0,
          other: 0
        }
      } as CommunicationStats
    }

    it('should export data as CSV with correct headers', () => {
      const csv = exportToCSV(mockData)
      
      expect(csv).toContain('Type,Conversation,Sender,Content,Timestamp')
    })

    it('should include summary statistics', () => {
      const csv = exportToCSV(mockData)
      
      expect(csv).toContain('Summary')
      expect(csv).toContain('Total Conversations,1')
      expect(csv).toContain('Total Messages,2')
      expect(csv).toContain('User 1 Messages,1')
      expect(csv).toContain('User 2 Messages,1')
      expect(csv).toContain('First Interaction,2024-01-01T12:00:00Z')
      expect(csv).toContain('Last Interaction,2024-01-01T12:01:00Z')
    })

    it('should include message data', () => {
      const csv = exportToCSV(mockData)
      
      expect(csv).toContain('Message,Test Conversation,user1,"Hello, world!",2024-01-01T12:00:00Z')
      expect(csv).toContain('Message,Test Conversation,user2,"Message with ""quotes"" and, commas",2024-01-01T12:01:00Z')
    })

    it('should properly escape quotes in content', () => {
      const dataWithQuotes = {
        ...mockData,
        messages: [{
          ...mockData.messages[0],
          content: 'Content with "double quotes"'
        }]
      }
      
      const csv = exportToCSV(dataWithQuotes)
      
      // Quotes should be doubled for CSV escaping
      expect(csv).toContain('"Content with ""double quotes""')
    })

    it('should handle empty data gracefully', () => {
      const emptyData = {
        conversations: [],
        messages: [],
        stats: {
          totalSharedConversations: 0,
          totalMessages: 0,
          user1Messages: 0,
          user2Messages: 0,
          averageResponseTime: 0,
          firstInteraction: null,
          lastInteraction: null,
          messageTypes: {
            text: 0,
            image: 0,
            file: 0,
            other: 0
          }
        } as CommunicationStats
      }
      
      const csv = exportToCSV(emptyData)
      
      expect(csv).toContain('Type,Conversation,Sender,Content,Timestamp')
      expect(csv).toContain('Total Conversations,0')
      expect(csv).toContain('Total Messages,0')
      expect(csv).toContain('First Interaction,N/A')
      expect(csv).toContain('Last Interaction,N/A')
    })

    it('should handle null timestamps gracefully', () => {
      const dataWithNullTimestamps = {
        ...mockData,
        stats: {
          ...mockData.stats,
          firstInteraction: null,
          lastInteraction: null
        }
      }
      
      const csv = exportToCSV(dataWithNullTimestamps)
      
      expect(csv).toContain('First Interaction,N/A')
      expect(csv).toContain('Last Interaction,N/A')
    })
  })

  describe('downloadFile', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>
    let mockClick: ReturnType<typeof vi.fn>
    let mockCreateElement: ReturnType<typeof vi.fn>

    beforeEach(() => {
      // Mock URL methods
      mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/test-blob')
      mockRevokeObjectURL = vi.fn()
      mockClick = vi.fn()
      
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL
      
      // Mock document.createElement for anchor element
      const originalCreateElement = document.createElement
      mockCreateElement = vi.fn((tagName: string) => {
        const element = originalCreateElement.call(document, tagName)
        if (tagName === 'a') {
          Object.defineProperty(element, 'click', {
            value: mockClick,
            writable: true
          })
        }
        return element
      })
      document.createElement = mockCreateElement
    })

    it('should create a blob with correct content and type', () => {
      const content = 'test content'
      const filename = 'test.csv'
      const mimeType = 'text/csv'
      
      downloadFile(content, filename, mimeType)
      
      // Check that Blob was created with correct parameters
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })

    it('should create an anchor element and trigger download', () => {
      const content = 'test content'
      const filename = 'test.csv'
      const mimeType = 'text/csv'
      
      downloadFile(content, filename, mimeType)
      
      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockClick).toHaveBeenCalled()
    })

    it('should set correct href and download attributes', () => {
      const content = 'test content'
      const filename = 'test.csv'
      const mimeType = 'text/csv'
      
      downloadFile(content, filename, mimeType)
      
      const anchorElement = mockCreateElement.mock.results[0].value
      expect(anchorElement.href).toBe('blob:http://localhost/test-blob')
      expect(anchorElement.download).toBe(filename)
    })

    it('should clean up blob URL after download', () => {
      const content = 'test content'
      const filename = 'test.csv'
      const mimeType = 'text/csv'
      
      downloadFile(content, filename, mimeType)
      
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-blob')
    })

    it('should handle different MIME types', () => {
      downloadFile('{}', 'data.json', 'application/json')
      
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
    })
  })
})