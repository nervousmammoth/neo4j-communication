import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageList from '@/components/message-list'
import { getConversationMessages } from '@/lib/api-client'
import { formatMessageTime, getFullTimestamp } from '@/lib/timestamp'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  getConversationMessages: vi.fn()
}))

// Get the mocked function
const mockedGetConversationMessages = vi.mocked(getConversationMessages)

// Shared test data
const mockMessages = [
  {
    messageId: 'msg-001',
    content: 'Hello everyone!',
    senderId: 'user-001',
    timestamp: '2024-01-15T10:00:00Z',
    status: 'delivered',
    type: 'text',
    reactions: { '👍': 2, '❤️': 1 }
  },
  {
    messageId: 'msg-002',
    content: 'How is the project going?',
    senderId: 'user-002',
    timestamp: '2024-01-15T10:05:00Z',
    status: 'delivered',
    type: 'text',
    reactions: {}
  }
]

const mockPagination = {
  page: 1,
  limit: 50,
  total: 100,
  totalPages: 2
}

describe('MessageList', () => {
  beforeEach(() => {
    // Reset all mocks to their initial state
    vi.resetAllMocks()
    // Set up a default resolved value to prevent hanging promises
    mockedGetConversationMessages.mockResolvedValue({
      messages: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
    })
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render messages title', async () => {
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      messages: mockMessages,
      pagination: mockPagination
    })

    render(<MessageList conversationId="conv-001" />)
    
    await waitFor(() => {
      expect(screen.getByText('Messages (100)')).toBeInTheDocument()
    })
  })

  it('should render all messages', async () => {
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      messages: mockMessages,
      pagination: mockPagination
    })

    render(<MessageList conversationId="conv-001" />)
    
    await waitFor(() => {
      expect(screen.getByText('Hello everyone!')).toBeInTheDocument()
      expect(screen.getByText('How is the project going?')).toBeInTheDocument()
    })
  })

  it('should render sender IDs', async () => {
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      messages: mockMessages,
      pagination: mockPagination
    })

    render(<MessageList conversationId="conv-001" />)
    
    await waitFor(() => {
      expect(screen.getByText('user-001')).toBeInTheDocument()
      expect(screen.getByText('user-002')).toBeInTheDocument()
    })
  })


  it('should render reactions', async () => {
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      messages: mockMessages,
      pagination: mockPagination
    })

    render(<MessageList conversationId="conv-001" />)
    
    await waitFor(() => {
      expect(screen.getByText('👍 2')).toBeInTheDocument()
      expect(screen.getByText('❤️ 1')).toBeInTheDocument()
    })
  })

  it('should render pagination controls', async () => {
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      messages: mockMessages,
      pagination: mockPagination
    })

    render(<MessageList conversationId="conv-001" />)
    
    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    })
  })

  it('should disable Previous button on first page', async () => {
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      messages: mockMessages,
      pagination: mockPagination
    })

    render(<MessageList conversationId="conv-001" />)
    
    await waitFor(() => {
      const prevButton = screen.getByText('Previous')
      expect(prevButton).toBeDisabled()
    })
  })

  it('should disable Next button on last page', async () => {
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      messages: mockMessages,
      pagination: { ...mockPagination, page: 2, totalPages: 2 }
    })

    render(<MessageList conversationId="conv-001" />)
    
    await waitFor(() => {
      const nextButton = screen.getByText('Next')
      expect(nextButton).toBeDisabled()
    })
  })

  it('should handle pagination click', async () => {
    const user = userEvent.setup()
    
    vi.mocked(getConversationMessages)
      .mockResolvedValueOnce({
        messages: mockMessages,
        pagination: mockPagination
      })
      .mockResolvedValueOnce({
        messages: [],
        pagination: { ...mockPagination, page: 2 }
      })

    render(<MessageList conversationId="conv-001" />)
    
    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Next'))

    // Don't check exact call count due to React strict mode and re-renders
    expect(getConversationMessages).toHaveBeenCalledWith('conv-001', 2, 50)
  })

  it('should show loading state', () => {
    vi.mocked(getConversationMessages).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    )

    render(<MessageList conversationId="conv-001" />)
    
    expect(screen.getByText('Loading messages...')).toBeInTheDocument()
  })

  it('should show error state', async () => {
    vi.mocked(getConversationMessages).mockRejectedValueOnce(
      new Error('Failed to fetch messages')
    )

    render(<MessageList conversationId="conv-001" />)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch messages/)).toBeInTheDocument()
    })
  })

  it('should show error state with non-Error rejection', async () => {
    vi.mocked(getConversationMessages).mockRejectedValueOnce('String error')

    render(<MessageList conversationId="conv-001" />)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load messages/)).toBeInTheDocument()
    })
  })

  it('should show empty state', async () => {
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      messages: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
    })

    render(<MessageList conversationId="conv-001" />)
    
    await waitFor(() => {
      expect(screen.getByText('No messages in this conversation')).toBeInTheDocument()
    })
  })

  it('should reload messages when conversationId changes', async () => {
    const { rerender } = render(<MessageList conversationId="conv-001" />)
    
    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      messages: mockMessages,
      pagination: mockPagination
    })

    await waitFor(() => {
      expect(getConversationMessages).toHaveBeenCalledWith('conv-001', 1, 50)
    })

    vi.mocked(getConversationMessages).mockResolvedValueOnce({
      messages: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
    })

    rerender(<MessageList conversationId="conv-002" />)

    await waitFor(() => {
      expect(getConversationMessages).toHaveBeenCalledWith('conv-002', 1, 50)
    })
  })


  it('should handle pagination button clicks correctly', async () => {
    const user = userEvent.setup()
    
    // Mock sequential responses for different pages
    vi.mocked(getConversationMessages)
      .mockResolvedValueOnce({
        // Initial load - page 2
        messages: mockMessages,
        pagination: { page: 2, limit: 50, total: 150, totalPages: 3 }
      })
      .mockResolvedValueOnce({
        // After clicking Previous - page 1
        messages: mockMessages,
        pagination: { page: 1, limit: 50, total: 150, totalPages: 3 }
      })
      .mockResolvedValueOnce({
        // After clicking Next - page 2
        messages: mockMessages,
        pagination: { page: 2, limit: 50, total: 150, totalPages: 3 }
      })

    render(<MessageList conversationId="conv-001" />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    })
    
    // Verify both buttons are enabled on middle page
    const prevButton = screen.getByText('Previous')
    const nextButton = screen.getByText('Next')
    expect(prevButton).not.toBeDisabled()
    expect(nextButton).not.toBeDisabled()
    
    // Test clicking Previous (should go to page 1)
    await user.click(prevButton)
    
    // Check the call was made with page 1
    await waitFor(() => {
      expect(getConversationMessages).toHaveBeenCalledWith('conv-001', 1, 50)
    })
    
    // Wait for the page to update to page 1
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    })
    
    // Now the Previous button should be disabled
    expect(screen.getByText('Previous')).toBeDisabled()
    
    // Click Next to go back to page 2
    await user.click(screen.getByText('Next'))
    
    // Check the call was made with page 2
    await waitFor(() => {
      expect(getConversationMessages).toHaveBeenLastCalledWith('conv-001', 2, 50)
    })
  })

  // Simple test to cover the onClick functions
  it('should call loadMessages when pagination buttons are clicked', async () => {
    const user = userEvent.setup()
    
    // Mock response with multiple pages
    vi.mocked(getConversationMessages).mockResolvedValue({
      messages: mockMessages,
      pagination: { page: 2, limit: 50, total: 150, totalPages: 3 }
    })

    render(<MessageList conversationId="conv-001" />)
    
    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    })
    
    // Click Previous button
    const prevButton = screen.getByText('Previous')
    await user.click(prevButton)
    
    // Verify the API was called (this covers the onClick function)
    expect(getConversationMessages).toHaveBeenCalledTimes(2) // Initial load + click
    
    // Click Next button
    const nextButton = screen.getByText('Next')
    await user.click(nextButton)
    
    // Verify the API was called again
    expect(getConversationMessages).toHaveBeenCalledTimes(3) // Initial + prev + next
  })

})

