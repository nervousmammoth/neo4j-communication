import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserConversationsList } from '@/components/user-conversations-list'
import { useRouter } from 'next/navigation'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

// Mock date formatting
vi.mock('@/lib/date-formatting', () => ({
  formatLastSeen: (date: string) => `Formatted: ${date}`
}))

// Mock icons
vi.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="message-icon">MessageCircle</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  ChevronRight: () => <div data-testid="chevron-icon">ChevronRight</div>,
  Loader2: () => <div data-testid="loader-icon">Loader2</div>,
  AlertCircle: () => <div data-testid="alert-icon">AlertCircle</div>
}))

describe('UserConversationsList', () => {
  const mockPush = vi.fn()
  const mockConversations = [
    {
      conversationId: 'conv-1',
      title: 'Project Discussion',
      type: 'group',
      lastMessageTimestamp: '2025-01-14T09:00:00Z',
      messageCount: 25,
      participantCount: 5,
      lastMessagePreview: 'Latest update on the project'
    },
    {
      conversationId: 'conv-2',
      title: 'Team Standup',
      type: 'group',
      lastMessageTimestamp: '2025-01-13T15:00:00Z',
      messageCount: 10,
      participantCount: 8,
      lastMessagePreview: 'Meeting at 10am tomorrow'
    },
    {
      conversationId: 'conv-3',
      title: 'Direct Message',
      type: 'direct',
      lastMessageTimestamp: '2025-01-12T12:00:00Z',
      messageCount: 50,
      participantCount: 2,
      lastMessagePreview: 'Thanks for the help!'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn()
    } as any)
  })

  it('should render conversations list', () => {
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
      />
    )

    // Check if all conversations are rendered
    expect(screen.getByText('Project Discussion')).toBeInTheDocument()
    expect(screen.getByText('Team Standup')).toBeInTheDocument()
    expect(screen.getByText('Direct Message')).toBeInTheDocument()
  })

  it('should display conversation details correctly', () => {
    render(
      <UserConversationsList 
        conversations={[mockConversations[0]]} 
        userId="user-123"
      />
    )

    expect(screen.getByText('Project Discussion')).toBeInTheDocument()
    expect(screen.getByText('25 messages')).toBeInTheDocument()
    expect(screen.getByText('5 participants')).toBeInTheDocument()
    expect(screen.getByText('Latest update on the project')).toBeInTheDocument()
    expect(screen.getByText('Formatted: 2025-01-14T09:00:00Z')).toBeInTheDocument()
  })

  it('should navigate to conversation detail on click', async () => {
    const user = userEvent.setup()
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
      />
    )

    const firstConversation = screen.getByText('Project Discussion')
    await user.click(firstConversation)

    expect(mockPush).toHaveBeenCalledWith('/conversations/conv-1')
  })

  it('should show empty state when no conversations', () => {
    render(
      <UserConversationsList 
        conversations={[]} 
        userId="user-123"
      />
    )

    expect(screen.getByText('No conversations yet')).toBeInTheDocument()
    expect(screen.getByText('This user has not participated in any conversations.')).toBeInTheDocument()
  })

  it('should handle loading state', () => {
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
        isLoading={true}
      />
    )

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    expect(screen.getByText('Loading more conversations...')).toBeInTheDocument()
  })

  it('should handle load more functionality', async () => {
    const user = userEvent.setup()
    const onLoadMore = vi.fn()
    
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
        hasMore={true}
        onLoadMore={onLoadMore}
      />
    )

    const loadMoreButton = screen.getByRole('button', { name: /load more/i })
    expect(loadMoreButton).toBeInTheDocument()

    await user.click(loadMoreButton)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('should not show load more button when hasMore is false', () => {
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
        hasMore={false}
      />
    )

    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('should show loading state instead of load more button while loading', () => {
    const onLoadMore = vi.fn()
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
        hasMore={true}
        isLoading={true}
        onLoadMore={onLoadMore}
      />
    )

    // Should show loading text instead of button
    expect(screen.getByText(/Loading more conversations.../i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('should show conversation type badges', () => {
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
      />
    )

    const groupBadges = screen.getAllByText('group')
    expect(groupBadges).toHaveLength(2)
    
    const directBadge = screen.getByText('direct')
    expect(directBadge).toBeInTheDocument()
  })

  it('should truncate long conversation titles', () => {
    const longTitleConversation = {
      ...mockConversations[0],
      title: 'This is a very long conversation title that should be truncated in the UI to maintain a clean layout'
    }

    render(
      <UserConversationsList 
        conversations={[longTitleConversation]} 
        userId="user-123"
      />
    )

    const titleElement = screen.getByText(longTitleConversation.title)
    expect(titleElement).toHaveClass('line-clamp-1')
  })

  it('should truncate long message previews', () => {
    const longPreviewConversation = {
      ...mockConversations[0],
      lastMessagePreview: 'This is a very long message preview that contains a lot of text and should be truncated to maintain a clean and readable interface without taking up too much space'
    }

    render(
      <UserConversationsList 
        conversations={[longPreviewConversation]} 
        userId="user-123"
      />
    )

    const previewElement = screen.getByText(longPreviewConversation.lastMessagePreview)
    expect(previewElement).toHaveClass('line-clamp-2')
  })

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup()
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
      />
    )

    // Tab through conversations
    await user.tab()
    const firstCard = screen.getByText('Project Discussion').closest('[role="button"]')
    expect(firstCard).toHaveFocus()

    // Press Enter to navigate
    await user.keyboard('{Enter}')
    expect(mockPush).toHaveBeenCalledWith('/conversations/conv-1')
  })

  it('should display total conversation count', () => {
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
        totalCount={10}
      />
    )

    expect(screen.getByText('Showing 3 of 10 conversations')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
        className="custom-list"
      />
    )

    const listContainer = container.firstChild
    expect(listContainer).toHaveClass('custom-list')
  })

  it('should show loading skeletons initially', () => {
    render(
      <UserConversationsList 
        conversations={undefined}
        userId="user-123"
      />
    )

    const skeletons = screen.getAllByTestId('conversation-skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should handle error state', () => {
    const onRetry = vi.fn()
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
        error="Failed to load conversations"
        onRetry={onRetry}
      />
    )

    expect(screen.getByText('Failed to load conversations')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('should call onRetry when retry button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
        error="Failed to load conversations"
        onRetry={onRetry}
      />
    )

    const retryButton = screen.getByRole('button', { name: /retry/i })
    await user.click(retryButton)
    
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('should sort conversations by last message timestamp', () => {
    render(
      <UserConversationsList 
        conversations={mockConversations} 
        userId="user-123"
      />
    )

    const conversationTitles = screen.getAllByRole('heading', { level: 3 })
    expect(conversationTitles[0]).toHaveTextContent('Project Discussion')
    expect(conversationTitles[1]).toHaveTextContent('Team Standup')
    expect(conversationTitles[2]).toHaveTextContent('Direct Message')
  })

  it('should highlight conversations with unread messages', () => {
    const conversationsWithUnread = [
      { ...mockConversations[0], hasUnread: true },
      { ...mockConversations[1], hasUnread: false }
    ]

    render(
      <UserConversationsList 
        conversations={conversationsWithUnread} 
        userId="user-123"
      />
    )

    const firstCard = screen.getByText('Project Discussion').closest('.border')
    expect(firstCard).toHaveClass('border-primary')
  })

  it('should handle conversation without title', () => {
    const untitledConversation = {
      ...mockConversations[0],
      title: null
    }

    render(
      <UserConversationsList 
        conversations={[untitledConversation]} 
        userId="user-123"
      />
    )

    expect(screen.getByText('Untitled Conversation')).toBeInTheDocument()
  })

  it('should handle conversation without preview', () => {
    const noPreviewConversation = {
      ...mockConversations[0],
      lastMessagePreview: undefined
    }

    render(
      <UserConversationsList 
        conversations={[noPreviewConversation]} 
        userId="user-123"
      />
    )

    // When there's no preview, the preview section should not be rendered
    expect(screen.queryByText(mockConversations[0].lastMessagePreview!)).not.toBeInTheDocument()
  })
})