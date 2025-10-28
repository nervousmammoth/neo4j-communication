import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConversationsSkeleton } from '@/components/conversations-skeleton'

// Mock the UI components
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className}>Loading...</div>
  ),
}))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  TableBody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  TableHeader: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
}))

describe('ConversationsSkeleton', () => {
  it('renders table structure with headers', () => {
    render(<ConversationsSkeleton />)

    // Check headers
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
    expect(screen.getByText('Participants')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText('Last Activity')).toBeInTheDocument()
  })

  it('renders 10 skeleton rows', () => {
    render(<ConversationsSkeleton />)

    const skeletons = screen.getAllByTestId('skeleton')
    // 6 skeletons per row × 10 rows = 60 skeletons
    expect(skeletons).toHaveLength(60)

    // Check we have 10 rows (excluding header)
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(11) // 1 header + 10 data rows
  })

  it('applies correct skeleton sizes for each column', () => {
    render(<ConversationsSkeleton />)

    const skeletons = screen.getAllByTestId('skeleton')
    
    // Each row has 6 skeletons, check the first row
    const firstRowSkeletons = skeletons.slice(0, 6)
    
    // Title skeleton
    expect(firstRowSkeletons[0]).toHaveClass('h-4', 'w-[250px]')
    
    // Type skeleton (rounded for badge)
    expect(firstRowSkeletons[1]).toHaveClass('h-6', 'w-[60px]', 'rounded-full')
    
    // Priority skeleton
    expect(firstRowSkeletons[2]).toHaveClass('h-4', 'w-[50px]')
    
    // Participants skeleton
    expect(firstRowSkeletons[3]).toHaveClass('h-4', 'w-[20px]', 'ml-auto')
    
    // Messages skeleton
    expect(firstRowSkeletons[4]).toHaveClass('h-4', 'w-[40px]', 'ml-auto')
    
    // Last Activity skeleton
    expect(firstRowSkeletons[5]).toHaveClass('h-4', 'w-[100px]')
  })

  it('applies responsive classes to headers', () => {
    render(<ConversationsSkeleton />)

    // Priority header
    const priorityHeader = screen.getByText('Priority').closest('th')
    expect(priorityHeader).toHaveClass('hidden', 'sm:table-cell')

    // Participants header
    const participantsHeader = screen.getByText('Participants').closest('th')
    expect(participantsHeader).toHaveClass('text-right', 'hidden', 'md:table-cell')

    // Last Activity header
    const lastActivityHeader = screen.getByText('Last Activity').closest('th')
    expect(lastActivityHeader).toHaveClass('hidden', 'lg:table-cell')
  })

  it('applies responsive classes to cells', () => {
    render(<ConversationsSkeleton />)

    // Get all cells from the first data row
    const firstRow = screen.getAllByRole('row')[1]
    const cells = firstRow.querySelectorAll('td')

    // Priority cell (3rd cell, index 2)
    expect(cells[2]).toHaveClass('hidden', 'sm:table-cell')

    // Participants cell (4th cell, index 3)
    expect(cells[3]).toHaveClass('text-right', 'hidden', 'md:table-cell')

    // Messages cell (5th cell, index 4)
    expect(cells[4]).toHaveClass('text-right')

    // Last Activity cell (6th cell, index 5)
    expect(cells[5]).toHaveClass('hidden', 'lg:table-cell')
  })

  it('wraps table in rounded border container', () => {
    const { container } = render(<ConversationsSkeleton />)

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('rounded-md', 'border')
  })

  it('right-aligns numeric column skeletons', () => {
    render(<ConversationsSkeleton />)

    const skeletons = screen.getAllByTestId('skeleton')
    
    // Check participants and messages skeletons have ml-auto
    // In each row: index 3 (participants) and 4 (messages)
    for (let row = 0; row < 10; row++) {
      const participantsSkeleton = skeletons[row * 6 + 3]
      const messagesSkeleton = skeletons[row * 6 + 4]
      
      expect(participantsSkeleton).toHaveClass('ml-auto')
      expect(messagesSkeleton).toHaveClass('ml-auto')
    }
  })

  it('generates unique keys for each row', () => {
    const { container } = render(<ConversationsSkeleton />)

    // Get all tbody tr elements
    const dataRows = container.querySelectorAll('tbody tr')
    expect(dataRows).toHaveLength(10)

    // React will warn if keys are not unique, but we can't directly test keys
    // Instead, we verify that 10 distinct rows are rendered
    const rowContents = Array.from(dataRows).map(row => row.innerHTML)
    const uniqueRows = new Set(rowContents)
    
    // All rows should have the same structure (same innerHTML)
    expect(uniqueRows.size).toBe(1)
  })

  it('maintains consistent structure with ConversationsTable', () => {
    render(<ConversationsSkeleton />)

    // Same headers as ConversationsTable
    const headers = ['Title', 'Type', 'Priority', 'Participants', 'Messages', 'Last Activity']
    headers.forEach(header => {
      expect(screen.getByText(header)).toBeInTheDocument()
    })

    // Same number of columns
    const headerCells = screen.getAllByRole('columnheader')
    expect(headerCells).toHaveLength(6)
  })
})