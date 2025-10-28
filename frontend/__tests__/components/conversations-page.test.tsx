import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConversationsPage } from '@/components/conversations-page'
import { ConversationSummary } from '@/lib/neo4j'

// Mock the ConversationsTable component
vi.mock('@/components/conversations-table', () => ({
  ConversationsTable: ({ conversations }: { conversations: ConversationSummary[] }) => (
    <div data-testid="conversations-table">
      {conversations.map(conv => (
        <div key={conv.conversationId} data-testid="conversation-row">
          {conv.title || 'Direct Message'}
        </div>
      ))}
    </div>
  ),
}))

// Mock the UI components
vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => (
    <div data-testid="search-icon" className={className}>Search Icon</div>
  ),
}))

describe('ConversationsPage', () => {
  const mockConversations: ConversationSummary[] = [
    {
      conversationId: 'conv-1',
      title: 'Team Discussion',
      participantCount: 5,
      messageCount: 150,
      lastMessageTimestamp: '2024-01-15T10:30:00Z',
      type: 'group',
      priority: 'high',
    },
    {
      conversationId: 'conv-2',
      title: 'Project Planning',
      participantCount: 3,
      messageCount: 75,
      lastMessageTimestamp: '2024-01-14T15:45:00Z',
      type: 'group',
      priority: 'normal',
    },
    {
      conversationId: 'conv-3',
      title: '', // Test Direct Message fallback
      participantCount: 2,
      messageCount: 25,
      lastMessageTimestamp: '2024-01-13T08:00:00Z',
      type: 'direct',
      priority: 'low',
    },
  ]

  it('renders search input and conversations table', () => {
    render(<ConversationsPage conversations={mockConversations} />)

    // Check search input
    expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument()
    expect(screen.getByLabelText('Search conversations')).toBeInTheDocument()
    expect(screen.getByTestId('search-icon')).toBeInTheDocument()

    // Check conversations table
    expect(screen.getByTestId('conversations-table')).toBeInTheDocument()
    expect(screen.getAllByTestId('conversation-row')).toHaveLength(3)
  })

  it('displays all conversations when search is empty', () => {
    render(<ConversationsPage conversations={mockConversations} />)

    expect(screen.getByText('Team Discussion')).toBeInTheDocument()
    expect(screen.getByText('Project Planning')).toBeInTheDocument()
    expect(screen.getByText('Direct Message')).toBeInTheDocument()
  })

  it('filters conversations based on search term', async () => {
    const user = userEvent.setup()
    render(<ConversationsPage conversations={mockConversations} />)

    const searchInput = screen.getByPlaceholderText('Search conversations...')
    await user.type(searchInput, 'team')

    // Should only show Team Discussion
    expect(screen.getByText('Team Discussion')).toBeInTheDocument()
    expect(screen.queryByText('Project Planning')).not.toBeInTheDocument()
    expect(screen.queryByText('Direct Message')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('conversation-row')).toHaveLength(1)
  })

  it('filters case-insensitively', async () => {
    const user = userEvent.setup()
    render(<ConversationsPage conversations={mockConversations} />)

    const searchInput = screen.getByPlaceholderText('Search conversations...')
    await user.type(searchInput, 'TEAM')

    expect(screen.getByText('Team Discussion')).toBeInTheDocument()
    expect(screen.getAllByTestId('conversation-row')).toHaveLength(1)
  })

  it('searches Direct Message fallback title', async () => {
    const user = userEvent.setup()
    render(<ConversationsPage conversations={mockConversations} />)

    const searchInput = screen.getByPlaceholderText('Search conversations...')
    await user.type(searchInput, 'direct')

    expect(screen.getByText('Direct Message')).toBeInTheDocument()
    expect(screen.getAllByTestId('conversation-row')).toHaveLength(1)
  })

  it('shows no results message when no matches found', async () => {
    const user = userEvent.setup()
    render(<ConversationsPage conversations={mockConversations} />)

    const searchInput = screen.getByPlaceholderText('Search conversations...')
    await user.type(searchInput, 'nonexistent')

    expect(screen.queryByTestId('conversations-table')).not.toBeInTheDocument()
    expect(screen.getByText('No conversations found matching "nonexistent"')).toBeInTheDocument()
  })

  it('ignores whitespace in search term', async () => {
    const user = userEvent.setup()
    render(<ConversationsPage conversations={mockConversations} />)

    const searchInput = screen.getByPlaceholderText('Search conversations...')
    await user.type(searchInput, '  ')

    // Should show all conversations
    expect(screen.getAllByTestId('conversation-row')).toHaveLength(3)
  })

  it('updates results dynamically as user types', async () => {
    const user = userEvent.setup()
    render(<ConversationsPage conversations={mockConversations} />)

    const searchInput = screen.getByPlaceholderText('Search conversations...')
    
    // Type 'p' - should show Project Planning
    await user.type(searchInput, 'p')
    expect(screen.getByText('Project Planning')).toBeInTheDocument()
    expect(screen.getAllByTestId('conversation-row')).toHaveLength(1)

    // Add 'lan' - still shows Project Planning
    await user.type(searchInput, 'lan')
    expect(screen.getByText('Project Planning')).toBeInTheDocument()
    expect(screen.getAllByTestId('conversation-row')).toHaveLength(1)

    // Clear and type 'discussion'
    await user.clear(searchInput)
    await user.type(searchInput, 'discussion')
    expect(screen.getByText('Team Discussion')).toBeInTheDocument()
    expect(screen.getAllByTestId('conversation-row')).toHaveLength(1)
  })

  it('handles empty conversations array', () => {
    render(<ConversationsPage conversations={[]} />)

    expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument()
    expect(screen.queryByTestId('conversation-row')).not.toBeInTheDocument()
    // When conversations array is empty and no search term, it shows "No conversations found"
    expect(screen.getByText('No conversations found matching ""')).toBeInTheDocument()
  })

  it('handles partial matches in titles', async () => {
    const user = userEvent.setup()
    render(<ConversationsPage conversations={mockConversations} />)

    const searchInput = screen.getByPlaceholderText('Search conversations...')
    await user.type(searchInput, 'proj')

    expect(screen.getByText('Project Planning')).toBeInTheDocument()
    expect(screen.getAllByTestId('conversation-row')).toHaveLength(1)
  })

  it('preserves original conversations array', async () => {
    const user = userEvent.setup()
    const originalConversations = [...mockConversations]
    render(<ConversationsPage conversations={mockConversations} />)

    const searchInput = screen.getByPlaceholderText('Search conversations...')
    await user.type(searchInput, 'team')
    await user.clear(searchInput)

    // Should show all conversations again
    expect(screen.getAllByTestId('conversation-row')).toHaveLength(3)
    
    // Original array should be unchanged
    expect(mockConversations).toEqual(originalConversations)
  })

  it('applies correct CSS classes', () => {
    render(<ConversationsPage conversations={mockConversations} />)

    // The search input's parent is the relative max-w-md container
    const searchInput = screen.getByPlaceholderText('Search conversations...')
    const searchContainer = searchInput.parentElement
    expect(searchContainer).toHaveClass('relative', 'max-w-md')

    expect(searchInput).toHaveClass('pl-10')
  })

  it('positions search icon correctly', () => {
    render(<ConversationsPage conversations={mockConversations} />)

    const searchIcon = screen.getByTestId('search-icon')
    // The search icon itself has the positioning classes
    expect(searchIcon).toHaveClass('absolute', 'left-3', 'top-1/2', 'h-4', 'w-4', '-translate-y-1/2', 'text-muted-foreground')
  })

  it('handles onChange event correctly', async () => {
    const user = userEvent.setup()
    render(<ConversationsPage conversations={mockConversations} />)

    const searchInput = screen.getByPlaceholderText('Search conversations...') as HTMLInputElement
    await user.type(searchInput, 'test')

    expect(searchInput.value).toBe('test')
  })

  it('memoizes filtered results efficiently', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ConversationsPage conversations={mockConversations} />)

    const searchInput = screen.getByPlaceholderText('Search conversations...')
    await user.type(searchInput, 'team')

    // Re-render with same props
    rerender(<ConversationsPage conversations={mockConversations} />)

    // Should still show filtered results
    expect(screen.getByText('Team Discussion')).toBeInTheDocument()
    expect(screen.getAllByTestId('conversation-row')).toHaveLength(1)
  })
})