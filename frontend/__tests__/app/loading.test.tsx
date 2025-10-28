import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Loading from '@/app/loading'

// Mock the ConversationsSkeleton component
vi.mock('@/components/conversations-skeleton', () => ({
  ConversationsSkeleton: () => <div data-testid="conversations-skeleton">Loading skeleton</div>,
}))

describe('Loading', () => {
  it('renders loading state correctly', () => {
    render(<Loading />)

    // Check heading
    expect(screen.getByText('Conversations')).toBeInTheDocument()
    expect(screen.getByText('Browse and analyze conversation data from the Neo4j database')).toBeInTheDocument()
    
    // Check skeleton is rendered
    expect(screen.getByTestId('conversations-skeleton')).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    const { container } = render(<Loading />)

    const mainContainer = container.firstChild
    expect(mainContainer).toHaveClass('container', 'mx-auto', 'py-10')

    const heading = screen.getByText('Conversations')
    expect(heading).toHaveClass('text-3xl', 'font-bold', 'tracking-tight')

    const description = screen.getByText('Browse and analyze conversation data from the Neo4j database')
    expect(description).toHaveClass('text-muted-foreground', 'mt-2')
  })

  it('maintains consistent structure with main page', () => {
    const { container } = render(<Loading />)

    // Check structure matches the main page
    const headerSection = container.querySelector('.mb-8')
    expect(headerSection).toBeInTheDocument()
    
    // Should have same heading and description
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Conversations')
  })

  it('renders skeleton component in correct position', () => {
    const { container } = render(<Loading />)

    // Skeleton should be after the header section
    const skeleton = screen.getByTestId('conversations-skeleton')
    const headerSection = container.querySelector('.mb-8')
    
    expect(skeleton.parentElement).toBe(container.firstChild)
    expect(headerSection?.nextElementSibling).toContain(skeleton)
  })
})