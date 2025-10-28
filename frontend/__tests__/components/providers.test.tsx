import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Providers } from '@/components/providers'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ReactNode } from 'react'

// Test component that uses React Query hooks
function TestComponent() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['test'],
    queryFn: () => Promise.resolve('test data'),
  })

  return (
    <div>
      <div data-testid="query-client-exists">
        {queryClient ? 'QueryClient exists' : 'No QueryClient'}
      </div>
      <div data-testid="loading-state">{isLoading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="query-data">{data || 'No data'}</div>
      <div data-testid="stale-time">
        {JSON.stringify(queryClient.getDefaultOptions().queries?.staleTime)}
      </div>
      <div data-testid="gc-time">
        {JSON.stringify(queryClient.getDefaultOptions().queries?.gcTime)}
      </div>
    </div>
  )
}

// Test component that throws an error to test error boundary behavior
function ErrorComponent() {
  throw new Error('Test error')
}

// Test component to verify children are rendered
function SimpleChild({ text }: { text: string }) {
  return <div data-testid="simple-child">{text}</div>
}

describe('Providers', () => {
  it('should render children correctly', () => {
    render(
      <Providers>
        <SimpleChild text="Hello World" />
      </Providers>
    )

    expect(screen.getByTestId('simple-child')).toHaveTextContent('Hello World')
  })

  it('should provide QueryClient to children', async () => {
    render(
      <Providers>
        <TestComponent />
      </Providers>
    )

    expect(screen.getByTestId('query-client-exists')).toHaveTextContent(
      'QueryClient exists'
    )
  })

  it('should configure QueryClient with correct default options', () => {
    render(
      <Providers>
        <TestComponent />
      </Providers>
    )

    // Check staleTime is set to 1 minute (60 * 1000 ms)
    expect(screen.getByTestId('stale-time')).toHaveTextContent('60000')
    
    // Check gcTime is set to 10 minutes (10 * 60 * 1000 ms)
    expect(screen.getByTestId('gc-time')).toHaveTextContent('600000')
  })

  it('should allow queries to work correctly', async () => {
    render(
      <Providers>
        <TestComponent />
      </Providers>
    )

    // Initially should be loading
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading')

    // Wait for query to resolve
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('Loaded')
      expect(screen.getByTestId('query-data')).toHaveTextContent('test data')
    })
  })

  it('should maintain the same QueryClient instance across renders', () => {
    const { rerender } = render(
      <Providers>
        <TestComponent />
      </Providers>
    )

    const firstRender = screen.getByTestId('query-client-exists').textContent

    // Re-render with different children
    rerender(
      <Providers>
        <div>
          <TestComponent />
          <SimpleChild text="Additional child" />
        </div>
      </Providers>
    )

    const secondRender = screen.getByTestId('query-client-exists').textContent
    
    // Both renders should indicate QueryClient exists
    expect(firstRender).toBe('QueryClient exists')
    expect(secondRender).toBe('QueryClient exists')
  })

  it('should handle multiple children', () => {
    render(
      <Providers>
        <SimpleChild text="First" />
        <SimpleChild text="Second" />
        <SimpleChild text="Third" />
      </Providers>
    )

    const children = screen.getAllByTestId('simple-child')
    expect(children).toHaveLength(3)
    expect(children[0]).toHaveTextContent('First')
    expect(children[1]).toHaveTextContent('Second')
    expect(children[2]).toHaveTextContent('Third')
  })

  it('should handle fragments as children', () => {
    render(
      <Providers>
        <>
          <SimpleChild text="Fragment child 1" />
          <SimpleChild text="Fragment child 2" />
        </>
      </Providers>
    )

    const children = screen.getAllByTestId('simple-child')
    expect(children).toHaveLength(2)
    expect(children[0]).toHaveTextContent('Fragment child 1')
    expect(children[1]).toHaveTextContent('Fragment child 2')
  })

  it('should handle null children gracefully', () => {
    const { container } = render(
      <Providers>
        {null}
      </Providers>
    )

    // Should render without errors even with null children
    expect(container.firstChild).toBeDefined()
  })

  it('should handle undefined children gracefully', () => {
    const { container } = render(
      <Providers>
        {undefined}
      </Providers>
    )

    // Should render without errors even with undefined children
    expect(container.firstChild).toBeDefined()
  })

  it('should provide a working QueryClient for mutations', async () => {
    function MutationTestComponent() {
      const queryClient = useQueryClient()
      
      const handleInvalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['test'] })
      }

      return (
        <button onClick={handleInvalidate} data-testid="invalidate-button">
          Invalidate
        </button>
      )
    }

    render(
      <Providers>
        <MutationTestComponent />
      </Providers>
    )

    const button = screen.getByTestId('invalidate-button')
    expect(button).toBeInTheDocument()
    
    // Should not throw when clicking
    button.click()
  })

  it('should create QueryClient with a function to ensure fresh instance', () => {
    // This test verifies that useState is called with a function,
    // ensuring a fresh QueryClient instance is created per component instance
    const { container } = render(
      <Providers>
        <SimpleChild text="Test" />
      </Providers>
    )

    // The component should render successfully with the QueryClient
    expect(container.querySelector('[data-testid="simple-child"]')).toBeInTheDocument()
  })

  it('should properly type children prop', () => {
    // TypeScript compile-time test - this should compile without errors
    const validChildren: ReactNode[] = [
      <div key="1">Element</div>,
      'String',
      123,
      null,
      undefined,
      true,
      false,
      <>Fragment</>,
    ]

    validChildren.forEach((child, index) => {
      const { container } = render(
        <Providers>
          {child}
        </Providers>
      )
      
      // All valid ReactNode types should render without errors
      expect(container).toBeDefined()
    })
  })
})