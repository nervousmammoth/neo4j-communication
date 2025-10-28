import { render, screen } from '@testing-library/react'
import ParticipantList from '@/components/participant-list'
import { describe, it, expect } from 'vitest'
import type { Participant } from '@/lib/api-client'

describe('ParticipantList', () => {
  const mockParticipants: Participant[] = [
    {
      userId: 'user-001',
      name: 'Alice Johnson',
      email: 'alice@company.com',
      avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=alice',
      status: 'online'
    },
    {
      userId: 'user-002',
      name: 'Bob Smith',
      email: 'bob@company.com',
      avatarUrl: null,
      status: 'offline'
    },
    {
      userId: 'user-003',
      name: 'Charlie Davis',
      email: 'charlie@company.com',
      avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=charlie',
      status: 'away'
    }
  ]

  it('should render participant count', () => {
    render(<ParticipantList participants={mockParticipants} />)
    expect(screen.getByText('Participants (3)')).toBeInTheDocument()
  })

  it('should render all participant names', () => {
    render(<ParticipantList participants={mockParticipants} />)
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('Charlie Davis')).toBeInTheDocument()
  })

  it('should render participant emails', () => {
    render(<ParticipantList participants={mockParticipants} />)
    expect(screen.getByText('alice@company.com')).toBeInTheDocument()
    expect(screen.getByText('bob@company.com')).toBeInTheDocument()
    expect(screen.getByText('charlie@company.com')).toBeInTheDocument()
  })

  it('should render participant avatars', () => {
    // Check for Avatar components using the data-slot attribute from shadcn components
    const { container } = render(<ParticipantList participants={mockParticipants} />)
    const avatarElements = container.querySelectorAll('[data-slot="avatar"]')
    expect(avatarElements).toHaveLength(3) // All participants have avatars (image or fallback)
    
    // Check that participant initials are rendered (key functionality)
    expect(screen.getByText('AJ')).toBeInTheDocument() // Alice Johnson's initials
    expect(screen.getByText('BS')).toBeInTheDocument() // Bob Smith's initials  
    expect(screen.getByText('CD')).toBeInTheDocument() // Charlie Davis's initials
  })

  it('should render initials for participants without avatar', () => {
    render(<ParticipantList participants={mockParticipants} />)
    expect(screen.getByText('BS')).toBeInTheDocument() // Bob Smith's initials
  })

  it('should render status indicators with correct colors', () => {
    const { container } = render(<ParticipantList participants={mockParticipants} />)
    
    // Find all status indicators
    const statusIndicators = container.querySelectorAll('.absolute.rounded-full')
    
    expect(statusIndicators).toHaveLength(3)
    expect(statusIndicators[0]).toHaveClass('bg-green-500') // Alice - online
    expect(statusIndicators[1]).toHaveClass('bg-gray-400') // Bob - offline
    expect(statusIndicators[2]).toHaveClass('bg-yellow-500') // Charlie - away
  })

  it('should render unknown status with default gray color', () => {
    const participantWithUnknownStatus: Participant = {
      userId: 'user-004',
      name: 'David Unknown',
      email: 'david@company.com',
      avatarUrl: null,
      status: 'unknown' as any // Force an unknown status
    }
    const { container } = render(<ParticipantList participants={[participantWithUnknownStatus]} />)
    
    const statusIndicator = container.querySelector('.absolute.rounded-full')
    expect(statusIndicator).toHaveClass('bg-gray-400') // Default color
  })

  it('should handle empty participants list', () => {
    render(<ParticipantList participants={[]} />)
    expect(screen.getByText('Participants (0)')).toBeInTheDocument()
    expect(screen.getByText('No participants')).toBeInTheDocument()
  })

  it('should handle participants with single name', () => {
    const singleNameParticipant = {
      ...mockParticipants[0],
      name: 'Madonna',
      avatarUrl: null // Remove avatar to see initials
    }
    render(<ParticipantList participants={[singleNameParticipant]} />)
    expect(screen.getByText('M')).toBeInTheDocument() // Single initial
  })

  it('should apply correct layout for mobile and desktop', () => {
    const { container } = render(<ParticipantList participants={mockParticipants} />)
    const participantGrid = container.querySelector('.grid.grid-cols-1')
    expect(participantGrid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3')
  })
})