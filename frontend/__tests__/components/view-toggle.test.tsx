import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewToggle } from '@/components/view-toggle'

describe('ViewToggle', () => {
  const mockOnViewChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders toggle group with list and card icons', () => {
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      // Should have toggle group with proper role
      expect(screen.getByRole('group')).toBeInTheDocument()
      
      // Should have both toggle options (ToggleGroup uses radio role)
      expect(screen.getByRole('radio', { name: /list view/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /card view/i })).toBeInTheDocument()
    })

    it('shows card view as selected by default', () => {
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      const cardButton = screen.getByRole('radio', { name: /card view/i })
      const listButton = screen.getByRole('radio', { name: /list view/i })
      
      expect(cardButton).toHaveAttribute('aria-checked', 'true')
      expect(listButton).toHaveAttribute('aria-checked', 'false')
    })

    it('shows list view as selected when prop is set to list', () => {
      render(
        <ViewToggle
          view="list"
          onViewChange={mockOnViewChange}
        />
      )

      const cardButton = screen.getByRole('radio', { name: /card view/i })
      const listButton = screen.getByRole('radio', { name: /list view/i })
      
      expect(listButton).toHaveAttribute('aria-checked', 'true')
      expect(cardButton).toHaveAttribute('aria-checked', 'false')
    })

    it('applies custom className when provided', () => {
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
          className="custom-toggle"
        />
      )

      const toggleGroup = screen.getByRole('group')
      expect(toggleGroup).toHaveClass('custom-toggle')
    })
  })

  describe('User Interactions', () => {
    it('calls onViewChange with "list" when list button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      const listButton = screen.getByRole('radio', { name: /list view/i })
      await user.click(listButton)

      expect(mockOnViewChange).toHaveBeenCalledWith('list')
      expect(mockOnViewChange).toHaveBeenCalledTimes(1)
    })

    it('calls onViewChange with "card" when card button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ViewToggle
          view="list"
          onViewChange={mockOnViewChange}
        />
      )

      const cardButton = screen.getByRole('radio', { name: /card view/i })
      await user.click(cardButton)

      expect(mockOnViewChange).toHaveBeenCalledWith('card')
      expect(mockOnViewChange).toHaveBeenCalledTimes(1)
    })

    it('does not call onViewChange when clicking already selected view', async () => {
      const user = userEvent.setup()
      
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      const cardButton = screen.getByRole('radio', { name: /card view/i })
      await user.click(cardButton)

      // Should not call onViewChange when clicking already selected option
      expect(mockOnViewChange).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation with Tab key', async () => {
      const user = userEvent.setup()
      
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      const cardButton = screen.getByRole('radio', { name: /card view/i })
      
      // Tab to the toggle group - focus goes to the active radio button
      await user.tab()
      expect(cardButton).toHaveFocus()
    })

    it('supports activation with Space key', async () => {
      const user = userEvent.setup()
      
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      const listButton = screen.getByRole('radio', { name: /list view/i })
      
      // Focus and activate with Space
      listButton.focus()
      await user.keyboard(' ')

      expect(mockOnViewChange).toHaveBeenCalledWith('list')
    })

    it('supports activation with Enter key', async () => {
      const user = userEvent.setup()
      
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      const listButton = screen.getByRole('radio', { name: /list view/i })
      
      // Focus and activate with Enter
      listButton.focus()
      await user.keyboard('{Enter}')

      expect(mockOnViewChange).toHaveBeenCalledWith('list')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      const toggleGroup = screen.getByRole('group')
      expect(toggleGroup).toHaveAttribute('aria-label', 'Switch between list and card view')

      const listButton = screen.getByRole('radio', { name: /list view/i })
      const cardButton = screen.getByRole('radio', { name: /card view/i })

      expect(listButton).toHaveAttribute('aria-checked')
      expect(cardButton).toHaveAttribute('aria-checked')
    })

    it('has descriptive button labels', () => {
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      expect(screen.getByRole('radio', { name: /list view/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /card view/i })).toBeInTheDocument()
    })

    it('uses semantic toggle group structure', () => {
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      // Should have a group role for the toggle container
      const group = screen.getByRole('group')
      expect(group).toBeInTheDocument()
      
      // Should have radio buttons inside the group (ToggleGroup uses radio role)
      const radios = screen.getAllByRole('radio')
      expect(radios).toHaveLength(2)
    })
  })

  describe('Icon Display', () => {
    it('displays table icon for list view button', () => {
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      const listButton = screen.getByRole('radio', { name: /list view/i })
      // The icon should be present - we can test by checking if the button contains an svg
      const icon = listButton.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('displays grid icon for card view button', () => {
      render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      const cardButton = screen.getByRole('radio', { name: /card view/i })
      // The icon should be present - we can test by checking if the button contains an svg
      const icon = cardButton.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined onViewChange gracefully', () => {
      expect(() => {
        render(
          <ViewToggle
            view="card"
            onViewChange={undefined as any}
          />
        )
      }).not.toThrow()
    })

    it('handles invalid view prop gracefully', () => {
      expect(() => {
        render(
          <ViewToggle
            view={"invalid" as any}
            onViewChange={mockOnViewChange}
          />
        )
      }).not.toThrow()
    })

    it('maintains accessibility when view prop changes', () => {
      const { rerender } = render(
        <ViewToggle
          view="card"
          onViewChange={mockOnViewChange}
        />
      )

      // Check initial state
      const cardButton = screen.getByRole('radio', { name: /card view/i })
      expect(cardButton).toHaveAttribute('aria-checked', 'true')

      // Change view prop
      rerender(
        <ViewToggle
          view="list"
          onViewChange={mockOnViewChange}
        />
      )

      // Check updated state
      const listButton = screen.getByRole('radio', { name: /list view/i })
      expect(listButton).toHaveAttribute('aria-checked', 'true')
      expect(cardButton).toHaveAttribute('aria-checked', 'false')
    })
  })
})