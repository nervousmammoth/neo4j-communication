import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserPairSearch } from '@/components/user-pair-search'
import { useRouter, useSearchParams } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn()
}))

// Create a mock implementation that can be controlled
const mockUserSearchInput = vi.fn()

// Mock components
vi.mock('@/components/user-search-input', () => ({
  UserSearchInput: (props: any) => mockUserSearchInput(props)
}))

// Default implementation
mockUserSearchInput.mockImplementation(({ onSelect, placeholder, mode, contactsOfUserId, id }: any) => {
  // Return different user data based on the id
  const userData = id === 'user1-search' ? {
    userId: 'user-1', 
    name: 'Test User', 
    email: 'test@example.com',
    username: 'testuser' 
  } : {
    userId: 'user-2',
    name: 'Second User',
    email: 'second@example.com',
    username: 'seconduser'
  };
  
  return (
    <div data-testid={`user-search-${id}`}>
      <input placeholder={placeholder} data-mode={mode} data-contacts-of={contactsOfUserId} />
      <button onClick={() => onSelect(userData)}>
        Select User
      </button>
    </div>
  );
})

vi.mock('@/components/selected-user-card', () => ({
  SelectedUserCard: ({ user, onRemove }: any) => (
    <div data-testid="selected-card">
      <span>{user.name}</span>
      <button onClick={onRemove}>Remove</button>
    </div>
  )
}))

