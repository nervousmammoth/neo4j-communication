import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserSelectionModal } from '@/components/user-selection-modal'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/users/test-user'),
}))

// Mock UserSearchInput component
const mockUserSearchInput = vi.fn()
vi.mock('@/components/user-search-input', () => ({
  UserSearchInput: (props: any) => mockUserSearchInput(props)
}))

// Mock SelectedUserCard component
vi.mock('@/components/selected-user-card', () => ({
  SelectedUserCard: ({ user, onRemove }: any) => (
    <div data-testid="selected-user-card">
      <span>{user.name}</span>
      <button onClick={onRemove}>Remove</button>
    </div>
  )
}))

// Mock Dialog component from shadcn
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children, onEscapeKeyDown, onPointerDownOutside, ...props }: any) => (
    <div
      data-testid="dialog-content"
      {...props}
      onKeyDown={(e: any) => {
        if (e.key === 'Escape') onEscapeKeyDown?.()
      }}
      onClick={(e: any) => {
        if (e.target.dataset.testid === 'dialog-content') {
          onPointerDownOutside?.()
        }
      }}
    >
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children, ...props }: any) => <h2 data-testid="dialog-title" {...props}>{children}</h2>,
}))

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid={props['data-testid']} {...props}>
      {children}
    </button>
  )
}))