// Separate describe block for timestamp-related tests that need fake timers
describe('MessageList - Timestamp Tests', () => {
  beforeEach(() => {
    // Reset all mocks 
    vi.resetAllMocks()
    // Set up fake timers with shouldAdvanceTime to allow React's internal timers
    vi.useFakeTimers({ shouldAdvanceTime: true })
    // Set a consistent date for timestamp testing
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))
    // Set up default mock
    mockedGetConversationMessages.mockResolvedValue({
      messages: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
    })
  })
  
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should format timestamps with deterministic dates', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      messages: mockMessages,
      pagination: mockPagination
    })

    render(<MessageList conversationId="conv-001" />)
    
    // Wait for messages to load
    await screen.findByText('Hello everyone!')
    
    // With mocked date 2025-06-01, timestamps from 2024 should show year
    const timestampElements = screen.getAllByText(/Jan 15, 2024/)
    expect(timestampElements.length).toBeGreaterThan(0)
  })

  it('should format timestamps correctly for single message', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      messages: [{
        messageId: 'msg-timestamp-test',
        content: 'Message with timestamp',
        senderId: 'user-123',
        timestamp: '2024-01-15T10:30:00Z',
        status: 'delivered',
        type: 'text',
        reactions: {}
      }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
    })

    render(<MessageList conversationId="conv-001" />)
    
    // Wait for content to load
    await screen.findByText('Message with timestamp')
    
    // With mocked date 2025-06-01, timestamps from 2024 should show year
    expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument()
  })

  it('should use the new timestamp utilities and show date separators', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      messages: mockMessages,
      pagination: mockPagination
    })

    render(<MessageList conversationId="conv-001" />)
    
    // Wait for messages to load
    await screen.findByText('Hello everyone!')

    // Should show enhanced timestamps and date separators
    expect(screen.getByText('Next')).toBeInTheDocument() // Next button
    // With mocked date 2025-06-01, date separator should include year for 2024 messages
    expect(screen.getByText('Monday, January 15, 2024')).toBeInTheDocument() // Date separator
  })
})