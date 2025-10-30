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
      participants: [
        { userId: 'user1', name: 'User One', email: 'user1@test.com', avatar: null, conversationCount: 3 },
        { userId: 'user2', name: 'User Two', email: 'user2@test.com', avatar: null, conversationCount: 3 },
        { userId: 'user3', name: 'User Three', email: 'user3@test.com', avatar: null, conversationCount: 1 }
      ],
      lastMessageTimestamp: '2024-01-15T09:00:00Z',
    },
    {
      conversationId: 'conv2',
      title: 'Direct Chat',
      type: 'direct',
      messageCount: 50,
      user1MessageCount: 30,
      user2MessageCount: 20,
      participants: [
        { userId: 'user1', name: 'User One', email: 'user1@test.com', avatar: null, conversationCount: 2 },
        { userId: 'user2', name: 'User Two', email: 'user2@test.com', avatar: null, conversationCount: 2 }
      ],
      lastMessageTimestamp: '2024-01-14T15:00:00Z',
    },
    {
      conversationId: 'conv3',
      title: 'Team Meeting',
      type: 'group',
      messageCount: 200,
      user1MessageCount: 100,
      user2MessageCount: 100,
      participants: [
        { userId: 'user1', name: 'User One', email: 'user1@test.com', avatar: null, conversationCount: 2 },
        { userId: 'user2', name: 'User Two', email: 'user2@test.com', avatar: null, conversationCount: 2 },
        { userId: 'user3', name: 'User Three', email: 'user3@test.com', avatar: null, conversationCount: 1 },
        { userId: 'user4', name: 'User Four', email: 'user4@test.com', avatar: null, conversationCount: 1 }
      ],
      lastMessageTimestamp: '2024-01-13T10:00:00Z',
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
      participants: [
        { userId: 'user1', name: 'User A', email: 'a@test.com', avatar: null, conversationCount: 1 },
        { userId: 'user2', name: 'User B', email: 'b@test.com', avatar: null, conversationCount: 1 }
      ],
      lastMessageTimestamp: '2024-01-15T09:00:00Z',
    }

    render(
      <SharedConversations
        conversations={[equalConversation]}
        selectedId={undefined}
      />
    )

    const distribution = screen.getByTestId('message-distribution')
    expect(distribution).toBeInTheDocument()

    // Check for 50/50 text display
    expect(distribution.textContent).toBe('50% / 50%')
  })

  it('should handle conversations with no messages', () => {
    const emptyConversation: SharedConversation = {
      conversationId: 'conv5',
      title: 'Empty Conversation',
      type: 'group',
      messageCount: 0,
      user1MessageCount: 0,
      user2MessageCount: 0,
      participants: [
        { userId: 'user1', name: 'User A', email: 'a@test.com', avatar: null, conversationCount: 1 },
        { userId: 'user2', name: 'User B', email: 'b@test.com', avatar: null, conversationCount: 1 }
      ],
      lastMessageTimestamp: '2024-01-15T09:00:00Z',
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

  describe('MessageDistribution Component (New Text-Based Design)', () => {
    describe('Percentage Display', () => {
      it('should display percentages in "X% / Y%" format', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Test Conversation',
          type: 'group',
          messageCount: 41,
          user1MessageCount: 16,
          user2MessageCount: 25,
          participants: [
            { userId: 'user1', name: 'Verna McCullough', email: 'verna@test.com', avatar: null, conversationCount: 2 },
            { userId: 'user2', name: 'Dr. Betsy Russel', email: 'betsy@test.com', avatar: null, conversationCount: 2 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const element = screen.getByTestId('message-distribution')
        expect(element.textContent).toBe('39% / 61%')
      })

      it('should round percentages to whole numbers', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Test Conversation',
          type: 'group',
          messageCount: 4,
          user1MessageCount: 1,
          user2MessageCount: 3,
          participants: [
            { userId: 'user1', name: 'User A', email: 'a@test.com', avatar: null, conversationCount: 1 },
            { userId: 'user2', name: 'User B', email: 'b@test.com', avatar: null, conversationCount: 1 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const element = screen.getByTestId('message-distribution')
        expect(element.textContent).toBe('25% / 75%')
      })

      it('should handle equal distribution', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Test Conversation',
          type: 'group',
          messageCount: 40,
          user1MessageCount: 20,
          user2MessageCount: 20,
          participants: [
            { userId: 'user1', name: 'User A', email: 'a@test.com', avatar: null, conversationCount: 1 },
            { userId: 'user2', name: 'User B', email: 'b@test.com', avatar: null, conversationCount: 1 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const element = screen.getByTestId('message-distribution')
        expect(element.textContent).toBe('50% / 50%')
      })
    })

    describe('Edge Cases', () => {
      it('should display "No messages" when total is zero', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Empty Conversation',
          type: 'group',
          messageCount: 0,
          user1MessageCount: 0,
          user2MessageCount: 0,
          participants: [
            { userId: 'user1', name: 'User A', email: 'a@test.com', avatar: null, conversationCount: 1 },
            { userId: 'user2', name: 'User B', email: 'b@test.com', avatar: null, conversationCount: 1 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const element = screen.getByTestId('message-distribution')
        expect(element.textContent).toBe('No messages')
      })

      it('should handle one user with zero messages', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Test Conversation',
          type: 'group',
          messageCount: 10,
          user1MessageCount: 0,
          user2MessageCount: 10,
          participants: [
            { userId: 'user1', name: 'User A', email: 'a@test.com', avatar: null, conversationCount: 1 },
            { userId: 'user2', name: 'User B', email: 'b@test.com', avatar: null, conversationCount: 1 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const element = screen.getByTestId('message-distribution')
        expect(element.textContent).toBe('0% / 100%')
      })

      it('should handle large numbers correctly', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Test Conversation',
          type: 'group',
          messageCount: 1500,
          user1MessageCount: 500,
          user2MessageCount: 1000,
          participants: [
            { userId: 'user1', name: 'User A', email: 'a@test.com', avatar: null, conversationCount: 1 },
            { userId: 'user2', name: 'User B', email: 'b@test.com', avatar: null, conversationCount: 1 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const element = screen.getByTestId('message-distribution')
        expect(element.textContent).toBe('33% / 67%')
      })

      it('should guarantee percentages sum to exactly 100% (rounding edge case)', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Test Conversation',
          type: 'group',
          messageCount: 200,
          user1MessageCount: 99,
          user2MessageCount: 101,
          participants: [
            { userId: 'user1', name: 'User A', email: 'a@test.com', avatar: null, conversationCount: 1 },
            { userId: 'user2', name: 'User B', email: 'b@test.com', avatar: null, conversationCount: 1 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const element = screen.getByTestId('message-distribution')
        // Should show "50% / 50%" not "50% / 51%" to guarantee 100% sum
        expect(element.textContent).toBe('50% / 50%')

        // Verify percentages sum to 100%
        const text = element.textContent || ''
        const percentages = text.split(' / ').map(s => parseInt(s))
        expect(percentages[0] + percentages[1]).toBe(100)
      })

      it('should handle conversations with fewer than 2 participants', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Single Participant',
          type: 'direct',
          messageCount: 10,
          user1MessageCount: 10,
          user2MessageCount: 0,
          participants: [
            { userId: 'user1', name: 'Only User', email: 'user@test.com', avatar: null, conversationCount: 1 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const element = screen.getByTestId('message-distribution')
        // Should gracefully handle missing second participant
        expect(element).toBeInTheDocument()
        expect(element.textContent).toBe('100% / 0%')

        // Tooltip should use fallback name for missing participant
        const tooltip = element.getAttribute('title')
        expect(tooltip).toContain('Only User')
        expect(tooltip).toContain('User 2') // Fallback name
      })
    })

    describe('Tooltip', () => {
      it('should include detailed breakdown with names and counts', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Test Conversation',
          type: 'group',
          messageCount: 41,
          user1MessageCount: 16,
          user2MessageCount: 25,
          participants: [
            { userId: 'user1', name: 'Verna McCullough', email: 'verna@test.com', avatar: null, conversationCount: 2 },
            { userId: 'user2', name: 'Dr. Betsy Russel', email: 'betsy@test.com', avatar: null, conversationCount: 2 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const element = screen.getByTestId('message-distribution')
        expect(element.getAttribute('title')).toBe(
          'Verna McCullough: 16 (39%) • Dr. Betsy Russel: 25 (61%)'
        )
      })

      it('should not have tooltip for zero messages case', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Empty Conversation',
          type: 'group',
          messageCount: 0,
          user1MessageCount: 0,
          user2MessageCount: 0,
          participants: [
            { userId: 'user1', name: 'User A', email: 'a@test.com', avatar: null, conversationCount: 1 },
            { userId: 'user2', name: 'User B', email: 'b@test.com', avatar: null, conversationCount: 1 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const element = screen.getByTestId('message-distribution')
        expect(element.getAttribute('title')).toBeNull()
      })
    })

    describe('Styling', () => {
      it('should apply correct CSS classes', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Test Conversation',
          type: 'group',
          messageCount: 30,
          user1MessageCount: 10,
          user2MessageCount: 20,
          participants: [
            { userId: 'user1', name: 'User A', email: 'a@test.com', avatar: null, conversationCount: 1 },
            { userId: 'user2', name: 'User B', email: 'b@test.com', avatar: null, conversationCount: 1 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const element = screen.getByTestId('message-distribution')
        expect(element.className).toContain('text-xs')
        expect(element.className).toContain('text-muted-foreground')
        expect(element.className).toContain('mt-1')
      })

      it('should not contain color classes from old implementation', () => {
        const conversation: SharedConversation = {
          conversationId: 'conv1',
          title: 'Test Conversation',
          type: 'group',
          messageCount: 30,
          user1MessageCount: 10,
          user2MessageCount: 20,
          participants: [
            { userId: 'user1', name: 'User A', email: 'a@test.com', avatar: null, conversationCount: 1 },
            { userId: 'user2', name: 'User B', email: 'b@test.com', avatar: null, conversationCount: 1 }
          ],
          lastMessageTimestamp: '2025-10-09T12:16:00Z',
        }

        const { container } = render(<SharedConversations conversations={[conversation]} selectedId={undefined} />)

        const html = container.innerHTML
        expect(html).not.toContain('bg-blue-500')
        expect(html).not.toContain('bg-green-500')
      })
    })
  })
})