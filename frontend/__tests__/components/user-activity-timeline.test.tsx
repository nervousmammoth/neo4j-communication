import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserActivityTimeline } from '@/components/user-activity-timeline'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock date formatting
vi.mock('@/lib/date-formatting', () => ({
  formatLastSeen: (date: string) => `Formatted: ${date}`
}))

describe('UserActivityTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeleton when activities is undefined', () => {
    const { container } = render(<UserActivityTimeline userId="user-1" />)
    
    // Should render skeleton elements
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
    // Should have multiple skeleton elements (4 cards with 4 skeletons each = 16 total)
    expect(skeletons.length).toBe(16)
  })

  it('renders empty state when activities array is empty', () => {
    render(<UserActivityTimeline activities={[]} userId="user-1" />)
    
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
    expect(screen.getByText(/hasn't had any recent activity/i)).toBeInTheDocument()
  })

  it('renders activities with different types correctly', () => {
    const activities = [
      {
        type: 'message_sent',
        conversationId: 'conv-1',
        conversationTitle: 'Team Discussion',
        timestamp: '2025-01-14T10:00:00Z',
        content: 'Hello team!'
      },
      {
        type: 'conversation_joined',
        conversationId: 'conv-2',
        conversationTitle: 'Project Planning',
        timestamp: '2025-01-14T09:00:00Z'
      },
      {
        type: 'unknown_type',
        conversationId: 'conv-3',
        timestamp: '2025-01-14T08:00:00Z'
      }
    ]

    render(<UserActivityTimeline activities={activities} userId="user-1" />)
    
    // Check activity labels
    expect(screen.getByText('Sent a message')).toBeInTheDocument()
    expect(screen.getByText('Joined conversation')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument() // Default label
    
    // Check conversation titles
    expect(screen.getByText(/Team Discussion/)).toBeInTheDocument()
    expect(screen.getByText(/Project Planning/)).toBeInTheDocument()
    
    // Check content preview
    expect(screen.getByText('Hello team!')).toBeInTheDocument()
    
    // Check formatted timestamps
    expect(screen.getAllByText(/Formatted: 2025-01-14/).length).toBe(3)
  })

  it('navigates to conversation when activity card is clicked', async () => {
    const user = userEvent.setup()
    const activities = [
      {
        type: 'message_sent',
        conversationId: 'conv-123',
        conversationTitle: 'Test Conversation',
        timestamp: '2025-01-14T10:00:00Z',
        content: 'Test message'
      }
    ]

    render(<UserActivityTimeline activities={activities} userId="user-1" />)
    
    // Click on the activity card
    const card = screen.getByText('Test Conversation').closest('.cursor-pointer')
    expect(card).toBeInTheDocument()
    
    if (card) {
      await user.click(card)
      expect(mockPush).toHaveBeenCalledWith('/conversations/conv-123')
    }
  })

  it('applies custom className when provided', () => {
    const activities = [
      {
        type: 'message_sent',
        conversationId: 'conv-1',
        timestamp: '2025-01-14T10:00:00Z'
      }
    ]

    const { container } = render(
      <UserActivityTimeline 
        activities={activities} 
        userId="user-1" 
        className="custom-class" 
      />
    )
    
    const wrapper = container.querySelector('.custom-class')
    expect(wrapper).toBeInTheDocument()
  })

  it('renders timeline line and dots correctly', () => {
    const activities = [
      {
        type: 'message_sent',
        conversationId: 'conv-1',
        timestamp: '2025-01-14T10:00:00Z'
      },
      {
        type: 'conversation_joined',
        conversationId: 'conv-2',
        timestamp: '2025-01-14T09:00:00Z'
      }
    ]

    const { container } = render(
      <UserActivityTimeline activities={activities} userId="user-1" />
    )
    
    // Check timeline line exists
    const timelineLine = container.querySelector('.absolute.left-5.top-8.bottom-0.w-px.bg-border')
    expect(timelineLine).toBeInTheDocument()
    
    // Check timeline dots exist (one per activity)
    const timelineDots = container.querySelectorAll('.rounded-full.bg-background.border-2.border-border')
    expect(timelineDots).toHaveLength(2)
  })

  it('handles activities without conversationTitle gracefully', () => {
    const activities = [
      {
        type: 'message_sent',
        conversationId: 'conv-1',
        timestamp: '2025-01-14T10:00:00Z',
        content: 'Message without title'
      }
    ]

    render(<UserActivityTimeline activities={activities} userId="user-1" />)
    
    expect(screen.getByText('Sent a message')).toBeInTheDocument()
    expect(screen.getByText('Message without title')).toBeInTheDocument()
    // Should not render "in [title]" text when no title
    expect(screen.queryByText(/^in /)).not.toBeInTheDocument()
  })

  it('handles activities without content gracefully', () => {
    const activities = [
      {
        type: 'conversation_joined',
        conversationId: 'conv-1',
        conversationTitle: 'Team Chat',
        timestamp: '2025-01-14T10:00:00Z'
        // No content field
      }
    ]

    render(<UserActivityTimeline activities={activities} userId="user-1" />)
    
    expect(screen.getByText('Joined conversation')).toBeInTheDocument()
    expect(screen.getByText(/Team Chat/)).toBeInTheDocument()
    // Should not crash when content is missing
  })

  it('handles activities without conversationId gracefully', async () => {
    const user = userEvent.setup()
    const activities = [
      {
        type: 'message_sent',
        conversationId: '', // Empty conversation ID
        timestamp: '2025-01-14T10:00:00Z'
      }
    ]

    render(<UserActivityTimeline activities={activities} userId="user-1" />)
    
    const card = screen.getByText('Sent a message').closest('.cursor-pointer')
    if (card) {
      await user.click(card)
      // Should not navigate when conversationId is empty
      expect(mockPush).not.toHaveBeenCalled()
    }
  })
})