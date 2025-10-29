import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageTimeline } from '@/components/message-timeline'
import type { TimelineMessage, UserSummary, PaginationInfo } from '@/lib/neo4j'

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: vi.fn(({ children, height, itemCount, itemSize, width }) => (
    <div data-testid="virtual-list" style={{ height, width }}>
      {Array.from({ length: Math.min(itemCount, 5) }, (_, index) =>
        children({ index, style: { height: itemSize } })
      )}
    </div>
  )),
}))

// Mock components
vi.mock('@/components/pagination-prefetch', () => ({
  PaginationWithPrefetch: vi.fn(({ page, totalPages, limit, total }) => (
    <div data-testid="pagination">
      Page {page} of {totalPages} | {total} total | Limit: {limit}
    </div>
  )),
}))

vi.mock('@/components/view-toggle', () => ({
  ViewToggle: vi.fn(({ view, onViewChange }) => (
    <div data-testid="view-toggle">
      <button aria-label="List view" onClick={() => onViewChange('list')}>List</button>
      <button aria-label="Card view" onClick={() => onViewChange('card')}>Card</button>
      Current: {view}
    </div>
  )),
}))

vi.mock('@/components/user-avatar', () => ({
  UserAvatar: vi.fn(({ user }) => (
    <div data-testid="user-avatar">{user.name}</div>
  )),
}))

// Mock Next.js navigation
const mockRouter = { replace: vi.fn(), push: vi.fn() }
const mockPathname = '/test'
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}))

// Mock date formatting
vi.mock('@/lib/date-formatting', () => ({
  formatLastActivity: vi.fn((date) => 'formatted-date'),
}))

describe('MessageTimeline', () => {
  const mockUser1: UserSummary = {
    userId: 'user1',
    name: 'John Doe',
    email: 'john@example.com',
    username: 'johndoe',
    status: 'active',
    avatarUrl: null,
    lastSeen: '2024-01-15T10:00:00Z',
  }

  const mockUser2: UserSummary = {
    userId: 'user2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    username: 'janesmith',
    status: 'active',
    avatarUrl: null,
    lastSeen: '2024-01-15T11:00:00Z',
  }

  const mockMessages: TimelineMessage[] = [
    {
      messageId: 'msg1',
      content: 'Hello world!',
      senderId: 'user1',
      timestamp: '2024-01-15T09:00:00Z',
      conversationId: 'conv1',
      conversationTitle: 'Project Discussion',
    },
    {
      messageId: 'msg2',
      content: 'Hi there!',
      senderId: 'user2',
      timestamp: '2024-01-15T09:05:00Z',
      conversationId: 'conv1',
      conversationTitle: 'Project Discussion',
    },
    {
      messageId: 'msg3',
      content: 'How are you?',
      senderId: 'user1',
      timestamp: '2024-01-15T09:10:00Z',
      conversationId: 'conv2',
      conversationTitle: 'General Chat',
    },
  ]

  const mockPagination: PaginationInfo = {
    page: 1,
    limit: 50,
    total: 100,
    totalPages: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render message timeline with messages', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    expect(screen.getByText('Message Timeline')).toBeInTheDocument()
    expect(screen.getByText('Hello world!')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
    expect(screen.getByText('How are you?')).toBeInTheDocument()
  })

  it('should display sender names', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    const johnElements = screen.getAllByText('John Doe')
    const janeElements = screen.getAllByText('Jane Smith')
    
    expect(johnElements.length).toBeGreaterThan(0)
    expect(janeElements.length).toBeGreaterThan(0)
  })

  it('should show conversation titles as links', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    const projectLinks = screen.getAllByText('from: Project Discussion')
    expect(projectLinks.length).toBeGreaterThan(0)
    expect(projectLinks[0]).toBeInTheDocument()
    
    const chatLinks = screen.getAllByText('from: General Chat')
    expect(chatLinks.length).toBeGreaterThan(0)
    expect(chatLinks[0]).toBeInTheDocument()
  })

  it('should render search input', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search messages...')
    expect(searchInput).toBeInTheDocument()
  })

  it('should filter messages based on search', async () => {
    const user = userEvent.setup()
    
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search messages...')
    await user.type(searchInput, 'Hello')

    // Should update URL with search param
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining('search=Hello'),
        expect.anything()
      )
    })
  })

  it('should not render view toggle (single view only)', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    // ViewToggle should not exist
    expect(screen.queryByTestId('view-toggle')).not.toBeInTheDocument()
  })

  it('should render pagination', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    expect(screen.getByTestId('pagination')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2 | 100 total | Limit: 50')).toBeInTheDocument()
  })

  it('should handle empty messages', () => {
    render(
      <MessageTimeline
        messages={[]}
        pagination={{ ...mockPagination, total: 0, totalPages: 0 }}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    expect(screen.getByText('No messages found between these users')).toBeInTheDocument()
  })

  it('should apply monochrome styles for user1 and user2 messages', () => {
    const { container } = render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    // Check for monochrome colors instead of colored borders
    const html = container.innerHTML
    expect(html).toContain('bg-gray-100') // user1 messages
    expect(html).toContain('bg-gray-900') // user2 messages

    // Should NOT have colorful borders
    expect(html).not.toContain('border-l-blue-500')
    expect(html).not.toContain('border-l-green-500')
  })

  it('should render virtual list for performance', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument()
  })

  it('should handle search with initial value', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
        searchQuery="Hello"
      />
    )

    const searchInput = screen.getByPlaceholderText('Search messages...') as HTMLInputElement
    expect(searchInput.value).toBe('Hello')
  })

  it('should clear search when input is empty', async () => {
    const user = userEvent.setup()
    
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
        searchQuery="Hello"
      />
    )

    const searchInput = screen.getByPlaceholderText('Search messages...')
    await user.clear(searchInput)

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/test?',
        expect.anything()
      )
    })
  })

})

