import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentAnalyses } from '@/components/recent-analyses'
import { formatDistanceToNow } from 'date-fns'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn()
}))

// Mock CommunicationsEmptyState
vi.mock('@/components/communications-empty-state', () => ({
  CommunicationsEmptyState: () => (
    <div data-testid="communications-empty-state">No Recent Analyses</div>
  )
}))

// Mock lucide-react icons for UserAvatar
vi.mock('lucide-react', () => ({
  ArrowRight: () => <span data-testid="arrow-right-icon" />
}))

describe('RecentAnalyses', () => {
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    })
    vi.mocked(formatDistanceToNow).mockReturnValue('2 hours ago')
  })

  describe('Rendering', () => {
    it('should render empty state when no recent analyses exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      render(<RecentAnalyses />)

      expect(screen.getByTestId('communications-empty-state')).toBeInTheDocument()
    })

    it('should render recent analyses from localStorage', () => {
      const recentData = [
        {
          user1: {
            userId: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            username: 'johndoe',
            avatarUrl: null
          },
          user2: {
            userId: 'user2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            username: 'janesmith',
            avatarUrl: null
          },
          timestamp: '2024-01-15T10:00:00.000Z'
        }
      ]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(recentData))
      
      render(<RecentAnalyses />)
      
      expect(screen.getByText('Recent Analyses')).toBeInTheDocument()
      expect(screen.getByText('John Doe ↔ Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('2 hours ago')).toBeInTheDocument()
    })

    it('should render multiple recent analyses', () => {
      const recentData = [
        {
          user1: { userId: 'user1', name: 'User 1', email: 'u1@ex.com', username: 'u1' },
          user2: { userId: 'user2', name: 'User 2', email: 'u2@ex.com', username: 'u2' },
          timestamp: '2024-01-15T10:00:00.000Z'
        },
        {
          user1: { userId: 'user3', name: 'User 3', email: 'u3@ex.com', username: 'u3' },
          user2: { userId: 'user4', name: 'User 4', email: 'u4@ex.com', username: 'u4' },
          timestamp: '2024-01-15T09:00:00.000Z'
        }
      ]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(recentData))
      
      render(<RecentAnalyses />)
      
      expect(screen.getByText('User 1 ↔ User 2')).toBeInTheDocument()
      expect(screen.getByText('User 3 ↔ User 4')).toBeInTheDocument()
    })

    it('should normalize user IDs in links', () => {
      const recentData = [
        {
          user1: { userId: 'userB', name: 'User B', email: 'b@ex.com', username: 'b' },
          user2: { userId: 'userA', name: 'User A', email: 'a@ex.com', username: 'a' },
          timestamp: '2024-01-15T10:00:00.000Z'
        }
      ]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(recentData))
      
      render(<RecentAnalyses />)
      
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/users/communications/userA/userB')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid JSON in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')

      render(<RecentAnalyses />)

      expect(screen.getByTestId('communications-empty-state')).toBeInTheDocument()
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      render(<RecentAnalyses />)

      expect(screen.getByTestId('communications-empty-state')).toBeInTheDocument()
    })

    it('should handle missing user properties', () => {
      const recentData = [
        {
          user1: { userId: 'user1', name: null, email: null },
          user2: { userId: 'user2', name: null, email: null },
          timestamp: '2024-01-15T10:00:00.000Z'
        }
      ]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(recentData))
      
      render(<RecentAnalyses />)
      
      // Should still render with null/undefined handled
      expect(screen.getByText('Recent Analyses')).toBeInTheDocument()
    })
  })

  describe('Time Formatting', () => {
    it('should format timestamps using formatDistanceToNow', () => {
      const recentData = [
        {
          user1: { userId: 'user1', name: 'User 1', email: 'u1@ex.com', username: 'u1' },
          user2: { userId: 'user2', name: 'User 2', email: 'u2@ex.com', username: 'u2' },
          timestamp: '2024-01-15T10:00:00.000Z'
        }
      ]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(recentData))
      vi.mocked(formatDistanceToNow).mockReturnValue('3 days ago')
      
      render(<RecentAnalyses />)
      
      expect(formatDistanceToNow).toHaveBeenCalledWith(
        new Date('2024-01-15T10:00:00.000Z'),
        { addSuffix: true }
      )
      expect(screen.getByText('3 days ago')).toBeInTheDocument()
    })

    it('should handle invalid timestamps', () => {
      const recentData = [
        {
          user1: { userId: 'user1', name: 'User 1', email: 'u1@ex.com', username: 'u1' },
          user2: { userId: 'user2', name: 'User 2', email: 'u2@ex.com', username: 'u2' },
          timestamp: 'invalid-date'
        }
      ]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(recentData))
      vi.mocked(formatDistanceToNow).mockImplementation(() => {
        throw new Error('Invalid date')
      })
      
      // Should not crash
      const { container } = render(<RecentAnalyses />)
      expect(container.querySelector('a')).toBeInTheDocument()
    })
  })

  describe('Client-side rendering', () => {
    it('should only access localStorage after mount', () => {
      render(<RecentAnalyses />)
      
      // localStorage should be accessed after mount
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('recentAnalyses')
    })

    it('should handle SSR by not accessing localStorage on server', () => {
      // Simulate server-side by removing localStorage
      // @ts-expect-error Testing SSR behavior
      delete window.localStorage
      
      // Should not crash
      const { container } = render(<RecentAnalyses />)
      expect(container).toBeDefined()
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true
      })
    })
  })
})