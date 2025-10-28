import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommunicationSkeleton } from '@/components/communication-skeleton'

// Mock the UI components
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className}>Loading...</div>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>{children}</div>
  ),
}))

describe('CommunicationSkeleton', () => {
  it('renders all main sections', () => {
    const { container } = render(<CommunicationSkeleton />)
    
    // Check main container structure
    const mainContainer = container.firstChild
    expect(mainContainer).toHaveClass('space-y-8')
    
    // Should have header section and content grid
    const sections = container.querySelectorAll('.space-y-8 > div')
    expect(sections.length).toBeGreaterThan(0)
  })

  it('renders header section with user profiles', () => {
    render(<CommunicationSkeleton />)
    
    const skeletons = screen.getAllByTestId('skeleton')
    
    // Find avatar skeletons (rounded-full, h-12 w-12)
    const avatarSkeletons = skeletons.filter(s => 
      s.className.includes('rounded-full') && 
      s.className.includes('h-12') && 
      s.className.includes('w-12')
    )
    
    // Should have 2 user avatars
    expect(avatarSkeletons).toHaveLength(2)
  })

  it('renders arrow icon between users', () => {
    render(<CommunicationSkeleton />)
    
    const skeletons = screen.getAllByTestId('skeleton')
    
    // Find arrow skeleton (h-6 w-6)
    const arrowSkeleton = skeletons.find(s => 
      s.className === 'h-6 w-6'
    )
    
    expect(arrowSkeleton).toBeDefined()
  })

  it('renders switch button skeleton', () => {
    render(<CommunicationSkeleton />)
    
    const skeletons = screen.getAllByTestId('skeleton')
    
    // Find switch button skeleton (h-10 w-24)
    const switchSkeleton = skeletons.find(s => 
      s.className === 'h-10 w-24'
    )
    
    expect(switchSkeleton).toBeDefined()
  })

  it('renders 4 statistics cards', () => {
    render(<CommunicationSkeleton />)
    
    const cards = screen.getAllByTestId('card')
    
    // Filter for statistics cards (those with p-4 class)
    const statCards = cards.filter(card => 
      card.className.includes('p-4')
    )
    
    // First 4 cards should be statistics cards
    expect(statCards.length).toBeGreaterThanOrEqual(4)
  })

  it('renders statistics cards with correct grid layout', () => {
    const { container } = render(<CommunicationSkeleton />)
    
    // Find the statistics grid
    const statsGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-4')
    expect(statsGrid).toBeInTheDocument()
    
    // Should have 4 children (stat cards)
    expect(statsGrid?.children).toHaveLength(4)
  })

  it('renders content grid with correct layout', () => {
    const { container } = render(<CommunicationSkeleton />)
    
    // Find the content grid
    const contentGrid = container.querySelector('.grid.gap-6.lg\\:grid-cols-3')
    expect(contentGrid).toBeInTheDocument()
    
    // Should have 2 children (conversations list and message timeline)
    expect(contentGrid?.children).toHaveLength(2)
  })

  it('renders conversations list in left column', () => {
    const { container } = render(<CommunicationSkeleton />)
    
    // Find the conversations column
    const conversationsColumn = container.querySelector('.lg\\:col-span-1')
    expect(conversationsColumn).toBeInTheDocument()
    
    // Should have title skeleton
    const titleSkeleton = conversationsColumn?.querySelector('.h-6.w-32')
    expect(titleSkeleton).toBeInTheDocument()
    
    // Should have 3 conversation cards
    const conversationCards = conversationsColumn?.querySelectorAll('.space-y-2 .p-3')
    expect(conversationCards).toHaveLength(3)
  })

  it('renders 3 conversation skeletons', () => {
    const { container } = render(<CommunicationSkeleton />)
    
    // Find conversation cards in the left column
    const conversationsColumn = container.querySelector('.lg\\:col-span-1')
    const conversationCards = conversationsColumn?.querySelectorAll('[data-testid="card"].p-3')
    
    expect(conversationCards).toHaveLength(3)
    
    // Each card should have title and metadata skeletons
    conversationCards?.forEach(card => {
      const skeletons = card.querySelectorAll('[data-testid="skeleton"]')
      expect(skeletons.length).toBeGreaterThanOrEqual(3) // title + 2 metadata items
    })
  })

  it('renders message timeline in right columns', () => {
    const { container } = render(<CommunicationSkeleton />)
    
    // Find the message timeline column
    const timelineColumn = container.querySelector('.lg\\:col-span-2')
    expect(timelineColumn).toBeInTheDocument()
    
    // Should have header with title and controls
    const headerSkeletons = timelineColumn?.querySelectorAll('.flex.items-center.justify-between [data-testid="skeleton"]')
    expect(headerSkeletons?.length).toBeGreaterThan(0)
  })

  it('renders 4 message skeletons', () => {
    const { container } = render(<CommunicationSkeleton />)
    
    // Find message cards in the timeline column
    const timelineColumn = container.querySelector('.lg\\:col-span-2')
    const messageCards = timelineColumn?.querySelectorAll('.space-y-2 > [data-testid="card"].p-4')
    
    expect(messageCards).toHaveLength(4)
    
    // Each message should have avatar and content
    messageCards?.forEach(card => {
      // Should have avatar skeleton
      const avatarSkeleton = card.querySelector('.h-8.w-8.rounded-full')
      expect(avatarSkeleton).toBeInTheDocument()
      
      // Should have content skeletons
      const contentSkeletons = card.querySelectorAll('.flex-1 [data-testid="skeleton"]')
      expect(contentSkeletons.length).toBeGreaterThan(0)
    })
  })

  it('renders search and filter controls in timeline header', () => {
    const { container } = render(<CommunicationSkeleton />)
    
    // Find the timeline header
    const timelineHeader = container.querySelector('.lg\\:col-span-2 .flex.items-center.justify-between')
    expect(timelineHeader).toBeInTheDocument()
    
    // Should have search input skeleton (h-9 w-48)
    const searchSkeleton = timelineHeader?.querySelector('.h-9.w-48')
    expect(searchSkeleton).toBeInTheDocument()
    
    // Should have filter button skeleton (h-9 w-20)
    const filterSkeleton = timelineHeader?.querySelector('.h-9.w-20')
    expect(filterSkeleton).toBeInTheDocument()
  })

  it('applies correct sizes to user profile skeletons', () => {
    render(<CommunicationSkeleton />)
    
    const skeletons = screen.getAllByTestId('skeleton')
    
    // Find user name skeletons (h-4 w-24)
    const nameSkeletons = skeletons.filter(s => 
      s.className === 'h-4 w-24'
    )
    
    // Should have at least 2 (one for each user)
    expect(nameSkeletons.length).toBeGreaterThanOrEqual(2)
    
    // Find user email skeletons (h-3 w-32)
    const emailSkeletons = skeletons.filter(s => 
      s.className === 'h-3 w-32'
    )
    
    // Should have at least 2 (one for each user)
    expect(emailSkeletons.length).toBeGreaterThanOrEqual(2)
  })

  it('applies correct sizes to stat card skeletons', () => {
    const { container } = render(<CommunicationSkeleton />)
    
    // Find stat cards
    const statCards = container.querySelectorAll('.grid.gap-4.md\\:grid-cols-4 [data-testid="card"]')
    
    statCards.forEach(card => {
      // Should have label skeleton (h-3 w-20)
      const labelSkeleton = card.querySelector('.h-3.w-20')
      expect(labelSkeleton).toBeInTheDocument()
      
      // Should have value skeleton (h-6 w-16)
      const valueSkeleton = card.querySelector('.h-6.w-16')
      expect(valueSkeleton).toBeInTheDocument()
    })
  })

  it('renders correct total number of skeleton elements', () => {
    render(<CommunicationSkeleton />)
    
    const skeletons = screen.getAllByTestId('skeleton')
    
    // Expected skeletons:
    // Header: 2 avatars + 4 user details + 1 arrow + 1 switch = 8
    // Stats: 4 cards × 2 skeletons = 8
    // Conversations: 1 title + 3 cards × 3 skeletons = 10
    // Timeline: 1 title + 2 controls + 4 messages × ~5 skeletons = ~23
    // Total: ~49 skeletons
    
    expect(skeletons.length).toBeGreaterThan(40)
    expect(skeletons.length).toBeLessThan(60)
  })

  it('maintains consistent structure for loading state', () => {
    const { container } = render(<CommunicationSkeleton />)
    
    // Should have the main structure matching the actual component
    // Header section
    const headerSection = container.querySelector('.space-y-6')
    expect(headerSection).toBeInTheDocument()
    
    // Stats grid
    const statsGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-4')
    expect(statsGrid).toBeInTheDocument()
    
    // Content grid with proper column spans
    const contentGrid = container.querySelector('.grid.gap-6.lg\\:grid-cols-3')
    expect(contentGrid).toBeInTheDocument()
    
    const leftColumn = contentGrid?.querySelector('.lg\\:col-span-1')
    const rightColumn = contentGrid?.querySelector('.lg\\:col-span-2')
    
    expect(leftColumn).toBeInTheDocument()
    expect(rightColumn).toBeInTheDocument()
  })

  it('uses unique keys for mapped elements', () => {
    const { container } = render(<CommunicationSkeleton />)
    
    // Check that stat cards have unique keys (React will warn if not)
    const statCards = container.querySelectorAll('.grid.gap-4.md\\:grid-cols-4 > [data-testid="card"]')
    expect(statCards).toHaveLength(4)
    
    // Check conversation cards have unique keys
    const conversationCards = container.querySelectorAll('.lg\\:col-span-1 .space-y-2 > [data-testid="card"]')
    expect(conversationCards).toHaveLength(3)
    
    // Check message cards have unique keys
    const messageCards = container.querySelectorAll('.lg\\:col-span-2 .space-y-2 > [data-testid="card"]')
    expect(messageCards).toHaveLength(4)
  })
})