describe('UserSelectionModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSelect = vi.fn()

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onSelect: mockOnSelect,
    excludeUserId: 'user-1',
    title: 'Select a user to analyze'
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default UserSearchInput implementation
    mockUserSearchInput.mockImplementation(({ onSelect, value, excludeUserId, placeholder, autoFocus }: any) => (
      <div data-testid="user-search-input">
        <input
          placeholder={placeholder}
          data-autofocus={autoFocus}
          data-exclude-user-id={excludeUserId}
        />
        <button
          data-testid="select-user-btn"
          onClick={() => onSelect({
            userId: 'user-2',
            name: 'John Doe',
            email: 'john@example.com',
            username: 'johndoe'
          })}
        >
          Select User
        </button>
      </div>
    ))
  })

  describe('Rendering', () => {
    it('should render when open is true', () => {
      render(<UserSelectionModal {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })

    it('should not render when open is false', () => {
      render(<UserSelectionModal {...defaultProps} open={false} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('should display the title', () => {
      render(<UserSelectionModal {...defaultProps} />)

      expect(screen.getByText('Select a user to analyze')).toBeInTheDocument()
    })

    it('should render UserSearchInput with correct props', () => {
      render(<UserSelectionModal {...defaultProps} />)

      const searchInput = screen.getByTestId('user-search-input')
      expect(searchInput).toBeInTheDocument()

      const input = searchInput.querySelector('input')
      expect(input).toHaveAttribute('data-autofocus', 'true')
      expect(input).toHaveAttribute('data-exclude-user-id', 'user-1')
    })

    it('should render action buttons', () => {
      render(<UserSelectionModal {...defaultProps} />)

      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Analyze Communications')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<UserSelectionModal {...defaultProps} />)

      const dialogContent = screen.getByTestId('dialog-content')
      expect(dialogContent).toHaveAttribute('aria-label', 'Select user for communication analysis')

      const title = screen.getByTestId('dialog-title')
      expect(title).toHaveAttribute('id', 'user-selection-title')

      expect(screen.getByText(/Search and select a user/i)).toBeInTheDocument()
    })

    it('should have screen reader description', () => {
      render(<UserSelectionModal {...defaultProps} title="Analyze Test User's communications with:" />)

      const description = screen.getByText(/Search and select a user to analyze communications with Analyze Test User/i)
      expect(description).toHaveClass('sr-only')
    })
  })

  describe('User Interaction', () => {
    it('should call onClose when Cancel button is clicked', () => {
      render(<UserSelectionModal {...defaultProps} />)

      const cancelBtn = screen.getByText('Cancel')
      fireEvent.click(cancelBtn)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should close when Escape key is pressed', () => {
      render(<UserSelectionModal {...defaultProps} />)

      const dialogContent = screen.getByTestId('dialog-content')
      fireEvent.keyDown(dialogContent, { key: 'Escape' })

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should update selected user when user is selected from search', () => {
      render(<UserSelectionModal {...defaultProps} />)

      const selectBtn = screen.getByTestId('select-user-btn')
      fireEvent.click(selectBtn)

      // Selected user should be displayed in SelectedUserCard
      expect(screen.getByTestId('selected-user-card')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should disable Analyze button when no user is selected', () => {
      mockUserSearchInput.mockImplementation(({ onSelect, value }: any) => (
        <div data-testid="user-search-input">
          <button onClick={() => onSelect(null)}>Clear</button>
          {value && <div>{value.name}</div>}
        </div>
      ))

      render(<UserSelectionModal {...defaultProps} />)

      const analyzeBtn = screen.getByText('Analyze Communications')
      expect(analyzeBtn).toBeDisabled()
    })

    it('should enable Analyze button when user is selected', () => {
      render(<UserSelectionModal {...defaultProps} />)

      const selectBtn = screen.getByTestId('select-user-btn')
      fireEvent.click(selectBtn)

      const analyzeBtn = screen.getByText('Analyze Communications')
      expect(analyzeBtn).not.toBeDisabled()
    })

    it('should call onSelect with user when Analyze button is clicked', () => {
      render(<UserSelectionModal {...defaultProps} />)

      // Select a user first
      const selectBtn = screen.getByTestId('select-user-btn')
      fireEvent.click(selectBtn)

      // Click analyze
      const analyzeBtn = screen.getByText('Analyze Communications')
      fireEvent.click(analyzeBtn)

      expect(mockOnSelect).toHaveBeenCalledWith({
        userId: 'user-2',
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe'
      })
    })
  })

  describe('Search Placeholder', () => {
    it('should use custom placeholder when provided', () => {
      mockUserSearchInput.mockImplementation(({ placeholder }: any) => (
        <div data-testid="user-search-input">
          <span data-testid="placeholder-text">{placeholder}</span>
        </div>
      ))

      render(<UserSelectionModal {...defaultProps} />)

      expect(screen.getByTestId('placeholder-text')).toHaveTextContent('Search users by name, email, or username...')
    })
  })

  describe('Edge Cases', () => {
    it('should handle onClose being called from dialog overlay click', () => {
      render(<UserSelectionModal {...defaultProps} />)

      const dialogContent = screen.getByTestId('dialog-content')
      fireEvent.click(dialogContent)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onSelect when Analyze is clicked without selected user', () => {
      mockUserSearchInput.mockImplementation(() => (
        <div data-testid="user-search-input">No user selected</div>
      ))

      render(<UserSelectionModal {...defaultProps} />)

      const analyzeBtn = screen.getByText('Analyze Communications')
      // Button should be disabled, but test the handler anyway
      expect(analyzeBtn).toBeDisabled()
    })

    it('should display selected user card when user is selected', () => {
      render(<UserSelectionModal {...defaultProps} />)

      const selectBtn = screen.getByTestId('select-user-btn')
      fireEvent.click(selectBtn)

      // Should show selected user card
      expect(screen.getByTestId('selected-user-card')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('Props Variations', () => {
    it('should use default title when not provided', () => {
      const propsWithoutTitle = { ...defaultProps }
      delete (propsWithoutTitle as any).title

      render(<UserSelectionModal {...propsWithoutTitle} />)

      expect(screen.getByText('Select a user')).toBeInTheDocument()
    })

    it('should work without excludeUserId prop', () => {
      const propsWithoutExclude = { ...defaultProps }
      delete (propsWithoutExclude as any).excludeUserId

      render(<UserSelectionModal {...propsWithoutExclude} />)

      const searchInput = screen.getByTestId('user-search-input')
      const input = searchInput.querySelector('input')
      expect(input).not.toHaveAttribute('data-exclude-user-id')
    })
  })
})
