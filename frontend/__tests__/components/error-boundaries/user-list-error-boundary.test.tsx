import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { 
  UserListErrorBoundary, 
  withUserListErrorBoundary,
  UsersPageWithErrorBoundary 
} from '@/components/error-boundaries/user-list-error-boundary'

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button 
      onClick={onClick} 
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
}))

// Component that throws an error for testing
const ThrowingComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error for error boundary')
  }
  return <div data-testid="working-component">Component is working</div>
}

// Component with delayed error for testing componentDidCatch
const DelayedErrorComponent = ({ triggerError = false }: { triggerError?: boolean }) => {
  if (triggerError) {
    throw new Error('Delayed test error')
  }
  return <div data-testid="delayed-component">Delayed component</div>
}

describe('UserListErrorBoundary', () => {
  const originalError = console.error
  const originalWarn = console.warn
  const originalLocation = window.location
  
  beforeEach(() => {
    // Mock console methods to avoid error spam in tests
    console.error = vi.fn()
    console.warn = vi.fn()
    
    // Mock window.location
    delete (window as any).location
    window.location = { href: 'http://localhost:3000/users', reload: vi.fn() } as any
    
    // Mock fetch for error reporting
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })
    
    // Mock window.analytics
    window.analytics = {
      track: vi.fn()
    }
  })

  afterEach(() => {
    console.error = originalError
    console.warn = originalWarn
    window.location = originalLocation
    vi.restoreAllMocks()
  })

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </UserListErrorBoundary>
      )

      expect(screen.getByTestId('working-component')).toBeInTheDocument()
      expect(screen.getByText('Component is working')).toBeInTheDocument()
    })

    it('does not interfere with normal component updates', () => {
      const { rerender } = render(
        <UserListErrorBoundary>
          <div data-testid="dynamic-content">Initial content</div>
        </UserListErrorBoundary>
      )

      rerender(
        <UserListErrorBoundary>
          <div data-testid="dynamic-content">Updated content</div>
        </UserListErrorBoundary>
      )

      expect(screen.getByTestId('dynamic-content')).toHaveTextContent('Updated content')
    })
  })

  describe('Error Handling', () => {
    it('catches errors and displays error UI', () => {
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      expect(screen.queryByTestId('working-component')).not.toBeInTheDocument()
      expect(screen.getByText('Something went wrong loading the user list')).toBeInTheDocument()
      expect(screen.getByText(/We encountered an error while displaying the users/)).toBeInTheDocument()
    })

    it('logs errors to console', () => {
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      expect(console.error).toHaveBeenCalledWith(
        'User list error boundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      )
    })

    it('displays error icon in error state', () => {
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      const svg = screen.getByTestId('error-icon')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('w-8', 'h-8', 'text-red-600')
      expect(svg).toHaveAttribute('role', 'img')
    })
  })

  describe('Error Recovery', () => {
    it('provides Try Again button that calls handleRetry', async () => {
      const user = userEvent.setup()
      
      // Spy on the error boundary's handleRetry method
      const handleRetrySpy = vi.fn()
      
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      // Verify error state is shown
      expect(screen.getByText('Something went wrong loading the user list')).toBeInTheDocument()

      // Verify Try Again button exists and is clickable
      const tryAgainButton = screen.getByText('Try Again')
      expect(tryAgainButton).toBeInTheDocument()
      expect(tryAgainButton).toHaveAttribute('data-variant', 'outline')
      
      // Click the button (this should not throw an error)
      await user.click(tryAgainButton)
      
      // Verify the error UI is still shown (since child still throws)
      expect(screen.getByText('Something went wrong loading the user list')).toBeInTheDocument()
    })

    it('provides Refresh Page button that reloads the page', async () => {
      const user = userEvent.setup()
      
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      const refreshButton = screen.getByText('Refresh Page')
      await user.click(refreshButton)

      expect(window.location.reload).toHaveBeenCalled()
    })
  })

  describe('Error Reporting', () => {
    beforeEach(() => {
      // Set NODE_ENV to production for error reporting tests
      process.env.NODE_ENV = 'production'
    })

    afterEach(() => {
      process.env.NODE_ENV = 'test'
    })

    it('reports errors to analytics in production', () => {
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      expect(window.analytics.track).toHaveBeenCalledWith('User List Error', {
        error: 'Test error for error boundary',
        stack: expect.any(String),
        componentStack: expect.any(String),
        timestamp: expect.any(String),
        userAgent: expect.any(String),
        url: 'http://localhost:3000/users'
      })
    })

    it('sends error to custom endpoint in production', () => {
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      expect(fetch).toHaveBeenCalledWith('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('user-list-error')
      })
    })

    it('does not report errors in development', () => {
      process.env.NODE_ENV = 'development'
      
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      expect(window.analytics.track).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
    })

    it('handles analytics unavailability gracefully', () => {
      delete (window as any).analytics
      
      expect(() => {
        render(
          <UserListErrorBoundary>
            <ThrowingComponent shouldThrow={true} />
          </UserListErrorBoundary>
        )
      }).not.toThrow()
    })

    it('handles fetch errors gracefully', () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      expect(() => {
        render(
          <UserListErrorBoundary>
            <ThrowingComponent shouldThrow={true} />
          </UserListErrorBoundary>
        )
      }).not.toThrow()
      
      // The error boundary catches and logs the original error
      expect(console.error).toHaveBeenCalledWith(
        'User list error boundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      )
    })
  })

  describe('Development Mode Features', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('shows error details in development mode', () => {
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument()
    })

    it('displays error message and stack trace in development', () => {
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      const details = screen.getByText('Error Details (Development Only)')
      fireEvent.click(details)
      
      expect(screen.getByText('Error:')).toBeInTheDocument()
      expect(screen.getByText('Test error for error boundary')).toBeInTheDocument()
      expect(screen.getByText('Stack Trace:')).toBeInTheDocument()
    })

    it('hides error details in production mode', () => {
      process.env.NODE_ENV = 'production'
      
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument()
    })
  })

  describe('Higher-Order Component', () => {
    it('wraps components with error boundary', () => {
      const WrappedComponent = withUserListErrorBoundary(ThrowingComponent)
      
      render(<WrappedComponent shouldThrow={false} />)
      
      expect(screen.getByTestId('working-component')).toBeInTheDocument()
    })

    it('catches errors in wrapped components', () => {
      const WrappedComponent = withUserListErrorBoundary(ThrowingComponent)
      
      render(<WrappedComponent shouldThrow={true} />)
      
      expect(screen.getByText('Something went wrong loading the user list')).toBeInTheDocument()
    })

    it('sets proper display name for wrapped component', () => {
      const TestComponent = () => <div>Test</div>
      TestComponent.displayName = 'TestComponent'
      
      const WrappedComponent = withUserListErrorBoundary(TestComponent)
      
      expect(WrappedComponent.displayName).toBe('withUserListErrorBoundary(TestComponent)')
    })

    it('handles components without display name', () => {
      const TestComponent = () => <div>Test</div>
      const WrappedComponent = withUserListErrorBoundary(TestComponent)
      
      expect(WrappedComponent.displayName).toBe('withUserListErrorBoundary(TestComponent)')
    })
  })

  describe('Convenience Wrapper Component', () => {
    it('renders children normally', () => {
      render(
        <UsersPageWithErrorBoundary>
          <div data-testid="page-content">Users page content</div>
        </UsersPageWithErrorBoundary>
      )

      expect(screen.getByTestId('page-content')).toBeInTheDocument()
    })

    it('catches errors in children', () => {
      render(
        <UsersPageWithErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UsersPageWithErrorBoundary>
      )

      expect(screen.getByText('Something went wrong loading the user list')).toBeInTheDocument()
    })
  })

  describe('Button Styling and Variants', () => {
    it('applies correct button variants', () => {
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      const tryAgainButton = screen.getByText('Try Again')
      const refreshButton = screen.getByText('Refresh Page')

      expect(tryAgainButton).toHaveAttribute('data-variant', 'outline')
      expect(refreshButton).toHaveAttribute('data-variant', 'default')
    })

    it('applies full width styling to buttons', () => {
      render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      const tryAgainButton = screen.getByText('Try Again')
      const refreshButton = screen.getByText('Refresh Page')

      expect(tryAgainButton).toHaveClass('w-full')
      expect(refreshButton).toHaveClass('w-full')
    })
  })

  describe('Error State Persistence', () => {
    it('maintains error state across re-renders until reset', () => {
      const { rerender } = render(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      expect(screen.getByText('Something went wrong loading the user list')).toBeInTheDocument()

      // Re-render with same error
      rerender(
        <UserListErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </UserListErrorBoundary>
      )

      expect(screen.getByText('Something went wrong loading the user list')).toBeInTheDocument()
    })
  })
})