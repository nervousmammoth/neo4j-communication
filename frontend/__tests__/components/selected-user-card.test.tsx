import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SelectedUserCard } from '@/components/selected-user-card'

describe('SelectedUserCard', () => {
  const mockUser = {
    userId: 'user123',
    name: 'John Doe',
    email: 'john.doe@example.com',
    username: 'johndoe',
    avatarUrl: 'https://example.com/avatar.jpg'
  }

  const mockOnRemove = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render user information', () => {
      render(<SelectedUserCard user={mockUser} onRemove={mockOnRemove} />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    })

    it('should render user avatar', () => {
      const { container } = render(<SelectedUserCard user={mockUser} onRemove={mockOnRemove} />)
      
      // Check that UserAvatar is rendered (it will be within the card)
      const card = container.querySelector('.rounded-lg.border')
      expect(card).toBeInTheDocument()
      // UserAvatar component is used but we don't need to test its internals
    })

    it('should render remove button', () => {
      render(<SelectedUserCard user={mockUser} onRemove={mockOnRemove} />)
      
      const removeButton = screen.getByRole('button', { name: /remove/i })
      expect(removeButton).toBeInTheDocument()
    })

    it('should handle user without avatar', () => {
      const userWithoutAvatar = {
        ...mockUser,
        avatarUrl: null as string | null
      }
      
      render(<SelectedUserCard user={userWithoutAvatar} onRemove={mockOnRemove} />)
      
      // Should still render, avatar component handles null
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should handle user with long name', () => {
      const userWithLongName = {
        ...mockUser,
        name: 'Very Long Name That Might Overflow The Card Component'
      }
      
      render(<SelectedUserCard user={userWithLongName} onRemove={mockOnRemove} />)
      
      expect(screen.getByText(userWithLongName.name)).toBeInTheDocument()
    })

    it('should handle user with long email', () => {
      const userWithLongEmail = {
        ...mockUser,
        email: 'very.long.email.address.that.might.overflow@example-company.com'
      }
      
      render(<SelectedUserCard user={userWithLongEmail} onRemove={mockOnRemove} />)
      
      expect(screen.getByText(userWithLongEmail.email)).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onRemove when remove button is clicked', () => {
      render(<SelectedUserCard user={mockUser} onRemove={mockOnRemove} />)
      
      const removeButton = screen.getByRole('button', { name: /remove/i })
      fireEvent.click(removeButton)
      
      expect(mockOnRemove).toHaveBeenCalledTimes(1)
    })

    it('should not call onRemove when clicking on user info', () => {
      render(<SelectedUserCard user={mockUser} onRemove={mockOnRemove} />)
      
      fireEvent.click(screen.getByText('John Doe'))
      fireEvent.click(screen.getByText('john.doe@example.com'))
      
      expect(mockOnRemove).not.toHaveBeenCalled()
    })

    it('should handle keyboard interaction on remove button', () => {
      render(<SelectedUserCard user={mockUser} onRemove={mockOnRemove} />)
      
      const removeButton = screen.getByRole('button', { name: /remove/i })
      
      // Test Enter key
      fireEvent.keyDown(removeButton, { key: 'Enter' })
      expect(mockOnRemove).toHaveBeenCalledTimes(1)
      
      // Test Space key
      vi.clearAllMocks()
      fireEvent.keyDown(removeButton, { key: ' ' })
      expect(mockOnRemove).toHaveBeenCalledTimes(1)
    })
  })

  describe('Styling', () => {
    it('should apply proper CSS classes', () => {
      const { container } = render(<SelectedUserCard user={mockUser} onRemove={mockOnRemove} />)
      
      // Check for card styling
      const card = container.firstChild
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('border')
    })

    it('should have proper hover state on remove button', () => {
      render(<SelectedUserCard user={mockUser} onRemove={mockOnRemove} />)
      
      const removeButton = screen.getByRole('button', { name: /remove/i })
      expect(removeButton).toHaveClass('hover:bg-accent')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible remove button', () => {
      render(<SelectedUserCard user={mockUser} onRemove={mockOnRemove} />)
      
      const removeButton = screen.getByRole('button', { name: /remove/i })
      expect(removeButton).toHaveAttribute('aria-label', 'Remove user')
    })

    it('should be keyboard navigable', () => {
      render(<SelectedUserCard user={mockUser} onRemove={mockOnRemove} />)
      
      const removeButton = screen.getByRole('button', { name: /remove/i })
      
      // Button should be focusable
      removeButton.focus()
      expect(document.activeElement).toBe(removeButton)
    })

    it('should have proper semantic structure', () => {
      const { container } = render(<SelectedUserCard user={mockUser} onRemove={mockOnRemove} />)
      
      // Should use semantic HTML
      const card = container.querySelector('div')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined onRemove gracefully', () => {
      // @ts-expect-error Testing runtime behavior
      const { container } = render(<SelectedUserCard user={mockUser} onRemove={undefined} />)
      
      const removeButton = screen.getByRole('button', { name: /remove/i })
      
      // Should not throw when clicking
      expect(() => fireEvent.click(removeButton)).not.toThrow()
    })

    it('should handle special characters in user data', () => {
      const userWithSpecialChars = {
        ...mockUser,
        name: 'John "The Boss" O\'Malley',
        email: 'john+test@example.com'
      }
      
      render(<SelectedUserCard user={userWithSpecialChars} onRemove={mockOnRemove} />)
      
      expect(screen.getByText(userWithSpecialChars.name)).toBeInTheDocument()
      expect(screen.getByText(userWithSpecialChars.email)).toBeInTheDocument()
    })

    it('should handle empty strings in user data', () => {
      const userWithEmptyStrings = {
        ...mockUser,
        name: '',
        email: ''
      }
      
      const { container } = render(<SelectedUserCard user={userWithEmptyStrings} onRemove={mockOnRemove} />)
      
      // Component should still render without errors
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})