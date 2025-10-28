import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConversationsView } from '@/components/conversations-view'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ConversationSummary } from '@/lib/neo4j'

// Mock the ViewToggle component
vi.mock('@/components/view-toggle', () => ({
  ViewToggle: ({ view, onViewChange }: any) => (
    <div data-testid="view-toggle">
      <button
        data-testid="toggle-list"
        onClick={() => onViewChange('list')}
        className={view === 'list' ? 'active' : ''}
      >
        List
      </button>
      <button
        data-testid="toggle-card"
        onClick={() => onViewChange('card')}
        className={view === 'card' ? 'active' : ''}
      >
        Card
      </button>
    </div>
  )
}))

// Mock the ConversationsList component
vi.mock('@/components/conversations-list', () => ({
  ConversationsList: ({ conversations }: any) => (
    <div data-testid="conversations-list">
      {conversations.map((conv: any) => (
        <div key={conv.conversationId} data-testid={`list-conversation-${conv.conversationId}`}>
          {conv.title}
        </div>
      ))}
    </div>
  )
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>{children}</a>
  )
}))

// Mock the useViewPreference hook
vi.mock('@/hooks/useViewPreference', () => ({
  useViewPreference: vi.fn(() => ({
    view: 'list',
    setView: vi.fn()
  }))
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Clock: () => <div data-testid="clock-icon" />
}))

import { useViewPreference } from '@/hooks/useViewPreference'

describe('ConversationsView', () => {
  const mockConversations: ConversationSummary[] = [
    {
      conversationId: 'conv-001',
      title: 'Project Discussion',
      participantCount: 5,
      messageCount: 100,
      lastMessageTimestamp: '2024-01-15T10:30:00Z',
      type: 'group',
      priority: 'high'
    },
    {
      conversationId: 'conv-002',
      title: 'Daily Standup',
      participantCount: 3,
      messageCount: 50,
      lastMessageTimestamp: '2024-01-14T09:00:00Z',
      type: 'group',
      priority: 'normal'
    },
    {
      conversationId: 'conv-003',
      title: null, // Test untitled conversation
      participantCount: 2,
      messageCount: 25,
      lastMessageTimestamp: '2024-01-13T15:45:00Z',
      type: 'direct',
      priority: 'normal'
    }
  ]

  const mockSetView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the mock to return 'list' view by default
    vi.mocked(useViewPreference).mockReturnValue({
      view: 'list',
      setView: mockSetView
    })
  })

  it('should render header with title and view toggle', () => {
    render(<ConversationsView conversations={mockConversations} currentPage={1} />)
    
    expect(screen.getByText('Conversations')).toBeInTheDocument()
    expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
  })

  it('should render conversations list in list view', () => {
    render(<ConversationsView conversations={mockConversations} currentPage={1} />)
    
    expect(screen.getByTestId('conversations-list')).toBeInTheDocument()
    expect(screen.getByTestId('list-conversation-conv-001')).toHaveTextContent('Project Discussion')
    expect(screen.queryByTestId('card-conversation-conv-001')).not.toBeInTheDocument()
  })

  it('should render conversations in card view when view is card', () => {
    // Mock the hook to return 'card' view
    vi.mocked(useViewPreference).mockReturnValue({
      view: 'card',
      setView: mockSetView
    })

    render(<ConversationsView conversations={mockConversations} currentPage={2} />)
    
    expect(screen.queryByTestId('conversations-list')).not.toBeInTheDocument()
    expect(screen.getByText('Project Discussion')).toBeInTheDocument()
    expect(screen.getByText('Daily Standup')).toBeInTheDocument()
  })

  it('should render conversation cards with correct information', () => {
    vi.mocked(useViewPreference).mockReturnValue({
      view: 'card',
      setView: mockSetView
    })

    render(<ConversationsView conversations={mockConversations} currentPage={1} />)
    
    // Check first conversation card
    const projectCard = screen.getByText('Project Discussion').closest('[data-slot="card"]')
    expect(projectCard).toBeInTheDocument()
    expect(projectCard).toHaveAttribute('data-priority', 'high')
    
    // Check participant count
    expect(screen.getByText('5 participants')).toBeInTheDocument()
    
    // Check message count
    expect(screen.getByText('100 messages')).toBeInTheDocument()
    
    // Check high priority indicator
    expect(screen.getByText('High Priority')).toBeInTheDocument()
  })

  it('should handle untitled conversations', () => {
    vi.mocked(useViewPreference).mockReturnValue({
      view: 'card',
      setView: mockSetView
    })

    render(<ConversationsView conversations={mockConversations} currentPage={1} />)
    
    expect(screen.getByText('Untitled Conversation')).toBeInTheDocument()
  })

  it('should not show high priority indicator for normal priority conversations', () => {
    vi.mocked(useViewPreference).mockReturnValue({
      view: 'card',
      setView: mockSetView
    })

    render(<ConversationsView conversations={[mockConversations[1]]} currentPage={1} />)
    
    expect(screen.queryByText('High Priority')).not.toBeInTheDocument()
  })

  it('should format timestamps correctly', () => {
    vi.mocked(useViewPreference).mockReturnValue({
      view: 'card',
      setView: mockSetView
    })

    render(<ConversationsView conversations={[mockConversations[0]]} currentPage={1} />)
    
    // Check that date formatting works (the exact format may depend on locale)
    expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument()
    expect(screen.getByText(/11:30/)).toBeInTheDocument()
  })

  it('should create correct links with current page parameter', () => {
    vi.mocked(useViewPreference).mockReturnValue({
      view: 'card',
      setView: mockSetView
    })

    render(<ConversationsView conversations={[mockConversations[0]]} currentPage={3} />)
    
    const link = screen.getByText('Project Discussion').closest('a')
    expect(link).toHaveAttribute('href', '/conversations/conv-001?from=3')
  })

  it('should apply grid layout for card view', () => {
    vi.mocked(useViewPreference).mockReturnValue({
      view: 'card',
      setView: mockSetView
    })

    const { container } = render(<ConversationsView conversations={mockConversations} currentPage={1} />)
    
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-4')
  })

  it('should pass view change handler to ViewToggle', async () => {
    const user = userEvent.setup()
    render(<ConversationsView conversations={mockConversations} currentPage={1} />)
    
    await user.click(screen.getByTestId('toggle-card'))
    
    expect(mockSetView).toHaveBeenCalledWith('card')
  })

  it('should render all required icons in card view', () => {
    vi.mocked(useViewPreference).mockReturnValue({
      view: 'card',
      setView: mockSetView
    })

    render(<ConversationsView conversations={[mockConversations[0]]} currentPage={1} />)
    
    expect(screen.getByTestId('users-icon')).toBeInTheDocument()
    expect(screen.getByTestId('message-circle-icon')).toBeInTheDocument()
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
  })

  it('should handle empty conversations array', () => {
    render(<ConversationsView conversations={[]} currentPage={1} />)
    
    expect(screen.getByText('Conversations')).toBeInTheDocument()
    expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('conversations-list')).toBeInTheDocument()
  })

  it('should apply hover effects to card links', () => {
    vi.mocked(useViewPreference).mockReturnValue({
      view: 'card',
      setView: mockSetView
    })

    const { container } = render(<ConversationsView conversations={[mockConversations[0]]} currentPage={1} />)
    
    const cardLink = container.querySelector('a')
    expect(cardLink).toHaveClass('block', 'transition-transform', 'hover:scale-[1.02]')
    
    const card = container.querySelector('[data-slot="card"]')
    expect(card).toHaveClass('h-full', 'hover:shadow-lg', 'transition-shadow')
  })
})