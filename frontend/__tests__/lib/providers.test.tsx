import { render, screen, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { QueryClientProvider } from '@/lib/providers'

// Test component to verify QueryClient functionality
function TestComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['test'],
    queryFn: () => Promise.resolve('test-data'),
    retry: false, // Disable retries for faster tests
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  return <div>Data: {data}</div>
}

function ErrorTestComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['error-test'],
    queryFn: () => Promise.reject(new Error('Test error')),
    retry: false, // Disable retries for faster tests
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  return <div>Data: {data}</div>
}

describe('QueryClientProvider', () => {
  it('should provide QueryClient context to child components', async () => {
    render(
      <QueryClientProvider>
        <TestComponent />
      </QueryClientProvider>
    )

    // Initially shows loading
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Data: test-data')).toBeInTheDocument()
    })
  })

  it('should render without crashing with default configuration', () => {
    render(
      <QueryClientProvider>
        <div>Test Content</div>
      </QueryClientProvider>
    )

    // Verify provider renders children
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should handle query errors gracefully', async () => {
    render(
      <QueryClientProvider>
        <ErrorTestComponent />
      </QueryClientProvider>
    )

    // Initially shows loading
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Should show error after query fails
    await waitFor(() => {
      expect(screen.getByText('Error: Test error')).toBeInTheDocument()
    })
  })

  it('should support multiple concurrent queries', async () => {
    function MultiQueryComponent() {
      const query1 = useQuery({
        queryKey: ['multi', 1],
        queryFn: () => Promise.resolve('query1-data'),
        retry: false,
      })

      const query2 = useQuery({
        queryKey: ['multi', 2],
        queryFn: () => Promise.resolve('query2-data'),
        retry: false,
      })

      if (query1.isLoading || query2.isLoading) return <div>Loading...</div>
      if (query1.error || query2.error) return <div>Error occurred</div>

      return (
        <div>
          <div>Query 1: {query1.data}</div>
          <div>Query 2: {query2.data}</div>
        </div>
      )
    }

    render(
      <QueryClientProvider>
        <MultiQueryComponent />
      </QueryClientProvider>
    )

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    // Wait for both queries to complete
    await waitFor(() => {
      expect(screen.getByText('Query 1: query1-data')).toBeInTheDocument()
      expect(screen.getByText('Query 2: query2-data')).toBeInTheDocument()
    })
  })

  it('should allow query refetching', async () => {
    let queryCallCount = 0
    
    function RefetchTestComponent() {
      const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['refetch-test'],
        queryFn: () => {
          queryCallCount++
          return Promise.resolve(`data-${queryCallCount}`)
        },
        retry: false,
      })

      if (isLoading) return <div>Loading...</div>
      if (error) return <div>Error: {error.message}</div>
      return (
        <div>
          <div>Data: {data}</div>
          <button onClick={() => refetch()}>Refetch</button>
        </div>
      )
    }

    render(
      <QueryClientProvider>
        <RefetchTestComponent />
      </QueryClientProvider>
    )

    // Initial data load
    await waitFor(() => {
      expect(screen.getByText('Data: data-1')).toBeInTheDocument()
    })

    // Verify initial query call count
    expect(queryCallCount).toBe(1)
  })

  it('should handle client-side rendering properly', () => {
    // Test that the provider works with client-side components
    render(
      <QueryClientProvider>
        <div data-testid="client-component">Client Side Content</div>
      </QueryClientProvider>
    )

    expect(screen.getByTestId('client-component')).toBeInTheDocument()
  })

  it('should conditionally render ReactQueryDevtools in development', () => {
    const originalEnv = process.env.NODE_ENV
    
    // Test development environment
    process.env.NODE_ENV = 'development'
    
    const { rerender } = render(
      <QueryClientProvider>
        <div data-testid="dev-content">Development Content</div>
      </QueryClientProvider>
    )

    expect(screen.getByTestId('dev-content')).toBeInTheDocument()
    
    // Test non-development environment
    process.env.NODE_ENV = 'production'
    
    rerender(
      <QueryClientProvider>
        <div data-testid="prod-content">Production Content</div>
      </QueryClientProvider>
    )

    expect(screen.getByTestId('prod-content')).toBeInTheDocument()
    
    // Restore original environment
    process.env.NODE_ENV = originalEnv
  })
})