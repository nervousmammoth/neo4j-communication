import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserSearchInput } from '@/components/user-search-input'
import { searchUsers, getUserContacts } from '@/lib/api-client'

vi.mock('@/lib/api-client', () => ({
  searchUsers: vi.fn(),
  getUserContacts: vi.fn()
}))

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: any) => value
}))

describe('UserSearchInput', () => {
  const mockOnSelect = vi.fn()
  const mockOnError = vi.fn()
  
  const mockUsers = [
    {
      userId: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
      avatarUrl: 'https://example.com/avatar1.jpg',
      status: 'active',
      role: 'member',
      bio: 'Test bio',
      department: 'Engineering',
      location: 'NYC',
      lastSeen: '2025-01-09T10:00:00Z'
    },
    {
      userId: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      username: 'janesmith',
      avatarUrl: null,
      status: 'active',
      role: 'admin',
      bio: null,
      department: 'Sales',
      location: 'LA',
      lastSeen: '2025-01-09T09:00:00Z'
    }
  ]

  const mockContacts = [
    {
      ...mockUsers[0],
      communicationStats: {
        sharedConversationCount: 5,
        totalMessageCount: 150,
        lastInteraction: '2025-01-08T15:30:00Z',
        firstInteraction: '2024-06-01T09:00:00Z'
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('All Users Mode', () => {
    it('should render with default placeholder', () => {
      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      expect(input).toBeInTheDocument()
    })

    it('should render with custom placeholder', () => {
      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          placeholder="Custom placeholder"
        />
      )
      
      const input = screen.getByPlaceholderText('Custom placeholder')
      expect(input).toBeInTheDocument()
    })

    it('should search all users when typing', async () => {
      vi.mocked(searchUsers).mockResolvedValue({
        results: mockUsers,
        total: 2
      })

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          onError={mockOnError}
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      fireEvent.change(input, { target: { value: 'john' } })
      
      await waitFor(() => {
        expect(searchUsers).toHaveBeenCalledWith('john', {
          signal: expect.any(AbortSignal),
          excludeUserId: undefined
        })
      })
    })

    it('should exclude specified user from search', async () => {
      vi.mocked(searchUsers).mockResolvedValue({
        results: [mockUsers[1]],
        total: 1
      })

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          excludeUserId="user-1"
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      fireEvent.change(input, { target: { value: 'test' } })
      
      await waitFor(() => {
        expect(searchUsers).toHaveBeenCalledWith('test', {
          signal: expect.any(AbortSignal),
          excludeUserId: 'user-1'
        })
      })
    })

    it('should handle selection', async () => {
      vi.mocked(searchUsers).mockResolvedValue({
        results: mockUsers,
        total: 2
      })

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      fireEvent.change(input, { target: { value: 'john' } })
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('John Doe'))
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockUsers[0])
    })

    it('should show empty state when no results', async () => {
      vi.mocked(searchUsers).mockResolvedValue({
        results: [],
        total: 0
      })

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      fireEvent.change(input, { target: { value: 'nonexistent' } })
      
      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument()
      })
    })

    it('should show searching state immediately when typing', async () => {
      // Mock a delayed response to observe the searching state
      vi.mocked(searchUsers).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          results: mockUsers,
          total: 2
        }), 100))
      )

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      fireEvent.change(input, { target: { value: 'test' } })
      
      // Should show searching state immediately
      expect(screen.getByText('Searching...')).toBeInTheDocument()
      
      // Wait for results to appear
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    it('should handle search errors', async () => {
      vi.mocked(searchUsers).mockRejectedValue(new Error('Network error'))

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          onError={mockOnError}
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      fireEvent.change(input, { target: { value: 'test' } })
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to search users. Please try again.')
      })
    })
  })

  describe('Contacts Mode', () => {
    it('should show contacts-specific placeholder', () => {
      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          mode="contacts"
          contactsOfUserId="user-1"
        />
      )
      
      const input = screen.getByPlaceholderText('Search users who communicated with the selected user...')
      expect(input).toBeInTheDocument()
    })

    it('should fetch all contacts initially without query', async () => {
      vi.mocked(getUserContacts).mockResolvedValue({
        results: mockContacts,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      })

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          mode="contacts"
          contactsOfUserId="user-1"
        />
      )
      
      await waitFor(() => {
        expect(getUserContacts).toHaveBeenCalledWith('user-1', {
          query: '',
          signal: expect.any(AbortSignal),
          page: 1,
          limit: 1000
        })
      })
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should search within contacts when typing', async () => {
      vi.mocked(getUserContacts).mockResolvedValue({
        results: mockContacts,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      })

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          mode="contacts"
          contactsOfUserId="user-1"
        />
      )
      
      const input = screen.getByPlaceholderText('Search users who communicated with the selected user...')
      fireEvent.change(input, { target: { value: 'john' } })
      
      await waitFor(() => {
        expect(getUserContacts).toHaveBeenLastCalledWith('user-1', {
          query: 'john',
          signal: expect.any(AbortSignal),
          page: 1,
          limit: 1000
        })
      })
    })

    it('should show no contacts message when user has no contacts', async () => {
      vi.mocked(getUserContacts).mockResolvedValue({
        results: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      })

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          mode="contacts"
          contactsOfUserId="user-1"
        />
      )
      
      await waitFor(() => {
        expect(screen.getByText('This user has not communicated with anyone yet')).toBeInTheDocument()
      })
    })

    it('should set hasNoContacts flag when fetching contacts returns zero results', async () => {
      // First return no contacts
      vi.mocked(getUserContacts).mockResolvedValueOnce({
        results: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0
      })

      const { rerender } = render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          mode="contacts"
          contactsOfUserId="user-1"
        />
      )
      
      // Wait for the no contacts message to appear
      await waitFor(() => {
        expect(screen.getByText('This user has not communicated with anyone yet')).toBeInTheDocument()
      })
      
      // Now mock returning contacts and search
      vi.mocked(getUserContacts).mockResolvedValueOnce({
        results: mockContacts,
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1
      })
      
      // Type to search - should still work even after hasNoContacts was set
      const input = screen.getByPlaceholderText('Search users who communicated with the selected user...')
      fireEvent.change(input, { target: { value: 'search' } })
      
      // The no contacts message should disappear when searching
      await waitFor(() => {
        expect(screen.queryByText('This user has not communicated with anyone yet')).not.toBeInTheDocument()
      })
    })

    it('should handle contact selection', async () => {
      vi.mocked(getUserContacts).mockResolvedValue({
        results: mockContacts,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      })

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          mode="contacts"
          contactsOfUserId="user-1"
        />
      )
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('John Doe'))
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockContacts[0])
    })
  })

  describe('Loading States', () => {
    it('should show searching message while loading', async () => {
      vi.mocked(searchUsers).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ results: [], total: 0 }), 100))
      )

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      fireEvent.change(input, { target: { value: 'test' } })
      
      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument()
      })
    })
  })

  describe('Abort Controller', () => {
    it('should abort previous requests when typing', async () => {
      const abortedSignals: AbortSignal[] = []
      
      vi.mocked(searchUsers).mockImplementation((_query, options) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            abortedSignals.push(options.signal)
          })
        }
        return Promise.resolve({ results: [], total: 0 })
      })

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      
      fireEvent.change(input, { target: { value: 'a' } })
      fireEvent.change(input, { target: { value: 'ab' } })
      fireEvent.change(input, { target: { value: 'abc' } })
      
      await waitFor(() => {
        expect(abortedSignals.length).toBeGreaterThan(0)
      })
    })

    it('should handle AbortError gracefully', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      vi.mocked(searchUsers).mockRejectedValue(abortError)

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          onError={mockOnError}
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      fireEvent.change(input, { target: { value: 'test' } })
      
      await waitFor(() => {
        expect(searchUsers).toHaveBeenCalled()
      })
      
      // Should only call onError with null to clear, not with an error message
      expect(mockOnError).toHaveBeenCalledWith(null)
      expect(mockOnError).not.toHaveBeenCalledWith(expect.stringContaining('Failed'))
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <UserSearchInput
          id="test-search"
          onSelect={mockOnSelect}
          value={null}
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      // The cmdk library generates its own ids, so we just verify the input has an id
      expect(input).toHaveAttribute('id')
      // Check other ARIA attributes
      expect(input).toHaveAttribute('role', 'combobox')
      expect(input).toHaveAttribute('aria-autocomplete', 'list')
    })

    it('should support auto focus', () => {
      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
          autoFocus
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...')
      expect(document.activeElement).toBe(input)
    })
  })

  describe('Value Display', () => {
    it('should clear input after selection', async () => {
      vi.mocked(searchUsers).mockResolvedValue({
        results: mockUsers,
        total: 2
      })

      render(
        <UserSearchInput
          onSelect={mockOnSelect}
          value={null}
        />
      )
      
      const input = screen.getByPlaceholderText('Search users by name, email, or username...') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'john' } })
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('John Doe'))
      
      expect(input.value).toBe('')
    })
  })
})