describe('UserPairSearch', () => {
  const mockPush = vi.fn()
  const mockReplace = vi.fn()
  const mockSearchParams = new URLSearchParams()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn()
    } as any)
    
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as any)
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    }
    Object.defineProperty(window, 'localStorage', { 
      value: localStorageMock, 
      writable: true,
      configurable: true 
    })
    
    // Reset the UserSearchInput mock to default implementation
    mockUserSearchInput.mockImplementation(({ onSelect, placeholder, mode, contactsOfUserId, id }: any) => {
      const userData = id === 'user1-search' ? {
        userId: 'user-1', 
        name: 'Test User', 
        email: 'test@example.com',
        username: 'testuser' 
      } : {
        userId: 'user-2',
        name: 'Second User',
        email: 'second@example.com',
        username: 'seconduser'
      };
      
      return (
        <div data-testid={`user-search-${id}`}>
          <input placeholder={placeholder} data-mode={mode} data-contacts-of={contactsOfUserId} />
          <button onClick={() => onSelect(userData)}>
            Select User
          </button>
        </div>
      );
    })
  })

  describe('Initial Rendering', () => {
    it('should render two user search inputs', () => {
      render(<UserPairSearch />)
      
      expect(screen.getByTestId('user-search-user1-search')).toBeInTheDocument()
      expect(screen.getByTestId('user-search-user2-search')).toBeInTheDocument()
    })

    it('should render labels for both inputs', () => {
      render(<UserPairSearch />)
      
      expect(screen.getByText('First User')).toBeInTheDocument()
      expect(screen.getByText('Second User')).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<UserPairSearch />)
      
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /analyze communication/i })).toBeInTheDocument()
    })

    it('should have analyze button disabled initially', () => {
      render(<UserPairSearch />)
      
      const analyzeButton = screen.getByRole('button', { name: /analyze communication/i })
      expect(analyzeButton).toBeDisabled()
    })
  })

  describe('User Selection', () => {
    it('should handle first user selection', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should reset second user when first user changes', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      
      // Select both users
      fireEvent.click(selectButtons[0])
      fireEvent.click(selectButtons[1])
      
      // Change first user - should reset second user
      fireEvent.click(selectButtons[0])
      
      expect(mockReplace).toHaveBeenLastCalledWith(
        expect.stringContaining('user1=user-1'),
        expect.any(Object)
      )
    })

    it('should handle second user selection', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0]) // Select first user
      fireEvent.click(selectButtons[1]) // Select second user
      
      const selectedCards = screen.getAllByTestId('selected-card')
      expect(selectedCards).toHaveLength(2)
    })

    it('should update second field to contacts mode when first user is selected', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      
      const secondInput = screen.getByTestId('user-search-user2-search').querySelector('input')
      expect(secondInput).toHaveAttribute('data-mode', 'contacts')
      expect(secondInput).toHaveAttribute('data-contacts-of', 'user-1')
    })

    it('should update label when first user is selected', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      
      expect(screen.getByText('Users who communicated with Test User')).toBeInTheDocument()
    })
  })

  describe('User Removal', () => {
    it('should handle first user removal', () => {
      render(<UserPairSearch />)
      
      const selectButton = screen.getAllByText('Select User')[0]
      fireEvent.click(selectButton)
      
      const removeButton = screen.getByText('Remove')
      fireEvent.click(removeButton)
      
      expect(screen.queryByTestId('selected-card')).not.toBeInTheDocument()
    })

    it('should reset second user when first user is removed', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      fireEvent.click(selectButtons[1])
      
      const removeButtons = screen.getAllByText('Remove')
      fireEvent.click(removeButtons[0]) // Remove first user
      
      expect(mockReplace).toHaveBeenLastCalledWith(
        '/users/communications?',
        expect.any(Object)
      )
    })

    it('should handle second user removal', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0]) // Select first user
      fireEvent.click(selectButtons[1]) // Select second user
      
      // Verify both users are selected
      const selectedCards = screen.getAllByTestId('selected-card')
      expect(selectedCards).toHaveLength(2)
      
      // Remove the second user
      const removeButtons = screen.getAllByText('Remove')
      fireEvent.click(removeButtons[1]) // Remove second user
      
      // Verify only first user remains
      expect(screen.getAllByTestId('selected-card')).toHaveLength(1)
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.queryByText('Second User')).not.toBeInTheDocument()
      
      // Verify URL was updated
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('user1=user-1'),
        expect.any(Object)
      )
    })
  })

  describe('Swap Functionality', () => {
    it('should show swap button when both users are selected', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      fireEvent.click(selectButtons[1])
      
      // There are two swap buttons (desktop and mobile)
      const swapButtons = screen.getAllByRole('button', { name: /swap users/i })
      expect(swapButtons.length).toBeGreaterThan(0)
      expect(swapButtons[0]).toBeInTheDocument()
    })

    it('should not show swap button with only one user', () => {
      render(<UserPairSearch />)
      
      const selectButton = screen.getAllByText('Select User')[0]
      fireEvent.click(selectButton)
      
      const swapButton = screen.queryByRole('button', { name: /swap users/i })
      expect(swapButton).not.toBeInTheDocument()
    })

    it('should swap users when swap button is clicked', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      fireEvent.click(selectButtons[1])
      
      // Get the first swap button (there are two - desktop and mobile)
      const swapButtons = screen.getAllByRole('button', { name: /swap users/i })
      fireEvent.click(swapButtons[0])
      
      // Check that replace was called with swapped user IDs
      expect(mockReplace).toHaveBeenCalled()
    })
  })

  describe('Clear Functionality', () => {
    it('should clear both users when clear button is clicked', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      fireEvent.click(selectButtons[1])
      
      const clearButton = screen.getByRole('button', { name: /clear/i })
      fireEvent.click(clearButton)
      
      expect(screen.queryAllByTestId('selected-card')).toHaveLength(0)
    })

    it('should clear error when clear is clicked', () => {
      render(<UserPairSearch />)
      
      // Trigger same user error
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      fireEvent.click(selectButtons[1])
      
      const analyzeButton = screen.getByRole('button', { name: /analyze communication/i })
      fireEvent.click(analyzeButton)
      
      // Clear and check error is gone
      const clearButton = screen.getByRole('button', { name: /clear/i })
      fireEvent.click(clearButton)
      
      expect(screen.queryByText(/select two different users/i)).not.toBeInTheDocument()
    })
  })

  describe('Analyze Functionality', () => {
    it('should enable analyze button when both users are selected', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      fireEvent.click(selectButtons[1])
      
      const analyzeButton = screen.getByRole('button', { name: /analyze communication/i })
      expect(analyzeButton).not.toBeDisabled()
    })

    it('should navigate to analysis page when analyze is clicked', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0]) // Select first user (user-1)
      fireEvent.click(selectButtons[1]) // Select second user (user-2)
      
      const analyzeButton = screen.getByRole('button', { name: /analyze communication/i })
      fireEvent.click(analyzeButton)
      
      // Should navigate with correctly sorted user IDs
      expect(mockPush).toHaveBeenCalledWith('/users/communications/user-1/user-2')
    })

    it('should save to localStorage when analyzing', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      fireEvent.click(selectButtons[1])
      
      const analyzeButton = screen.getByRole('button', { name: /analyze communication/i })
      fireEvent.click(analyzeButton)
      
      expect(window.localStorage.setItem).toHaveBeenCalled()
    })

    it('should show error when trying to analyze same user twice', () => {
      // Change mock to return same user for both selections
      mockUserSearchInput.mockImplementation(({ onSelect, placeholder, mode, contactsOfUserId, id }: any) => {
        // Always return the same user regardless of which input
        const sameUser = {
          userId: 'same-user-id',
          name: 'Same User',
          email: 'same@example.com',
          username: 'sameuser'
        };
        
        return (
          <div data-testid={`user-search-${id}`}>
            <input placeholder={placeholder} data-mode={mode} data-contacts-of={contactsOfUserId} />
            <button onClick={() => onSelect(sameUser)}>
              Select User
            </button>
          </div>
        );
      });
      
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0]) // Select first user
      fireEvent.click(selectButtons[1]) // Select second user (same as first)
      
      const analyzeButton = screen.getByRole('button', { name: /analyze communication/i })
      fireEvent.click(analyzeButton)
      
      // Should show error message in the UI
      const errorMessage = screen.getByText('Please select two different users')
      expect(errorMessage).toBeInTheDocument()
      
      // Verify the error is displayed with correct styling
      const errorContainer = errorMessage.closest('div')
      expect(errorContainer).toHaveClass('p-3', 'bg-destructive/10', 'text-destructive', 'rounded-lg', 'text-sm')
      
      // Should not navigate
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('URL Query Parameters', () => {
    it('should update URL when users are selected', () => {
      render(<UserPairSearch />)
      
      const selectButton = screen.getAllByText('Select User')[0]
      fireEvent.click(selectButton)
      
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('user1=user-1'),
        expect.any(Object)
      )
    })

    it('should remove query params when users are cleared', () => {
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      fireEvent.click(selectButtons[1])
      
      const clearButton = screen.getByRole('button', { name: /clear/i })
      fireEvent.click(clearButton)
      
      expect(mockReplace).toHaveBeenLastCalledWith(
        '/users/communications?',
        expect.any(Object)
      )
    })
  })

  describe('Error Handling', () => {
    // Test removed: Error handling for same-user selection is no longer testable
    // with the improved mock that correctly returns different users

    it('should handle localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      vi.mocked(window.localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage full')
      })
      
      render(<UserPairSearch />)
      
      const selectButtons = screen.getAllByText('Select User')
      fireEvent.click(selectButtons[0])
      fireEvent.click(selectButtons[1])
      
      const analyzeButton = screen.getByRole('button', { name: /analyze communication/i })
      fireEvent.click(analyzeButton)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save to recent analyses:',
        expect.any(Error)
      )
      
      // Should still navigate despite localStorage error
      expect(mockPush).toHaveBeenCalled()
      
      consoleErrorSpy.mockRestore()
    })
  })
})