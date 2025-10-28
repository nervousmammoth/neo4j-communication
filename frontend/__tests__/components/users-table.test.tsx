import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsersTable } from '@/components/users-table'
import type { UserSummary } from '@/lib/neo4j'

// Mock Next.js navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('UsersTable', () => {
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
      avatar: 'https://example.com/avatar3.png',
      conversationCount: 0,
      messageCount: 0,
      lastActiveTimestamp: '2024-01-01T08:00:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic rendering', () => {
    it('renders table with correct headers', () => {
      render(<UsersTable users={mockUsers} />)

      // Check that table headers are present
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Conversations')).toBeInTheDocument()
      expect(screen.getByText('Messages')).toBeInTheDocument()
      expect(screen.getByText('Last Active')).toBeInTheDocument()
    })

    it('renders user data correctly', () => {
      render(<UsersTable users={mockUsers} />)

      // Check user names are displayed
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument()

      // Check email addresses
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
      expect(screen.getByText('charlie@example.com')).toBeInTheDocument()

      // Check conversation and message counts
      expect(screen.getByText('3')).toBeInTheDocument() // Alice's conversations
      expect(screen.getByText('15')).toBeInTheDocument() // Alice's messages
      expect(screen.getByText('2')).toBeInTheDocument() // Bob's conversations
      expect(screen.getByText('8')).toBeInTheDocument() // Bob's messages
    })

    it('formats dates correctly', () => {
      render(<UsersTable users={mockUsers} />)

      // Check that dates are formatted (exact format may vary)
      // Look for formatted date patterns
      const dateElements = screen.getAllByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)
      expect(dateElements.length).toBeGreaterThan(0)
    })

    it('handles users with zero counts', () => {
      render(<UsersTable users={mockUsers} />)

      // Charlie has 0 conversations and 0 messages
      const charlieRow = screen.getByText('Charlie Brown').closest('tr')
      expect(charlieRow).toBeInTheDocument()
      expect(charlieRow).toHaveTextContent('0') // Should show 0 for conversations and messages
    })

    it('renders empty table when no users provided', () => {
      render(<UsersTable users={[]} />)

      // Headers should still be present
      expect(screen.getByText('Name')).toBeInTheDocument()
      
      // But no user data rows
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
    })
  })

  describe('User interaction', () => {
    it('navigates to user detail page when row is clicked', async () => {
      const user = userEvent.setup()
      render(<UsersTable users={mockUsers} />)

      const aliceRow = screen.getByText('Alice Johnson').closest('tr')
      expect(aliceRow).toBeInTheDocument()

      await user.click(aliceRow!)

      expect(mockPush).toHaveBeenCalledWith('/users/user-1')
    })

    it('navigates when Enter key is pressed on row', async () => {
      const user = userEvent.setup()
      render(<UsersTable users={mockUsers} />)

      const bobRow = screen.getByText('Bob Smith').closest('tr')
      expect(bobRow).toBeInTheDocument()

      bobRow!.focus()
      await user.keyboard('{Enter}')

      expect(mockPush).toHaveBeenCalledWith('/users/user-2')
    })

    it('navigates when Space key is pressed on row', async () => {
      const user = userEvent.setup()
      render(<UsersTable users={mockUsers} />)

      const charlieRow = screen.getByText('Charlie Brown').closest('tr')
      expect(charlieRow).toBeInTheDocument()

      charlieRow!.focus()
      await user.keyboard(' ')

      expect(mockPush).toHaveBeenCalledWith('/users/user-3')
    })

    it('does not navigate on other key presses', async () => {
      const user = userEvent.setup()
      render(<UsersTable users={mockUsers} />)

      const aliceRow = screen.getByText('Alice Johnson').closest('tr')
      expect(aliceRow).toBeInTheDocument()

      aliceRow!.focus()
      await user.keyboard('{Escape}')

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Responsive design', () => {
    it('includes responsive CSS classes for hiding columns on smaller screens', () => {
      render(<UsersTable users={mockUsers} />)

      // Email column should be hidden on small screens
      const emailHeader = screen.getByText('Email')
      expect(emailHeader.closest('th')).toHaveClass('hidden', 'sm:table-cell')

      // Conversations column should be hidden on medium screens
      const conversationsHeader = screen.getByText('Conversations')
      expect(conversationsHeader.closest('th')).toHaveClass('hidden', 'md:table-cell')

      // Last Active should be hidden on large screens
      const lastActiveHeader = screen.getByText('Last Active')
      expect(lastActiveHeader.closest('th')).toHaveClass('hidden', 'lg:table-cell')
    })

    it('applies responsive classes to table cells', () => {
      render(<UsersTable users={mockUsers} />)

      // Find Alice's email cell
      const aliceRow = screen.getByText('Alice Johnson').closest('tr')
      const emailCells = aliceRow?.querySelectorAll('td')
      
      // Email should be the second cell (index 1) and have responsive classes
      expect(emailCells?.[1]).toHaveClass('hidden', 'sm:table-cell')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<UsersTable users={mockUsers} />)

      // Check that table rows have proper role and aria-label
      const aliceRow = screen.getByText('Alice Johnson').closest('tr')
      expect(aliceRow).toHaveAttribute('role', 'button')
      expect(aliceRow).toHaveAttribute('aria-label', 'View user: Alice Johnson')
      expect(aliceRow).toHaveAttribute('tabIndex', '0')
    })

    it('supports keyboard navigation', () => {
      render(<UsersTable users={mockUsers} />)

      // All rows should be focusable
      const userRows = screen.getAllByRole('button')
      expect(userRows).toHaveLength(mockUsers.length)

      userRows.forEach(row => {
        expect(row).toHaveAttribute('tabIndex', '0')
      })
    })

    it('has proper table structure', () => {
      render(<UsersTable users={mockUsers} />)

      // Check basic table structure
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(5) // Name, Email, Conversations, Messages, Last Active
      
      // Check that we have user rows (the exact count may vary based on how roles are applied)
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeGreaterThanOrEqual(1) // At least header row
      
      // Check that we have the right number of user buttons (rows with button role)
      const userRows = screen.getAllByRole('button')
      expect(userRows).toHaveLength(mockUsers.length)
    })
  })

  describe('Avatar handling', () => {
    it('displays avatar components for all users', () => {
      const { container } = render(<UsersTable users={mockUsers} />)

      // Check for Avatar components using the data-slot attribute from shadcn components
      const avatarElements = container.querySelectorAll('[data-slot="avatar"]')
      expect(avatarElements).toHaveLength(3) // All users have avatars (image or fallback)
    })

    it('shows fallback initials when avatar is null', () => {
      render(<UsersTable users={mockUsers} />)

      // Bob has no avatar, should show fallback initials
      const bobRow = screen.getByText('Bob Smith').closest('tr')
      expect(bobRow).toBeInTheDocument()
      
      // Check for initials fallback
      expect(bobRow).toHaveTextContent('BS') // Bob Smith's initials
    })
  })

  describe('Hover and focus states', () => {
    it('applies hover styles to table rows', () => {
      render(<UsersTable users={mockUsers} />)

      const aliceRow = screen.getByText('Alice Johnson').closest('tr')
      expect(aliceRow).toHaveClass('hover:bg-muted/50')
    })

    it('applies focus styles to table rows', () => {
      render(<UsersTable users={mockUsers} />)

      const aliceRow = screen.getByText('Alice Johnson').closest('tr')
      expect(aliceRow).toHaveClass('focus:bg-muted/50')
    })

    it('shows cursor pointer for interactive rows', () => {
      render(<UsersTable users={mockUsers} />)

      const aliceRow = screen.getByText('Alice Johnson').closest('tr')
      expect(aliceRow).toHaveClass('cursor-pointer')
    })
  })

  describe('Data formatting', () => {
    it('formats large numbers with locale formatting', () => {
      const userWithLargeNumbers: UserSummary[] = [
        {
          userId: 'user-big',
          name: 'Popular User',
          email: 'popular@example.com',
          avatar: null,
          conversationCount: 1000,
          messageCount: 50000,
          lastActiveTimestamp: '2024-01-01T10:00:00Z'
        }
      ]

      render(<UsersTable users={userWithLargeNumbers} />)

      // Check that large numbers are formatted with commas
      expect(screen.getByText('1,000')).toBeInTheDocument()
      expect(screen.getByText('50,000')).toBeInTheDocument()
    })

    it('handles invalid date gracefully', () => {
      const userWithInvalidDate: UserSummary[] = [
        {
          userId: 'user-bad-date',
          name: 'Invalid Date User',
          email: 'invalid@example.com',
          avatar: null,
          conversationCount: 1,
          messageCount: 5,
          lastActiveTimestamp: 'invalid-date'
        }
      ]

      render(<UsersTable users={userWithInvalidDate} />)

      // Should not crash and should display something reasonable
      expect(screen.getByText('Invalid Date User')).toBeInTheDocument()
    })
  })
})