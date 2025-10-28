import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsersView } from '@/components/users-view'
import type { UserSummary } from '@/lib/neo4j'

// Mock the useViewPreference hook
vi.mock('@/hooks/useViewPreference', () => ({
  useViewPreference: vi.fn(() => ({
    view: 'list',
    setView: vi.fn()
  }))
}))

// Mock the ViewToggle component
vi.mock('@/components/view-toggle', () => ({
  ViewToggle: ({ view, onViewChange }: { view: string; onViewChange: (view: string) => void }) => (
    <div data-testid="view-toggle">
      <button 
        onClick={() => onViewChange('list')} 
        className={view === 'list' ? 'active' : ''}
        data-testid="list-view-button"
      >
        List
      </button>
      <button 
        onClick={() => onViewChange('card')} 
        className={view === 'card' ? 'active' : ''}
        data-testid="card-view-button"
      >
        Card
      </button>
    </div>
  )
}))

// Mock the UsersTable component
vi.mock('@/components/users-table', () => ({
  UsersTable: ({ users }: { users: UserSummary[] }) => (
    <div data-testid="users-table">
      <table>
        <tbody>
          {users.map(user => (
            <tr key={user.userId} data-testid={`user-row-${user.userId}`}>
              <td>{user.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}))

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} data-testid={`link-${href.replace(/[\/\-]/g, '_')}`}>
      {children}
    </a>
  )
}))

import { useViewPreference } from '@/hooks/useViewPreference'