describe('Chat Bubble Layout (Monochrome Design)', () => {
  const mockUser1: UserSummary = {
    userId: 'user1',
    name: 'Alice',
    email: 'alice@example.com',
    avatarUrl: null,
    status: 'active',
    lastActive: '2024-01-01T00:00:00Z',
  }

  const mockUser2: UserSummary = {
    userId: 'user2',
    name: 'Bob',
    email: 'bob@example.com',
    avatarUrl: null,
    status: 'active',
    lastActive: '2024-01-01T00:00:00Z',
  }

  const mockMessages: TimelineMessage[] = [
    {
      messageId: 'msg1',
      content: 'Message from user1',
      senderId: 'user1',
      timestamp: '2024-01-15T10:00:00Z',
      conversationId: 'conv1',
      conversationTitle: 'Test Conversation',
    },
    {
      messageId: 'msg2',
      content: 'Message from user2',
      senderId: 'user2',
      timestamp: '2024-01-15T10:05:00Z',
      conversationId: 'conv1',
      conversationTitle: 'Test Conversation',
    },
  ]

  const mockPagination: PaginationInfo = {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  }

  it('should not render ViewToggle component', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    // ViewToggle should not be present
    expect(screen.queryByTestId('view-toggle')).not.toBeInTheDocument()
  })

  it('should render only single chat view (no grouped view)', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    // Should have virtual list (single view)
    expect(screen.getByTestId('virtual-list')).toBeInTheDocument()

    // Should not have conversation grouping headings
    expect(screen.queryByText('Test Conversation')).not.toBeInTheDocument()
  })

  it('should display full timestamp for messages', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    // Should show full timestamps (not just relative like "5m ago")
    // Format: "January 15, 2024 at 10:00 AM"
    const container = screen.getByTestId('virtual-list')
    expect(container.textContent).toMatch(/January/)
    expect(container.textContent).toMatch(/2024/)
    expect(container.textContent).toMatch(/at/)
    expect(container.textContent).toMatch(/(AM|PM)/)
  })

  it('should not use colorful borders (blue-500, green-500)', () => {
    const { container } = render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    // Check that no elements have blue-500 or green-500 border classes
    const html = container.innerHTML
    expect(html).not.toContain('border-l-blue-500')
    expect(html).not.toContain('border-l-green-500')
    expect(html).not.toContain('bg-blue-50')
    expect(html).not.toContain('bg-green-50')
  })

  it('should use monochrome colors (gray-100, gray-900)', () => {
    const { container } = render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    const html = container.innerHTML
    // Should have gray backgrounds for chat bubbles
    expect(html).toContain('bg-gray-100')
    expect(html).toContain('bg-gray-900')
  })

  it('should apply chat bubble styling (rounded-2xl, shadow-sm)', () => {
    const { container } = render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    const html = container.innerHTML
    expect(html).toContain('rounded-2xl')
    expect(html).toContain('shadow-sm')
  })

  it('should limit bubble width to 70% (max-w-[70%])', () => {
    const { container } = render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    const html = container.innerHTML
    expect(html).toContain('max-w-[70%]')
  })

  it('should maintain search functionality', async () => {
    const user = userEvent.setup()

    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search messages...')
    expect(searchInput).toBeInTheDocument()

    await user.type(searchInput, 'user1')

    // Router should be called to update URL with search param
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled()
    })
  })
})