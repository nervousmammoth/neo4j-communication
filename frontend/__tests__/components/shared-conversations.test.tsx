import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SharedConversations } from '@/components/shared-conversations'
import type { SharedConversation } from '@/lib/neo4j'

// Mock Next.js navigation
const mockPathname = '/users/communications/user1/user2'
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

describe('SharedConversations', () => {
  const mockConversations: SharedConversation[] = [
    {
      conversationId: 'conv1',
      title: 'Project Discussion',
      type: 'group',
      messageCount: 150,
      user1MessageCount: 75,
      user2MessageCount: 75,
      participants: ['user1', 'user2', 'user3'],
      lastActivity: '2024-01-15T09:00:00Z',
    },
    {
      conversationId: 'conv2',
      title: 'Direct Chat',
      type: 'direct',
      messageCount: 50,
      user1MessageCount: 30,
      user2MessageCount: 20,
      participants: ['user1', 'user2'],
      lastActivity: '2024-01-14T15:00:00Z',
    },
    {
      conversationId: 'conv3',
      title: 'Team Meeting',
      type: 'group',
      messageCount: 200,
      user1MessageCount: 100,
      user2MessageCount: 100,
      participants: ['user1', 'user2', 'user3', 'user4'],
      lastActivity: '2024-01-13T10:00:00Z',
    },
  ]

  it('should render conversation list', () => {
    render(
      <SharedConversations
        conversations={mockConversations}
        selectedId={undefined}
      />
    )

    expect(screen.getByText('Shared Conversations (3)')).toBeInTheDocument()
    expect(screen.getByText('Project Discussion')).toBeInTheDocument()
    expect(screen.getByText('Direct Chat')).toBeInTheDocument()
    expect(screen.getByText('Team Meeting')).toBeInTheDocument()
  })

  it('should display conversation types', () => {
    render(
      <SharedConversations
        conversations={mockConversations}
        selectedId={undefined}
      />
    )

    // There are multiple 'group' conversations, so use getAllByText
    const groupBadges = screen.getAllByText('group')
    expect(groupBadges.length).toBeGreaterThan(0)
    
    expect(screen.getByText('direct')).toBeInTheDocument()
  })

  it('should show message counts', () => {
    render(
      <SharedConversations
        conversations={mockConversations}
        selectedId={undefined}
      />
    )

    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('should show participant counts', () => {
    render(
      <SharedConversations
        conversations={mockConversations}
        selectedId={undefined}
      />
    )

    // Check for participant counts
    expect(screen.getByText('3')).toBeInTheDocument() // conv1
    expect(screen.getByText('2')).toBeInTheDocument() // conv2
    expect(screen.getByText('4')).toBeInTheDocument() // conv3
  })

  it('should highlight selected conversation', () => {
    const { container } = render(
      <SharedConversations
        conversations={mockConversations}
        selectedId="conv2"
      />
    )

    const selectedLink = container.querySelector('a[href*="conversation=conv2"]')
    expect(selectedLink).toHaveClass('bg-accent')
    expect(selectedLink).toHaveClass('border-primary')
  })

  it('should display message distribution bars', () => {
    const { container } = render(
      <SharedConversations
        conversations={mockConversations}
        selectedId={undefined}
      />
    )

    // Check for message distribution visualization
    const distributionBars = container.querySelectorAll('[data-testid="message-distribution"]')
    expect(distributionBars.length).toBe(3)
  })

  it('should handle empty conversations list', () => {
    render(
      <SharedConversations
        conversations={[]}
        selectedId={undefined}
      />
    )

    expect(screen.getByText('No shared conversations found')).toBeInTheDocument()
  })

  it('should generate correct links with conversation parameter', () => {
    const { container } = render(
      <SharedConversations
        conversations={mockConversations}
        selectedId={undefined}
      />
    )

    const links = container.querySelectorAll('a')
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('conversation=conv1'))
    expect(links[1]).toHaveAttribute('href', expect.stringContaining('conversation=conv2'))
    expect(links[2]).toHaveAttribute('href', expect.stringContaining('conversation=conv3'))
  })

  it('should show 50/50 distribution for equal messages', () => {
    const equalConversation: SharedConversation = {
      conversationId: 'conv4',
      title: 'Equal Distribution',
      type: 'group',
      messageCount: 100,
      user1MessageCount: 50,
      user2MessageCount: 50,
      participants: ['user1', 'user2'],
      lastActivity: '2024-01-15T09:00:00Z',
    }

    const { container } = render(
      <SharedConversations
        conversations={[equalConversation]}
        selectedId={undefined}
      />
    )

    const distributionBar = container.querySelector('[data-testid="message-distribution"]')
    expect(distributionBar).toBeInTheDocument()
    
    // Check for 50% widths
    const bars = distributionBar?.querySelectorAll('[data-testid="distribution-segment"]')
    expect(bars?.[0]).toHaveStyle({ width: '50%' })
    expect(bars?.[1]).toHaveStyle({ width: '50%' })
  })

  it('should handle conversations with no messages', () => {
    const emptyConversation: SharedConversation = {
      conversationId: 'conv5',
      title: 'Empty Conversation',
      type: 'group',
      messageCount: 0,
      user1MessageCount: 0,
      user2MessageCount: 0,
      participants: ['user1', 'user2'],
      lastActivity: '2024-01-15T09:00:00Z',
    }

    render(
      <SharedConversations
        conversations={[emptyConversation]}
        selectedId={undefined}
      />
    )

    expect(screen.getByText('Empty Conversation')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should preserve other query params in links', () => {
    // Set up existing search params
    mockSearchParams.set('page', '2')
    mockSearchParams.set('view', 'timeline')

    const { container } = render(
      <SharedConversations
        conversations={mockConversations}
        selectedId={undefined}
      />
    )

    const firstLink = container.querySelector('a')
    expect(firstLink).toHaveAttribute('href', expect.stringContaining('page=2'))
    expect(firstLink).toHaveAttribute('href', expect.stringContaining('view=timeline'))
    expect(firstLink).toHaveAttribute('href', expect.stringContaining('conversation=conv1'))
  })
})