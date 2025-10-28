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

  it('should render view toggle', () => {
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
        viewMode="timeline"
      />
    )

    expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
    expect(screen.getByText('Current: list')).toBeInTheDocument()
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

  it('should apply different styles for user1 and user2 messages', () => {
    const { container } = render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
      />
    )

    // Check for different border colors
    const user1Messages = container.querySelectorAll('.border-l-blue-500')
    const user2Messages = container.querySelectorAll('.border-l-green-500')
    
    expect(user1Messages.length).toBeGreaterThan(0)
    expect(user2Messages.length).toBeGreaterThan(0)
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

  it('should switch between timeline and grouped views', async () => {
    const user = userEvent.setup()
    
    render(
      <MessageTimeline
        messages={mockMessages}
        pagination={mockPagination}
        user1={mockUser1}
        user2={mockUser2}
        viewMode="list"
      />
    )

    // Find the card view toggle button (Grid icon)
    const cardViewButton = screen.getByLabelText('Card view')
    await user.click(cardViewButton)

    // Should now show grouped view content
    // Wait for the view to change - grouped view has different structure
    await waitFor(() => {
      // In grouped view, messages are grouped by conversation
      const generalChatHeading = screen.getByText('General Chat')
      expect(generalChatHeading).toBeInTheDocument()
    })
  })
})