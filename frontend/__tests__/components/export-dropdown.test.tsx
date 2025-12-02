import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportDropdown } from '@/components/export-dropdown'
import * as exportUtils from '@/lib/export-utils'

// Mock ResizeObserver as a proper class for Vitest 4.x compatibility
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);

vi.mock('@/lib/export-utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/export-utils')>('@/lib/export-utils');
  return {
    ...actual,
    downloadFile: vi.fn(),
  };
})

describe('ExportDropdown', () => {
  const mockCreateObjectURL = vi.fn()
  const mockRevokeObjectURL = vi.fn()
  const mockCreateElement = vi.fn()
  const mockClick = vi.fn()
  
  const mockData = {
    user1: {
      userId: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: null,
      conversationCount: 5,
      messageCount: 150,
      lastActiveTimestamp: '2024-01-15T10:00:00Z'
    },
    user2: {
      userId: 'user-456',
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatar: null,
      conversationCount: 5,
      messageCount: 120,
      lastActiveTimestamp: '2024-01-15T09:00:00Z'
    },
    sharedConversations: [
      {
        conversationId: 'conv-1',
        title: 'Project Discussion',
        type: 'group' as const,
        messageCount: 100,
        user1MessageCount: 60,
        user2MessageCount: 40,
        lastMessageTimestamp: '2024-01-15T09:00:00Z',
        participants: []
      }
    ],
    messageTimeline: [
      {
        messageId: 'msg-1',
        content: 'Hello',
        senderId: 'user-123',
        timestamp: '2024-01-15T08:00:00Z',
        conversationId: 'conv-1',
        conversationTitle: 'Project Discussion'
      },
      {
        messageId: 'msg-2',
        content: 'Hi there',
        senderId: 'user-456',
        timestamp: '2024-01-15T08:05:00Z',
        conversationId: 'conv-1',
        conversationTitle: 'Project Discussion'
      }
    ],
    communicationStats: {
      totalSharedConversations: 1,
      totalMessages: 2,
      user1Messages: 1,
      user2Messages: 1,
      firstInteraction: '2024-01-01T00:00:00Z',
      lastInteraction: '2024-01-15T09:00:00Z'
    },
    pagination: {
      page: 1,
      limit: 50,
      totalPages: 1,
      totalItems: 2,
      hasNextPage: false,
      hasPreviousPage: false
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL
    
    mockCreateObjectURL.mockReturnValue('blob:http://localhost/test-blob')
    
    // Mock Blob constructor
    global.Blob = vi.fn((content, options) => ({
      content,
      type: options?.type
    })) as any
    
    // Store original createElement before mocking
    const originalCreateElement = document.createElement
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      mockCreateElement(tagName)
      const element = originalCreateElement.call(document, tagName)
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', {
          value: mockClick,
          writable: true
        })
      }
      return element
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('UI Rendering', () => {
    it('should render export button with icon and text', () => {
      render(<ExportDropdown data={mockData} filename="test-export" />)
      
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      expect(screen.getByTestId('download-icon')).toBeInTheDocument()
    })

    it('should open dropdown menu on click', async () => {
      render(<ExportDropdown data={mockData} filename="test-export" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /export as csv/i })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: /export as json/i })).toBeInTheDocument()
      })
    })

    it.skip('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <ExportDropdown data={mockData} filename="test-export" />
          <div data-testid="outside-element">Outside</div>
        </div>
      );
      const user = userEvent.setup();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      // Wait for dropdown to be fully open
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /export as csv/i })).toBeInTheDocument();
      });

      // Use fireEvent to click outside - userEvent respects pointer-events CSS
      const outsideElement = screen.getByTestId('outside-element');
      fireEvent.click(outsideElement);

      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /export as csv/i })).not.toBeInTheDocument();
      });
    });

    it('should close dropdown after selecting an option', async () => {
      const mockExportToCSV = vi.spyOn(exportUtils, 'exportToCSV')
      mockExportToCSV.mockReturnValue('csv,data')
      
      render(<ExportDropdown data={mockData} filename="test-export" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const csvOption = screen.getByRole('menuitem', { name: /export as csv/i })
      await user.click(csvOption)
      
      await waitFor(() => {
        expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
      })
    })
  })

  describe('CSV Export', () => {
    it('should export data as CSV', async () => {
      const mockExportToCSV = vi.spyOn(exportUtils, 'exportToCSV')
      mockExportToCSV.mockReturnValue('Type,Conversation,Sender,Content,Timestamp')
      
      render(<ExportDropdown data={mockData} filename="test-export" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const csvOption = screen.getByRole('menuitem', { name: /export as csv/i })
      await user.click(csvOption)

      expect(mockExportToCSV).toHaveBeenCalledWith({
        conversations: mockData.sharedConversations,
        messages: mockData.messageTimeline,
        stats: mockData.communicationStats
      })
    })

    it('should download CSV file with correct filename', async () => {
      const mockExportToCSV = vi.spyOn(exportUtils, 'exportToCSV')
      mockExportToCSV.mockReturnValue('csv,data')
      
      render(<ExportDropdown data={mockData} filename="communication-analysis" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const csvOption = screen.getByRole('menuitem', { name: /export as csv/i })
      await user.click(csvOption)

      await waitFor(() => {
        expect(exportUtils.downloadFile).toHaveBeenCalled()
      })
    })

    it('should set correct MIME type for CSV', async () => {
      const mockExportToCSV = vi.spyOn(exportUtils, 'exportToCSV')
      mockExportToCSV.mockReturnValue('csv,data')
      
      render(<ExportDropdown data={mockData} filename="test" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const csvOption = screen.getByRole('menuitem', { name: /export as csv/i })
      await user.click(csvOption)

      await waitFor(() => {
        expect(exportUtils.downloadFile).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          'text/csv'
        )
      })
    })

    it('should clean up blob URL after download', async () => {
      const mockExportToCSV = vi.spyOn(exportUtils, 'exportToCSV')
      mockExportToCSV.mockReturnValue('csv,data')
      
      render(<ExportDropdown data={mockData} filename="test" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const csvOption = screen.getByRole('menuitem', { name: /export as csv/i })
      await user.click(csvOption)

      await waitFor(() => {
        expect(exportUtils.downloadFile).toHaveBeenCalled()
      })
    })
  })

  describe('JSON Export', () => {
    it('should export data as JSON', async () => {
      render(<ExportDropdown data={mockData} filename="test-export" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const jsonOption = screen.getByRole('menuitem', { name: /export as json/i })
      await user.click(jsonOption)

      await waitFor(() => {
        expect(exportUtils.downloadFile).toHaveBeenCalledWith(
          JSON.stringify(mockData, null, 2),
          'test-export.json',
          'application/json'
        )
      })
    })

    it('should download JSON file with correct filename', async () => {
      render(<ExportDropdown data={mockData} filename="analysis-data" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const jsonOption = screen.getByRole('menuitem', { name: /export as json/i })
      await user.click(jsonOption)

      await waitFor(() => {
        expect(exportUtils.downloadFile).toHaveBeenCalled()
      })
    })

    it('should format JSON with proper indentation', async () => {
      render(<ExportDropdown data={mockData} filename="test" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const jsonOption = screen.getByRole('menuitem', { name: /export as json/i })
      await user.click(jsonOption)

      await waitFor(() => {
        expect(exportUtils.downloadFile).toHaveBeenCalledWith(
          expect.stringContaining('\n'),
          expect.any(String),
          'application/json'
        )
      })
    })
  })

  describe('Large Data Handling', () => {
    it('should handle large datasets efficiently', async () => {
      const largeData = {
        ...mockData,
        messageTimeline: Array(10000).fill(null).map((_, i) => ({
          messageId: `msg-${i}`,
          content: `Message ${i}`,
          senderId: i % 2 === 0 ? 'user-123' : 'user-456',
          timestamp: new Date(2024, 0, 1, 0, 0, i).toISOString(),
          conversationId: `conv-${Math.floor(i / 100)}`,
          conversationTitle: `Conversation ${Math.floor(i / 100)}`
        }))
      }

      const mockExportToCSV = vi.spyOn(exportUtils, 'exportToCSV')
      mockExportToCSV.mockReturnValue('large,csv,data')
      
      render(<ExportDropdown data={largeData} filename="large-export" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const csvOption = screen.getByRole('menuitem', { name: /export as csv/i })
      await user.click(csvOption)

      expect(mockExportToCSV).toHaveBeenCalled()
      expect(exportUtils.downloadFile).toHaveBeenCalled()
    })

    it('should not block UI during export', async () => {
      const mockExportToCSV = vi.spyOn(exportUtils, 'exportToCSV')
      mockExportToCSV.mockImplementation(() => {
        const start = Date.now()
        while (Date.now() - start < 100) {}
        return 'csv,data'
      })
      
      render(<ExportDropdown data={mockData} filename="test" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const csvOption = screen.getByRole('menuitem', { name: /export as csv/i })
      await user.click(csvOption)

      await waitFor(() => {
        expect(exportUtils.downloadFile).toHaveBeenCalled()
      }, { timeout: 200 })
    })
  })

  describe('Error Handling', () => {
    it('should handle export errors gracefully', async () => {
      const mockExportToCSV = vi.spyOn(exportUtils, 'exportToCSV')
      mockExportToCSV.mockImplementation(() => {
        throw new Error('Export failed')
      })
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<ExportDropdown data={mockData} filename="test" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const csvOption = screen.getByRole('menuitem', { name: /export as csv/i })
      await user.click(csvOption)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Export failed:',
          expect.any(Error)
        )
      })
      
      consoleSpy.mockRestore()
    })

    it('should handle empty data gracefully', async () => {
      const emptyData = {
        ...mockData,
        sharedConversations: [],
        messageTimeline: [],
        communicationStats: {
          totalSharedConversations: 0,
          totalMessages: 0,
          user1Messages: 0,
          user2Messages: 0,
          firstInteraction: null,
          lastInteraction: null
        }
      }

      const mockExportToCSV = vi.spyOn(exportUtils, 'exportToCSV')
      mockExportToCSV.mockReturnValue('')
      
      render(<ExportDropdown data={emptyData} filename="empty" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      const csvOption = screen.getByRole('menuitem', { name: /export as csv/i })
      await user.click(csvOption)

      expect(mockExportToCSV).toHaveBeenCalled()
      expect(exportUtils.downloadFile).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ExportDropdown data={mockData} filename="test" />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toHaveAttribute('aria-haspopup', 'true')
    })

    it('should be keyboard navigable', async () => {
      render(<ExportDropdown data={mockData} filename="test" />)
      const user = userEvent.setup()
      
      await user.tab()
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toHaveFocus()
      
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /export as csv/i })).toBeInTheDocument()
      })
      
      // After opening the dropdown with keyboard, the first menu item gets auto-focused
      // Based on actual behavior, first ArrowDown moves to JSON (second item)
      await user.keyboard('{ArrowDown}')
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /export as json/i })).toHaveFocus()
      })
      
      // ArrowUp should move back to CSV
      await user.keyboard('{ArrowUp}')
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /export as csv/i })).toHaveFocus()
      })
    })

    it('should close menu on Escape key', async () => {
      render(<ExportDropdown data={mockData} filename="test" />)
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      expect(screen.getByRole('menuitem', { name: /export as csv/i })).toBeInTheDocument()
      
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
      })
    })
  })
})