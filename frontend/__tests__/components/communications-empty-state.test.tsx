import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommunicationsEmptyState } from '@/components/communications-empty-state'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MessageSquareMore: ({ className, ...props }: any) => (
    <svg data-testid="icon-message-square-more" className={className} {...props} />
  ),
}))

describe('CommunicationsEmptyState', () => {
  describe('Rendering', () => {
    it('should render the empty state container', () => {
      const { container } = render(<CommunicationsEmptyState />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('should display the MessageSquareMore icon', () => {
      render(<CommunicationsEmptyState />)

      const icon = screen.getByTestId('icon-message-square-more')
      expect(icon).toBeInTheDocument()
    })

    it('should have proper icon styling classes', () => {
      render(<CommunicationsEmptyState />)

      const icon = screen.getByTestId('icon-message-square-more')
      expect(icon).toHaveClass('h-12', 'w-12', 'mx-auto', 'text-muted-foreground')
    })
  })

  describe('Content', () => {
    it('should display the main heading', () => {
      render(<CommunicationsEmptyState />)

      const heading = screen.getByText('No Recent Analyses')
      expect(heading).toBeInTheDocument()
      expect(heading.tagName).toBe('H2')
    })

    it('should display the description text', () => {
      render(<CommunicationsEmptyState />)

      const description = screen.getByText(/Start analyzing user communications to understand interaction patterns/i)
      expect(description).toBeInTheDocument()
    })

    it('should display guidance heading', () => {
      render(<CommunicationsEmptyState />)

      const guidance = screen.getByText(/You can start an analysis from:/i)
      expect(guidance).toBeInTheDocument()
    })

    it('should list all entry points', () => {
      render(<CommunicationsEmptyState />)

      expect(screen.getByText(/Any user.*s profile page/i)).toBeInTheDocument()
      expect(screen.getByText(/Conversation participant lists/i)).toBeInTheDocument()
      expect(screen.getByText(/The command palette/i)).toBeInTheDocument()
    })

    it('should display keyboard shortcut hint', () => {
      render(<CommunicationsEmptyState />)

      const kbd = screen.getByText('Cmd+K')
      expect(kbd).toBeInTheDocument()
      expect(kbd.tagName).toBe('KBD')
    })

    it('should have proper kbd styling', () => {
      render(<CommunicationsEmptyState />)

      const kbd = screen.getByText('Cmd+K')
      expect(kbd).toHaveClass('px-1.5', 'py-0.5', 'text-xs', 'border', 'rounded')
    })
  })

  describe('Structure', () => {
    it('should center content', () => {
      const { container } = render(<CommunicationsEmptyState />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('text-center')
    })

    it('should have proper spacing', () => {
      const { container } = render(<CommunicationsEmptyState />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('py-12', 'space-y-4')
    })

    it('should render list items with proper formatting', () => {
      render(<CommunicationsEmptyState />)

      const lists = screen.getByRole('list')
      expect(lists).toBeInTheDocument()

      // Check for bullet points
      const listItems = lists.querySelectorAll('li')
      expect(listItems.length).toBe(3)
    })
  })

  describe('Typography', () => {
    it('should have proper heading styles', () => {
      render(<CommunicationsEmptyState />)

      const heading = screen.getByText('No Recent Analyses')
      expect(heading).toHaveClass('text-xl', 'font-semibold')
    })

    it('should have muted description text', () => {
      render(<CommunicationsEmptyState />)

      const description = screen.getByText(/Start analyzing user communications/i)
      expect(description).toHaveClass('text-muted-foreground')
    })

    it('should constrain description width', () => {
      render(<CommunicationsEmptyState />)

      const description = screen.getByText(/Start analyzing user communications/i)
      expect(description).toHaveClass('max-w-md', 'mx-auto')
    })

    it('should have proper list item styling', () => {
      render(<CommunicationsEmptyState />)

      const firstListItem = screen.getByText(/Any user.*s profile page/i)
      expect(firstListItem.parentElement).toHaveClass('text-sm', 'text-muted-foreground')
    })
  })

  describe('Accessibility', () => {
    it('should use semantic HTML headings', () => {
      render(<CommunicationsEmptyState />)

      const heading = screen.getByRole('heading', { name: /No Recent Analyses/i })
      expect(heading).toBeInTheDocument()
    })

    it('should use semantic list for entry points', () => {
      render(<CommunicationsEmptyState />)

      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(3)
    })

    it('should have descriptive text for screen readers', () => {
      render(<CommunicationsEmptyState />)

      // All text should be accessible
      expect(screen.getByText('No Recent Analyses')).toBeVisible()
      expect(screen.getByText(/Start analyzing user communications/i)).toBeVisible()
      expect(screen.getByText(/You can start an analysis from:/i)).toBeVisible()
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive spacing classes', () => {
      const { container } = render(<CommunicationsEmptyState />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('py-12')
    })

    it('should have responsive text sizing', () => {
      render(<CommunicationsEmptyState />)

      const heading = screen.getByText('No Recent Analyses')
      expect(heading).toHaveClass('text-xl')

      const description = screen.getByText(/Start analyzing/i)
      expect(description).toHaveClass('text-muted-foreground')
    })
  })
})
