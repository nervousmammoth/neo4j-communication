import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserProfileHeader } from '@/components/user-profile-header'

// Mock the UserAvatar component
vi.mock('@/components/user-avatar', () => ({
  UserAvatar: ({ user, size }: any) => (
    <div data-testid="user-avatar" data-size={size}>
      {user.name}
    </div>
  )
}))

// Mock the date formatting utility
vi.mock('@/lib/date-formatting', () => ({
  formatLastSeen: (date: string) => {
    if (!date) return 'Never'
    return `Last seen: ${date}`
  },
  formatDate: (date: string) => {
    if (!date) return 'Unknown'
    return new Date(date).toLocaleDateString()
  }
}))

describe('UserProfileHeader', () => {
  const mockUser = {
    userId: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    username: 'johndoe',
    avatarUrl: 'https://example.com/avatar.jpg',
    bio: 'Software Developer',
    status: 'online',
    lastSeen: '2025-01-14T10:00:00Z',
    department: 'Engineering',
    location: 'San Francisco',
    role: 'Senior Developer'
  }

  it('should render user profile information', () => {
    render(<UserProfileHeader user={mockUser} />)

    // Check user name and email
    expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('@johndoe')).toBeInTheDocument()

    // Check bio
    expect(screen.getByText('Software Developer')).toBeInTheDocument()

    // Check department and location
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('San Francisco')).toBeInTheDocument()

    // Check status
    expect(screen.getByText('online')).toBeInTheDocument()

    // Check avatar is rendered
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
    expect(screen.getByTestId('user-avatar')).toHaveAttribute('data-size', 'lg')
  })

  it('should show online status with green indicator', () => {
    render(<UserProfileHeader user={mockUser} />)
    
    const statusElement = screen.getByText('online')
    expect(statusElement).toHaveClass('text-green-600')
  })

  it('should show offline status with gray indicator', () => {
    const offlineUser = { ...mockUser, status: 'offline' }
    render(<UserProfileHeader user={offlineUser} />)
    
    const statusElement = screen.getByText('offline')
    expect(statusElement).toHaveClass('text-gray-500')
  })

  it('should handle missing optional fields gracefully', () => {
    const minimalUser = {
      userId: 'user-456',
      name: 'Jane Smith',
      email: 'jane@example.com',
      username: 'janesmith',
      status: 'online',
      lastSeen: '2025-01-14T10:00:00Z'
    }

    render(<UserProfileHeader user={minimalUser} />)

    expect(screen.getByRole('heading', { name: 'Jane Smith' })).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('@janesmith')).toBeInTheDocument()

    // Bio, department, and location should not render
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
    expect(screen.queryByText('San Francisco')).not.toBeInTheDocument()
  })

  it('should render action buttons', () => {
    render(<UserProfileHeader user={mockUser} />)

    // Check for action buttons
    expect(screen.getByRole('button', { name: /message/i })).toBeInTheDocument()
    // View Conversations is a link, not a button
    expect(screen.getByRole('link', { name: /view conversations/i })).toBeInTheDocument()
  })

  it('should display last seen timestamp', () => {
    render(<UserProfileHeader user={mockUser} />)

    expect(screen.getByText('Last seen: 2025-01-14T10:00:00Z')).toBeInTheDocument()
  })

  it('should handle users who have never been seen', () => {
    const neverSeenUser = { ...mockUser, lastSeen: null }
    render(<UserProfileHeader user={neverSeenUser} />)

    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('should display user role when available', () => {
    render(<UserProfileHeader user={mockUser} />)

    expect(screen.getByText('Senior Developer')).toBeInTheDocument()
  })

  it('should handle long bio text with truncation', () => {
    const longBioUser = {
      ...mockUser,
      bio: 'This is a very long bio that contains a lot of information about the user and their background, interests, skills, and experience in various fields of software development and technology.'
    }

    render(<UserProfileHeader user={longBioUser} />)

    const bioElement = screen.getByText(longBioUser.bio)
    expect(bioElement).toHaveClass('line-clamp-3')
  })

  it('should render status badge with appropriate styling', () => {
    const busyUser = { ...mockUser, status: 'busy' }
    render(<UserProfileHeader user={busyUser} />)

    const statusElement = screen.getByText('busy')
    expect(statusElement).toHaveClass('text-yellow-600')
  })

  it('should render away status correctly', () => {
    const awayUser = { ...mockUser, status: 'away' }
    render(<UserProfileHeader user={awayUser} />)

    const statusElement = screen.getByText('away')
    expect(statusElement).toHaveClass('text-orange-600')
  })

  it('should handle email display for long email addresses', () => {
    const longEmailUser = {
      ...mockUser,
      email: 'very.long.email.address@example-company.com'
    }

    render(<UserProfileHeader user={longEmailUser} />)

    const emailElement = screen.getByText(longEmailUser.email)
    expect(emailElement).toHaveClass('truncate')
  })

  it('should render with custom className if provided', () => {
    const { container } = render(
      <UserProfileHeader user={mockUser} className="custom-class" />
    )

    const headerElement = container.firstChild
    expect(headerElement).toHaveClass('custom-class')
  })

  it('should render user avatar with correct props', () => {
    render(<UserProfileHeader user={mockUser} />)

    const avatar = screen.getByTestId('user-avatar')
    expect(avatar).toHaveTextContent('John Doe')
    expect(avatar).toHaveAttribute('data-size', 'lg')
  })

  it('should handle users without username', () => {
    const noUsernameUser = { ...mockUser, username: undefined }
    render(<UserProfileHeader user={noUsernameUser} />)

    // Username section should not render  
    // Check that @john.doe is not displayed (mockUser.username value)
    expect(screen.queryByText(/@john.doe/i)).not.toBeInTheDocument()
  })
})