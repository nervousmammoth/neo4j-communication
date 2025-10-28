import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '@/app/error'

describe('ErrorBoundary', () => {
  const mockReset = vi.fn()
  const mockError = new Error('Test error message') as Error & { digest?: string }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders error UI correctly', () => {
    render(<ErrorBoundary error={mockError} reset={mockReset} />)

    expect(screen.getByText('Something went wrong!')).toBeInTheDocument()
    expect(screen.getByText('Failed to load conversations. Please check if the Neo4j database is running.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('logs error to console on mount', () => {
    render(<ErrorBoundary error={mockError} reset={mockReset} />)

    expect(console.error).toHaveBeenCalledWith(mockError)
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('logs new error when error prop changes', () => {
    const { rerender } = render(<ErrorBoundary error={mockError} reset={mockReset} />)

    const newError = new Error('New error') as Error & { digest?: string }
    rerender(<ErrorBoundary error={newError} reset={mockReset} />)

    expect(console.error).toHaveBeenCalledWith(mockError)
    expect(console.error).toHaveBeenCalledWith(newError)
    expect(console.error).toHaveBeenCalledTimes(2)
  })

  it('calls reset function when try again button is clicked', async () => {
    const user = userEvent.setup()
    render(<ErrorBoundary error={mockError} reset={mockReset} />)

    const tryAgainButton = screen.getByRole('button', { name: 'Try again' })
    await user.click(tryAgainButton)

    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('applies correct styling classes', () => {
    const { container } = render(<ErrorBoundary error={mockError} reset={mockReset} />)

    const mainContainer = container.firstChild
    expect(mainContainer).toHaveClass('container', 'mx-auto', 'py-10')

    const errorBox = screen.getByText('Something went wrong!').parentElement
    expect(errorBox).toHaveClass(
      'rounded-lg',
      'border',
      'border-red-200',
      'bg-red-50',
      'p-6',
      'dark:border-red-900',
      'dark:bg-red-950'
    )

    const heading = screen.getByText('Something went wrong!')
    expect(heading).toHaveClass(
      'text-lg',
      'font-semibold',
      'text-red-900',
      'dark:text-red-100'
    )

    const description = screen.getByText(/Failed to load conversations/)
    expect(description).toHaveClass(
      'mt-2',
      'text-sm',
      'text-red-700',
      'dark:text-red-200'
    )

    const button = screen.getByRole('button', { name: 'Try again' })
    expect(button).toHaveClass(
      'mt-4',
      'rounded-md',
      'bg-red-600',
      'px-3',
      'py-2',
      'text-sm',
      'font-medium',
      'text-white',
      'hover:bg-red-700',
      'dark:bg-red-700',
      'dark:hover:bg-red-600'
    )
  })

  it('handles error with digest property', () => {
    const errorWithDigest = new Error('Test error') as Error & { digest?: string }
    errorWithDigest.digest = 'error-digest-123'

    render(<ErrorBoundary error={errorWithDigest} reset={mockReset} />)

    expect(console.error).toHaveBeenCalledWith(errorWithDigest)
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument()
  })

  it('button is keyboard accessible', async () => {
    const user = userEvent.setup()
    render(<ErrorBoundary error={mockError} reset={mockReset} />)

    const button = screen.getByRole('button', { name: 'Try again' })
    button.focus()
    
    await user.keyboard('{Enter}')
    expect(mockReset).toHaveBeenCalledTimes(1)

    mockReset.mockClear()
    
    await user.keyboard(' ')
    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('maintains error boundary behavior', () => {
    // Verify component follows Next.js error boundary pattern
    const props = {
      error: mockError,
      reset: mockReset,
    }

    render(<ErrorBoundary {...props} />)

    // Should render without throwing
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument()
  })

  it('does not re-log same error on re-render without error change', () => {
    const { rerender } = render(<ErrorBoundary error={mockError} reset={mockReset} />)

    expect(console.error).toHaveBeenCalledTimes(1)

    // Re-render with same error
    rerender(<ErrorBoundary error={mockError} reset={mockReset} />)

    // Should not log again
    expect(console.error).toHaveBeenCalledTimes(1)
  })
})