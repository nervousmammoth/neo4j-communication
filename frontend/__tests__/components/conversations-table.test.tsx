import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConversationsTable } from '@/components/conversations-table'
import { ConversationSummary } from '@/lib/neo4j'

// Mock the next/navigation module
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock the UI components
vi.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  TableBody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  TableHeader: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
}))

// Mock the utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

describe('ConversationsTable', () => {
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
      title: '',  // Test direct message fallback
      participantCount: 2,
      messageCount: 50,
      lastMessageTimestamp: '2024-01-14T15:45:00Z',
      type: 'direct',
      priority: 'normal',
    },
    {
      conversationId: 'conv-3',
      title: 'Low Priority Chat',
      participantCount: 3,
      messageCount: 1234567,  // Test number formatting
      lastMessageTimestamp: '2024-01-13T08:00:00Z',
      type: 'group',
      priority: 'low',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table with all conversations', () => {
    render(<ConversationsTable conversations={mockConversations} />)

    // Check headers
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
    expect(screen.getByText('Participants')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText('Last Activity')).toBeInTheDocument()

    // Check conversation data
    expect(screen.getByText('Team Discussion')).toBeInTheDocument()
    expect(screen.getByText('Direct Message')).toBeInTheDocument() // Fallback title
    expect(screen.getByText('Low Priority Chat')).toBeInTheDocument()
  })

  it('navigates to conversation detail on row click', async () => {
    const user = userEvent.setup()
    render(<ConversationsTable conversations={mockConversations} />)

    await user.click(screen.getByText('Team Discussion'))

    expect(mockPush).toHaveBeenCalledWith('/conversations/conv-1')
  })

  it('navigates to conversation detail on Enter key', async () => {
    const user = userEvent.setup()
    render(<ConversationsTable conversations={mockConversations} />)

    const row = screen.getByRole('button', { name: /View conversation: Team Discussion/i })
    row.focus()
    await user.keyboard('{Enter}')

    expect(mockPush).toHaveBeenCalledWith('/conversations/conv-1')
  })

  it('navigates to conversation detail on Space key', async () => {
    const user = userEvent.setup()
    render(<ConversationsTable conversations={mockConversations} />)

    const row = screen.getByRole('button', { name: /View conversation: Direct Message/i })
    row.focus()
    await user.keyboard(' ')

    expect(mockPush).toHaveBeenCalledWith('/conversations/conv-2')
  })

  it('does not navigate on other keys', async () => {
    const user = userEvent.setup()
    render(<ConversationsTable conversations={mockConversations} />)

    const row = screen.getByRole('button', { name: /View conversation: Team Discussion/i })
    row.focus()
    await user.keyboard('a')

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('formats dates correctly', () => {
    render(<ConversationsTable conversations={mockConversations} />)

    // Check for date formats that formatLastActivity produces
    // Could be "Jan 15", "2h ago", "3 days ago", etc. depending on dates
    const dateElements = screen.getAllByText(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}|\d+[hd]\s+ago|Just now|today|yesterday|\d+\s+days?\s+ago/i)
    expect(dateElements.length).toBeGreaterThan(0)
  })

  it('applies correct priority colors', () => {
    render(<ConversationsTable conversations={mockConversations} />)

    const highPriority = screen.getByText('high')
    expect(highPriority.className).toContain('text-red-600')

    const normalPriority = screen.getByText('normal')
    expect(normalPriority.className).toContain('text-gray-600')

    const lowPriority = screen.getByText('low')
    expect(lowPriority.className).toContain('text-green-600')
  })

  it('applies correct type badges', () => {
    render(<ConversationsTable conversations={mockConversations} />)

    const groupBadges = screen.getAllByText('group')
    groupBadges.forEach(badge => {
      expect(badge.className).toContain('bg-blue-100')
      expect(badge.className).toContain('text-blue-700')
    })

    const directBadge = screen.getByText('direct')
    expect(directBadge.className).toContain('bg-gray-100')
    expect(directBadge.className).toContain('text-gray-700')
  })

  it('formats message counts with locale string', () => {
    render(<ConversationsTable conversations={mockConversations} />)

    // Check that large numbers are formatted
    expect(screen.getByText('1,234,567')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('handles medium priority', () => {
    const conversationsWithMedium = [
      {
        ...mockConversations[0],
        priority: 'medium',
      },
    ]

    render(<ConversationsTable conversations={conversationsWithMedium} />)

    const mediumPriority = screen.getByText('medium')
    expect(mediumPriority.className).toContain('text-yellow-600')
  })

  it('handles unknown priority gracefully', () => {
    const conversationsWithUnknown = [
      {
        ...mockConversations[0],
        priority: 'unknown',
      },
    ]

    render(<ConversationsTable conversations={conversationsWithUnknown} />)

    const unknownPriority = screen.getByText('unknown')
    expect(unknownPriority.className).toContain('text-gray-600')
  })

  it('renders empty table when no conversations', () => {
    render(<ConversationsTable conversations={[]} />)

    // Headers should still be present
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()

    // But no conversation rows
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(1) // Only header row
  })

  it('applies correct accessibility attributes', () => {
    render(<ConversationsTable conversations={mockConversations} />)

    const rows = screen.getAllByRole('button')
    expect(rows).toHaveLength(3)

    rows.forEach((row, index) => {
      expect(row).toHaveAttribute('tabIndex', '0')
      expect(row).toHaveAttribute('aria-label')
      expect(row.getAttribute('aria-label')).toContain('View conversation:')
    })
  })

  it('includes screen reader text for priority', () => {
    render(<ConversationsTable conversations={mockConversations} />)

    const srText = screen.getAllByText('Priority:')
    expect(srText).toHaveLength(3)
    srText.forEach(element => {
      expect(element).toHaveClass('sr-only')
    })
  })

  it('responsive columns are hidden on smaller screens', () => {
    render(<ConversationsTable conversations={mockConversations} />)

    // Check that responsive classes are applied
    const priorityHeaders = screen.getAllByText('Priority')
    const priorityCells = screen.getAllByText(/high|normal|low/)
    
    priorityHeaders.forEach(header => {
      expect(header.className).toContain('hidden sm:table-cell')
    })

    // Participants column hidden on medium screens
    const participantsHeader = screen.getByText('Participants')
    expect(participantsHeader.className).toContain('hidden md:table-cell')

    // Last Activity hidden on large screens
    const lastActivityHeader = screen.getByText('Last Activity')
    expect(lastActivityHeader.className).toContain('hidden lg:table-cell')
  })

  it('handles all ConversationSummary fields correctly', () => {
    const completeConversation: ConversationSummary = {
      conversationId: 'test-id',
      title: 'Test Title',
      participantCount: 10,
      messageCount: 999,
      lastMessageTimestamp: '2024-01-20T12:00:00Z',
      type: 'group',
      priority: 'high',
    }

    render(<ConversationsTable conversations={[completeConversation]} />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument() // participants
    expect(screen.getByText('999')).toBeInTheDocument() // messages
    expect(screen.getByText('group')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
  })
})