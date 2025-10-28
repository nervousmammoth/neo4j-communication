import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { UserAvatar } from '@/components/user-avatar'

// Mock the UI components
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt, onError }: any) => (
    <img 
      data-testid="avatar-image" 
      src={src} 
      alt={alt} 
      onError={onError}
    />
  ),
  AvatarFallback: ({ children, className }: any) => (
    <div data-testid="avatar-fallback" className={className}>
      {children}
    </div>
  ),
}))

describe('UserAvatar', () => {
  describe('Basic Rendering', () => {
    it('renders with user name and avatar URL', () => {
      const user = {
        name: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg'
      }

      render(<UserAvatar user={user} />)

      expect(screen.getByTestId('avatar')).toBeInTheDocument()
      expect(screen.getByTestId('avatar-image')).toHaveAttribute('src', user.avatarUrl)
      expect(screen.getByTestId('avatar-image')).toHaveAttribute('alt', 'John Doe avatar')
    })

    it('renders fallback when no avatar URL provided', () => {
      const user = {
        name: 'Jane Smith',
        avatarUrl: null
      }

      render(<UserAvatar user={user} />)

      expect(screen.getByTestId('avatar')).toBeInTheDocument()
      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument()
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JS')
    })

    it('renders fallback when avatar URL is undefined', () => {
      const user = {
        name: 'Bob Johnson'
      }

      render(<UserAvatar user={user} />)

      expect(screen.getByTestId('avatar')).toBeInTheDocument()
      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument()
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('BJ')
    })
  })

  describe('Initials Generation', () => {
    it('generates correct initials for single name', () => {
      const user = { name: 'Madonna' }
      render(<UserAvatar user={user} />)
      
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('M')
    })

    it('generates correct initials for two names', () => {
      const user = { name: 'John Doe' }
      render(<UserAvatar user={user} />)
      
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD')
    })

    it('generates correct initials for three names', () => {
      const user = { name: 'Mary Jane Watson' }
      render(<UserAvatar user={user} />)
      
      // Should take first two initials
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('MJ')
    })

    it('generates correct initials for multiple names', () => {
      const user = { name: 'Jean-Baptiste Emanuel Zorg' }
      render(<UserAvatar user={user} />)
      
      // Should take first two initials
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JE')
    })

    it('handles empty name gracefully', () => {
      const user = { name: '' }
      render(<UserAvatar user={user} />)
      
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('?')
    })

    it('handles whitespace-only name', () => {
      const user = { name: '   ' }
      render(<UserAvatar user={user} />)
      
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('?')
    })

    it('handles names with extra whitespace', () => {
      const user = { name: '  John   Doe  ' }
      render(<UserAvatar user={user} />)
      
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD')
    })

    it('converts initials to uppercase', () => {
      const user = { name: 'john doe' }
      render(<UserAvatar user={user} />)
      
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD')
    })
  })

  describe('Size Variants', () => {
    it('applies small size classes', () => {
      const user = { name: 'Test User' }
      render(<UserAvatar user={user} size="sm" />)
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('h-8', 'w-8', 'text-xs')
    })

    it('applies medium size classes (default)', () => {
      const user = { name: 'Test User' }
      render(<UserAvatar user={user} size="md" />)
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('h-10', 'w-10', 'text-sm')
    })

    it('applies large size classes', () => {
      const user = { name: 'Test User' }
      render(<UserAvatar user={user} size="lg" />)
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('h-16', 'w-16', 'text-lg')
    })

    it('defaults to medium size when no size specified', () => {
      const user = { name: 'Test User' }
      render(<UserAvatar user={user} />)
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('h-10', 'w-10', 'text-sm')
    })
  })

  describe('Color Consistency', () => {
    it('generates consistent colors for the same name', () => {
      const user = { name: 'John Doe' }
      
      const { unmount } = render(<UserAvatar user={user} />)
      const firstRender = screen.getByTestId('avatar-fallback').className
      unmount()

      render(<UserAvatar user={user} />)
      const secondRender = screen.getByTestId('avatar-fallback').className
      
      expect(firstRender).toBe(secondRender)
    })

    it('generates different colors for different names', () => {
      const user1 = { name: 'John Doe' }
      const user2 = { name: 'Jane Smith' }
      
      const { unmount } = render(<UserAvatar user={user1} />)
      const firstColor = screen.getByTestId('avatar-fallback').className
      unmount()

      render(<UserAvatar user={user2} />)
      const secondColor = screen.getByTestId('avatar-fallback').className
      
      // Colors should be different (though this might occasionally fail due to hash collisions)
      expect(firstColor).not.toBe(secondColor)
    })

    it('applies consistent fallback color based on name hash', () => {
      const user = { name: 'Test User' }
      render(<UserAvatar user={user} />)
      
      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveClass('text-white', 'font-medium')
      
      // Should have one of the predefined background colors
      const classList = fallback.className
      const hasColorClass = [
        'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
        'bg-orange-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-rose-500'
      ].some(colorClass => classList.includes(colorClass))
      
      expect(hasColorClass).toBe(true)
    })

    it('handles empty name with default color', () => {
      const user = { name: '' }
      render(<UserAvatar user={user} />)
      
      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveClass('bg-gray-500')
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const user = { name: 'Test User' }
      render(<UserAvatar user={user} className="custom-class border-2" />)
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('custom-class', 'border-2')
    })

    it('combines custom className with size classes', () => {
      const user = { name: 'Test User' }
      render(<UserAvatar user={user} size="lg" className="ring-2" />)
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('h-16', 'w-16', 'text-lg', 'ring-2')
    })
  })

  describe('Image Error Handling', () => {
    it('provides proper image attributes for error handling', () => {
      const user = {
        name: 'Test User',
        avatarUrl: 'https://example.com/broken-image.jpg'
      }
      
      render(<UserAvatar user={user} />)
      
      const image = screen.getByTestId('avatar-image')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', user.avatarUrl)
      expect(image).toHaveAttribute('alt', 'Test User avatar')
      
      // The component provides an onError handler for graceful degradation
      // This test verifies the image element is properly rendered with attributes
      // The actual error handling is tested through integration tests
    })

    it('handles image load errors by hiding broken images (lines 81-82)', () => {
      const user = {
        name: 'Test User',
        avatarUrl: 'https://example.com/broken-image.jpg'
      }
      
      render(<UserAvatar user={user} />)
      
      const image = screen.getByTestId('avatar-image')
      expect(image).toBeInTheDocument()
      
      // Simulate image load error to trigger the onError handler
      fireEvent.error(image)
      
      // The onError handler should set display: 'none' on the image
      expect(image.style.display).toBe('none')
    })
  })

  describe('Performance and Memoization', () => {
    it('memoizes initials calculation', () => {
      const user = { name: 'John Doe' }
      
      // Mock React.useMemo to verify it's being called
      const mockUseMemo = vi.spyOn(React, 'useMemo')
      
      render(<UserAvatar user={user} />)
      
      // useMemo should be called for initials, size classes, and fallback color
      expect(mockUseMemo).toHaveBeenCalledTimes(3)
      
      mockUseMemo.mockRestore()
    })

    it('maintains consistent rendering with same props', () => {
      const user = { name: 'John Doe', avatarUrl: 'https://example.com/avatar.jpg' }
      
      const { rerender } = render(<UserAvatar user={user} size="md" />)
      const firstRender = screen.getByTestId('avatar').outerHTML
      
      rerender(<UserAvatar user={user} size="md" />)
      const secondRender = screen.getByTestId('avatar').outerHTML
      
      expect(firstRender).toBe(secondRender)
    })
  })

  describe('Accessibility', () => {
    it('provides descriptive alt text for images', () => {
      const user = {
        name: 'Alice Johnson',
        avatarUrl: 'https://example.com/alice.jpg'
      }
      
      render(<UserAvatar user={user} />)
      
      const image = screen.getByTestId('avatar-image')
      expect(image).toHaveAttribute('alt', 'Alice Johnson avatar')
    })

    it('provides meaningful fallback content', () => {
      const user = { name: 'Bob Smith' }
      render(<UserAvatar user={user} />)
      
      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('BS')
      expect(fallback).toHaveAttribute('class', expect.stringContaining('font-medium'))
    })
  })
})