describe('UsersView', () => {
  const mockUsers: UserSummary[] = [
    {
      userId: 'user-1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      avatar: 'https://example.com/avatar1.png',
      conversationCount: 3,
      messageCount: 15,
      lastActiveTimestamp: '2024-01-01T10:00:00Z'
    },
    {
      userId: 'user-2',
      name: 'Bob Smith',
      email: 'bob@example.com',
      avatar: null,
      conversationCount: 2,
      messageCount: 8,
      lastActiveTimestamp: '2024-01-01T09:30:00Z'
    },
    {
      userId: 'user-3',
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      avatar: null,
      conversationCount: 0,
      messageCount: 0,
      lastActiveTimestamp: '2024-01-01T08:00:00Z'
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

  describe('Basic rendering', () => {
    it('renders the page title', () => {
      render(<UsersView users={mockUsers} currentPage={1} />)
      
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Users')
    })

    it('renders the view toggle component', () => {
      render(<UsersView users={mockUsers} currentPage={1} />)
      
      expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
      expect(screen.getByTestId('list-view-button')).toBeInTheDocument()
      expect(screen.getByTestId('card-view-button')).toBeInTheDocument()
    })

    it('displays users count in header area', () => {
      render(<UsersView users={mockUsers} currentPage={1} />)
      
      // The header should be present with proper structure
      const header = screen.getByText('Users').closest('div')
      expect(header).toHaveClass('flex', 'items-center', 'justify-between')
    })
  })

  describe('List view', () => {
    it('renders UsersTable component in list view', () => {
      // Mock useViewPreference to return list view
      vi.mocked(vi.fn()).mockReturnValue({
        view: 'list',
        setView: mockSetView
      })

      render(<UsersView users={mockUsers} currentPage={1} />)
      
      expect(screen.getByTestId('users-table')).toBeInTheDocument()
      expect(screen.getByTestId('user-row-user-1')).toBeInTheDocument()
      expect(screen.getByTestId('user-row-user-2')).toBeInTheDocument()
      expect(screen.getByTestId('user-row-user-3')).toBeInTheDocument()
    })

    it('passes all users to UsersTable component', () => {
      render(<UsersView users={mockUsers} currentPage={1} />)
      
      const userTable = screen.getByTestId('users-table')
      expect(userTable).toBeInTheDocument()
      
      // Check that all users are rendered in the table
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument()
    })
  })

  describe('Card view', () => {
    beforeEach(() => {
      // Mock useViewPreference to return card view
      vi.mocked(useViewPreference).mockReturnValue({
        view: 'card',
        setView: mockSetView
      })
    })

    it('renders user cards in card view', () => {
      const { container } = render(<UsersView users={mockUsers} currentPage={1} />)
      
      // Should not show table in card view
      expect(screen.queryByTestId('users-table')).not.toBeInTheDocument()
      
      // Should show cards in grid layout
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-4')
    })

    it('displays user avatars correctly in card view', () => {
      const { container } = render(<UsersView users={mockUsers} currentPage={1} />)
      
      // Check for Avatar components using the data-slot attribute from shadcn components
      const avatarElements = container.querySelectorAll('[data-slot="avatar"]')
      expect(avatarElements).toHaveLength(3) // All users have avatars (image or fallback)
      
      // Bob has no avatar, should show initials
      expect(screen.getByText('BS')).toBeInTheDocument() // Bob Smith initials
    })

    it('shows proper initials for users without avatars', () => {
      render(<UsersView users={mockUsers} currentPage={1} />)
      
      // Bob Smith should show "BS"
      expect(screen.getByText('BS')).toBeInTheDocument()
      
      // Charlie Brown should show "CB"
      expect(screen.getByText('CB')).toBeInTheDocument()
    })

    it('handles single name users for initials', () => {
      const singleNameUser: UserSummary = {
        userId: 'user-single',
        name: 'Madonna',
        email: 'madonna@example.com',
        avatar: null,
        conversationCount: 1,
        messageCount: 5,
        lastActiveTimestamp: '2024-01-01T12:00:00Z'
      }

      render(<UsersView users={[singleNameUser]} currentPage={1} />)
      
      expect(screen.getByText('M')).toBeInTheDocument()
    })

    it('displays user information in cards', () => {
      render(<UsersView users={mockUsers} currentPage={1} />)
      
      // Check Alice's information
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('3 conversations')).toBeInTheDocument()
      expect(screen.getByText('15 messages')).toBeInTheDocument()
      
      // Check zero counts for Charlie
      expect(screen.getByText('0 conversations')).toBeInTheDocument()
      expect(screen.getByText('0 messages')).toBeInTheDocument()
    })

    it('formats timestamps correctly', () => {
      render(<UsersView users={mockUsers} currentPage={1} />)
      
      // formatLastSeen returns relative time or "MMM dd" format for older dates
      // For 2024-01-01 timestamps, it should show "Jan 01" format
      const timestampElements = screen.getAllByText(/Jan 01|\d+[hd] ago|Just now/)
      expect(timestampElements.length).toBeGreaterThanOrEqual(3)
    })

    it('handles invalid timestamp gracefully', () => {
      const userWithInvalidDate: UserSummary = {
        userId: 'user-invalid',
        name: 'Invalid User',
        email: 'invalid@example.com',
        avatar: null,
        conversationCount: 1,
        messageCount: 5,
        lastActiveTimestamp: 'invalid-date'
      }

      render(<UsersView users={[userWithInvalidDate]} currentPage={1} />)
      
      // formatLastSeen returns "Unknown" for invalid dates
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('creates correct links with currentPage parameter', () => {
      render(<UsersView users={mockUsers} currentPage={2} />)
      
      // Check that links include the currentPage parameter
      const aliceLink = screen.getByText('Alice Johnson').closest('a')
      expect(aliceLink).toHaveAttribute('href', '/users/user-1?from=2')
      
      const bobLink = screen.getByText('Bob Smith').closest('a')
      expect(bobLink).toHaveAttribute('href', '/users/user-2?from=2')
    })
  })

  describe('View toggle interaction', () => {
    it('calls setView when view toggle is clicked', async () => {
      const user = userEvent.setup()
      render(<UsersView users={mockUsers} currentPage={1} />)
      
      const cardViewButton = screen.getByTestId('card-view-button')
      await user.click(cardViewButton)
      
      expect(mockSetView).toHaveBeenCalledWith('card')
    })

    it('calls setView when list view is selected', async () => {
      const user = userEvent.setup()
      render(<UsersView users={mockUsers} currentPage={1} />)
      
      const listViewButton = screen.getByTestId('list-view-button')
      await user.click(listViewButton)
      
      expect(mockSetView).toHaveBeenCalledWith('list')
    })
  })

  describe('Empty state', () => {
    it('handles empty users array gracefully', () => {
      render(<UsersView users={[]} currentPage={1} />)
      
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
      expect(screen.getByTestId('users-table')).toBeInTheDocument()
    })
  })

  describe('Utility functions', () => {
    it('getInitials function works correctly', () => {
      // Test the getInitials function logic through component rendering
      const testUsers: UserSummary[] = [
        {
          userId: 'test-1',
          name: 'John Doe Smith Williams',
          email: 'john@example.com',
          avatar: null,
          conversationCount: 1,
          messageCount: 1,
          lastActiveTimestamp: '2024-01-01T10:00:00Z'
        }
      ]

      // Mock card view to see initials
      vi.mocked(useViewPreference).mockReturnValue({
        view: 'card',
        setView: mockSetView
      })

      render(<UsersView users={testUsers} currentPage={1} />)
      
      // Should take first two initials and uppercase them
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('formatDate function handles various date formats', () => {
      const testUsers: UserSummary[] = [
        {
          userId: 'test-date-1',
          name: 'Date Test User',
          email: 'date@example.com',
          avatar: null,
          conversationCount: 1,
          messageCount: 1,
          lastActiveTimestamp: '2024-03-15T14:30:45Z'
        }
      ]

      vi.mocked(useViewPreference).mockReturnValue({
        view: 'card',
        setView: mockSetView
      })

      render(<UsersView users={testUsers} currentPage={1} />)
      
      // formatLastSeen returns "Mar 15" format for older dates
      expect(screen.getByText(/Mar 15/)).toBeInTheDocument()
    })
  })

  describe('Layout and styling', () => {
    it('applies correct container styling', () => {
      const { container } = render(<UsersView users={mockUsers} currentPage={1} />)
      
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('space-y-6')
    })

    it('applies correct header styling', () => {
      render(<UsersView users={mockUsers} currentPage={1} />)
      
      const header = screen.getByText('Users').closest('div')
      expect(header).toHaveClass('flex', 'items-center', 'justify-between')
      
      const title = screen.getByText('Users')
      expect(title).toHaveClass('text-3xl', 'font-bold')
    })

    it('applies correct card styling in card view', () => {
      vi.mocked(useViewPreference).mockReturnValue({
        view: 'card',
        setView: mockSetView
      })

      const { container } = render(<UsersView users={mockUsers} currentPage={1} />)
      
      const cardLink = container.querySelector('a')
      expect(cardLink).toHaveClass('block', 'transition-transform', 'hover:scale-[1.02]')
      
      const card = container.querySelector('[data-slot="card"]')
      expect(card).toHaveClass('h-full', 'hover:shadow-lg', 'transition-shadow')
    })
  })
})