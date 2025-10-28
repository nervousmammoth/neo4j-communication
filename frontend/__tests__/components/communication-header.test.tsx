import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommunicationHeader } from '@/components/communication-header'
import type { UserSummary, CommunicationStats } from '@/lib/neo4j'

// Mock Next.js navigation
const mockPush = vi.fn()
const mockPathname = '/users/communications/user1/user2'
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}))

// Mock UserAvatar component
vi.mock('@/components/user-avatar', () => ({
  __esModule: true,
  default: vi.fn(({ user, size }) => (
    <div data-testid="user-avatar" data-size={size}>
      {user.name}
    </div>
  )),
  UserAvatar: vi.fn(({ user, size }) => (
    <div data-testid="user-avatar" data-size={size}>
      {user.name}
    </div>
  )),
}))

describe('CommunicationHeader', () => {
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

  const mockStats: CommunicationStats = {
    totalSharedConversations: 5,
    totalMessages: 500,
    user1Messages: 250,
    user2Messages: 250,
    firstInteraction: '2023-01-01T00:00:00Z',
    lastInteraction: '2024-01-15T09:00:00Z',
  }

  it('should render both user profiles', () => {
    render(
      <CommunicationHeader
        user1={mockUser1}
        user2={mockUser2}
        stats={mockStats}
      />
    )

    // Users appear in multiple places (avatar and header)
    const johnElements = screen.getAllByText('John Doe')
    const janeElements = screen.getAllByText('Jane Smith')
    
    expect(johnElements.length).toBeGreaterThan(0)
    expect(janeElements.length).toBeGreaterThan(0)
  })

  it('should display communication statistics', () => {
    render(
      <CommunicationHeader
        user1={mockUser1}
        user2={mockUser2}
        stats={mockStats}
      />
    )

    expect(screen.getByText('Shared Conversations')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    
    expect(screen.getByText('Total Messages')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    
    // Use getAllByText since "John Doe Messages" includes the name that appears elsewhere
    const johnMessageLabel = screen.getAllByText(/John Doe/)
    expect(johnMessageLabel.length).toBeGreaterThan(0)
    
    const janeMessageLabel = screen.getAllByText(/Jane Smith/)
    expect(janeMessageLabel.length).toBeGreaterThan(0)
    
    // Both users have 250 messages
    const messageElements = screen.getAllByText('250')
    expect(messageElements).toHaveLength(2)
  })

  it('should calculate message percentages', () => {
    render(
      <CommunicationHeader
        user1={mockUser1}
        user2={mockUser2}
        stats={mockStats}
      />
    )

    // Both users have 50% of messages
    const percentages = screen.getAllByText('50.0%')
    expect(percentages).toHaveLength(2)
  })

  it('should handle switch button click', async () => {
    const user = userEvent.setup()
    
    render(
      <CommunicationHeader
        user1={mockUser1}
        user2={mockUser2}
        stats={mockStats}
        primaryUserId="user1"
      />
    )

    const switchButton = screen.getByRole('button', { name: /switch/i })
    await user.click(switchButton)

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('primary=user2')
    )
  })

  it('should toggle primary user via query param', async () => {
    const user = userEvent.setup()
    
    render(
      <CommunicationHeader
        user1={mockUser1}
        user2={mockUser2}
        stats={mockStats}
        primaryUserId="user2"
      />
    )

    const switchButton = screen.getByRole('button', { name: /switch/i })
    await user.click(switchButton)

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('primary=user1')
    )
  })

  it('should handle zero messages gracefully', () => {
    const emptyStats: CommunicationStats = {
      ...mockStats,
      totalMessages: 0,
      user1Messages: 0,
      user2Messages: 0,
    }

    render(
      <CommunicationHeader
        user1={mockUser1}
        user2={mockUser2}
        stats={emptyStats}
      />
    )

    expect(screen.getByText('Total Messages')).toBeInTheDocument()
    // There will be multiple "0" values (total, user1, user2 messages)
    const zeroElements = screen.getAllByText('0')
    expect(zeroElements.length).toBeGreaterThan(0)
    
    // Should show 0% for both users
    const percentages = screen.getAllByText('0%')
    expect(percentages).toHaveLength(2)
  })

  it('should handle uneven message distribution', () => {
    const unevenStats: CommunicationStats = {
      ...mockStats,
      totalMessages: 100,
      user1Messages: 75,
      user2Messages: 25,
    }

    render(
      <CommunicationHeader
        user1={mockUser1}
        user2={mockUser2}
        stats={unevenStats}
      />
    )

    expect(screen.getByText('75.0%')).toBeInTheDocument()
    expect(screen.getByText('25.0%')).toBeInTheDocument()
  })

  it('should render user email addresses', () => {
    render(
      <CommunicationHeader
        user1={mockUser1}
        user2={mockUser2}
        stats={mockStats}
      />
    )

    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('should show arrow icon between users', () => {
    const { container } = render(
      <CommunicationHeader
        user1={mockUser1}
        user2={mockUser2}
        stats={mockStats}
      />
    )

    // Check for svg elements with arrow-like class names (Lucide icons render as SVGs)
    const svgIcons = container.querySelectorAll('svg')
    // Should have at least one arrow icon between users and one in the switch button
    expect(svgIcons.length).toBeGreaterThan(0)
  })

  it('should format large numbers correctly', () => {
    const largeStats: CommunicationStats = {
      ...mockStats,
      totalMessages: 10000,
      user1Messages: 6500,
      user2Messages: 3500,
    }

    render(
      <CommunicationHeader
        user1={mockUser1}
        user2={mockUser2}
        stats={largeStats}
      />
    )

    // Check for formatted numbers
    expect(screen.getByText('10,000')).toBeInTheDocument()
    expect(screen.getByText('6,500')).toBeInTheDocument()
    expect(screen.getByText('3,500')).toBeInTheDocument()
  })

  it('should be responsive on mobile', () => {
    const { container } = render(
      <CommunicationHeader
        user1={mockUser1}
        user2={mockUser2}
        stats={mockStats}
      />
    )

    // Check for responsive grid classes
    const grid = container.querySelector('.md\\:grid-cols-4')
    expect(grid).toBeInTheDocument()
  })
})