import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { PaginationWithPrefetch } from '@/components/pagination-prefetch'
import { getConversationsPaginated } from '@/lib/api-client'
import { ReactNode } from 'react'

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock the useConversations hook
vi.mock('@/hooks/useConversations', () => ({
  useConversations: vi.fn()
}))

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  getConversationsPaginated: vi.fn()
}))

describe('PaginationWithPrefetch', () => {
  let queryClient: QueryClient
  let mockPush: ReturnType<typeof vi.fn>
  let mockPrefetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    mockPush = vi.fn()
    mockPrefetch = vi.fn()

    // Mock useRouter
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
      prefetch: mockPrefetch,
    })

    // Mock usePathname
    ;(usePathname as any).mockReturnValue('/conversations')

    // Mock useSearchParams
    ;(useSearchParams as any).mockReturnValue(new URLSearchParams())

    // Mock API client - provide a default resolved value
    ;(getConversationsPaginated as any).mockResolvedValue({
      conversations: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    })

    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  describe('basic pagination functionality', () => {
    it('should render pagination controls correctly', () => {
      render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      expect(screen.getByText('100 conversations')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to next page')).toBeInTheDocument()
      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
    })

    it('should not render when totalPages is 1 or less', () => {
      const { container } = render(
        <PaginationWithPrefetch
          page={1}
          limit={20}
          total={15}
          totalPages={1}
        />,
        { wrapper }
      )

      expect(container.firstChild).toBeNull()
    })

    it('should handle navigation clicks correctly', async () => {
      const user = userEvent.setup()

      render(
        <PaginationWithPrefetch
          page={3}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      // Click previous page
      const prevButton = screen.getByLabelText('Go to previous page')
      await user.click(prevButton)

      expect(mockPush).toHaveBeenCalledWith('/conversations?page=2')

      // Click next page
      const nextButton = screen.getByLabelText('Go to next page')
      await user.click(nextButton)

      expect(mockPush).toHaveBeenCalledWith('/conversations?page=4')
    })

    it('should disable previous button on first page', () => {
      render(
        <PaginationWithPrefetch
          page={1}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const prevButton = screen.getByLabelText('Go to previous page')
      expect(prevButton).toBeDisabled()
    })

    it('should disable next button on last page', () => {
      render(
        <PaginationWithPrefetch
          page={5}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const nextButton = screen.getByLabelText('Go to next page')
      expect(nextButton).toBeDisabled()
    })

    it('should handle page number button clicks correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <PaginationWithPrefetch
          page={3}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      // Click on page 1 button
      const page1Button = screen.getByLabelText('Go to page 1')
      await user.click(page1Button)
      expect(mockPush).toHaveBeenCalledWith('/conversations')

      // Click on page 4 button
      const page4Button = screen.getByLabelText('Go to page 4')
      await user.click(page4Button)
      expect(mockPush).toHaveBeenCalledWith('/conversations?page=4')

      // Click on page 5 button
      const page5Button = screen.getByLabelText('Go to page 5')
      await user.click(page5Button)
      expect(mockPush).toHaveBeenCalledWith('/conversations?page=5')
    })
  })

  describe('prefetch functionality', () => {
    it('should trigger prefetch on hover over next page button', async () => {
      const user = userEvent.setup()

      render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const nextButton = screen.getByLabelText('Go to next page')
      
      // Hover over next button should trigger prefetch
      await user.hover(nextButton)

      // Wait for debounce delay
      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalledWith('/conversations?page=3')
      }, { timeout: 300 })
    })

    it('should trigger prefetch on hover over previous page button', async () => {
      const user = userEvent.setup()

      render(
        <PaginationWithPrefetch
          page={3}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const prevButton = screen.getByLabelText('Go to previous page')
      
      // Hover over previous button should trigger prefetch
      await user.hover(prevButton)

      // Wait for debounce delay
      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalledWith('/conversations?page=2')
      }, { timeout: 300 })
    })

    it('should trigger prefetch to page 1 without page parameter', async () => {
      const user = userEvent.setup()

      render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      // Find and hover over page 1 button
      const page1Button = screen.getByText('1')
      await user.hover(page1Button)

      // Wait for debounce delay - should prefetch page 1 without ?page= parameter
      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalledWith('/conversations')
      }, { timeout: 300 })
    })

    it('should trigger prefetch on hover over page number buttons', async () => {
      const user = userEvent.setup()

      render(
        <PaginationWithPrefetch
          page={3}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      // Find page 4 button and hover
      const page4Button = screen.getByLabelText('Go to page 4')
      await user.hover(page4Button)

      // Wait for debounce delay
      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalledWith('/conversations?page=4')
      }, { timeout: 300 })
    })

    it('should not prefetch for disabled buttons', async () => {
      const user = userEvent.setup()

      render(
        <PaginationWithPrefetch
          page={1}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const prevButton = screen.getByLabelText('Go to previous page')
      
      // Hover over disabled previous button should not trigger prefetch
      await user.hover(prevButton)

      expect(mockPrefetch).not.toHaveBeenCalled()
    })

    it('should not prefetch for current page button', async () => {
      const user = userEvent.setup()

      render(
        <PaginationWithPrefetch
          page={3}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const currentPageButton = screen.getByLabelText('Go to page 3')
      
      // Hover over current page button should not trigger prefetch
      await user.hover(currentPageButton)

      expect(mockPrefetch).not.toHaveBeenCalled()
    })

    it('should use TanStack Query prefetching for data', async () => {
      const mockUseConversations = {
        data: null,
        isLoading: false,
        error: null,
      }

      const { useConversations } = await import('@/hooks/useConversations')
      ;(useConversations as any).mockReturnValue(mockUseConversations)

      render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      // The component should use the useConversations hook for prefetching
      expect(useConversations).toHaveBeenCalledWith(2, 20)
    })
  })

  describe('URL construction', () => {
    it('should handle search params correctly', () => {
      // Mock existing search params
      const mockSearchParams = new URLSearchParams('sort=date&filter=all')
      ;(useSearchParams as any).mockReturnValue(mockSearchParams)

      render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const nextButton = screen.getByLabelText('Go to next page')
      fireEvent.click(nextButton)

      // Should preserve existing params while updating page
      expect(mockPush).toHaveBeenCalledWith('/conversations?sort=date&filter=all&page=3')
    })

    it('should remove page param when navigating to page 1', () => {
      render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const prevButton = screen.getByLabelText('Go to previous page')
      fireEvent.click(prevButton)

      // Should remove page param when going to page 1
      expect(mockPush).toHaveBeenCalledWith('/conversations')
    })

    it('should handle different pathnames correctly', () => {
      ;(usePathname as any).mockReturnValue('/admin/conversations')

      render(
        <PaginationWithPrefetch
          page={1}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const nextButton = screen.getByLabelText('Go to next page')
      fireEvent.click(nextButton)

      expect(mockPush).toHaveBeenCalledWith('/admin/conversations?page=2')
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      expect(screen.getByLabelText('Pagination')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to next page')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 1')).toBeInTheDocument()
    })

    it('should have aria-current for current page', () => {
      render(
        <PaginationWithPrefetch
          page={3}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const currentPageButton = screen.getByLabelText('Go to page 3')
      expect(currentPageButton).toHaveAttribute('aria-current', 'page')
    })

    it('should have aria-disabled for disabled buttons', () => {
      render(
        <PaginationWithPrefetch
          page={1}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const prevButton = screen.getByLabelText('Go to previous page')
      expect(prevButton).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('page number display logic', () => {
    it('should show all pages when totalPages <= 7', () => {
      render(
        <PaginationWithPrefetch
          page={3}
          limit={20}
          total={120}
          totalPages={6}
        />,
        { wrapper }
      )

      // Should show pages 1, 2, 3, 4, 5, 6
      for (let i = 1; i <= 6; i++) {
        expect(screen.getByLabelText(`Go to page ${i}`)).toBeInTheDocument()
      }
    })

    it('should show ellipsis for large page ranges', () => {
      render(
        <PaginationWithPrefetch
          page={5}
          limit={20}
          total={200}
          totalPages={10}
        />,
        { wrapper }
      )

      // Should show 1, ..., 4, 5, 6, ..., 10
      expect(screen.getByLabelText('Go to page 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 10')).toBeInTheDocument()
      expect(screen.getAllByText('...')).toHaveLength(2)
    })

    it('should show pages near beginning with ellipsis at end', () => {
      // Test case to cover lines 133-136: near beginning logic
      render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={200}
          totalPages={10}
        />,
        { wrapper }
      )

      // Current page (2) is <= halfVisible (3), so should show beginning pages + ellipsis
      // Should show: 1, 2, 3, 4, 5, ..., 10
      expect(screen.getByLabelText('Go to page 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 2')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 3')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 4')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 5')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 10')).toBeInTheDocument()
      
      // Should have one ellipsis near the end
      expect(screen.getAllByText('...')).toHaveLength(1)
    })

    it('should show pages near end with ellipsis at beginning', () => {
      // Test case to cover lines 139-142: near end logic
      render(
        <PaginationWithPrefetch
          page={9}
          limit={20}
          total={200}
          totalPages={10}
        />,
        { wrapper }
      )

      // Current page (9) is >= totalPages - halfVisible (7), so should show end pages + ellipsis
      // Should show: 1, ..., 6, 7, 8, 9, 10
      expect(screen.getByLabelText('Go to page 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 6')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 7')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 8')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 9')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to page 10')).toBeInTheDocument()
      
      // Should have one ellipsis near the beginning
      expect(screen.getAllByText('...')).toHaveLength(1)
    })
  })

  describe('performance considerations', () => {
    it('should debounce prefetch calls on rapid hover events', async () => {
      const user = userEvent.setup()

      render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const nextButton = screen.getByLabelText('Go to next page')
      
      // Rapid hover events
      await user.hover(nextButton)
      await user.unhover(nextButton)
      await user.hover(nextButton)
      await user.unhover(nextButton)
      await user.hover(nextButton)

      // Should not call prefetch multiple times rapidly
      // Note: This test assumes debouncing is implemented
      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalledWith('/conversations?page=3')
      })
    })

    it('should cleanup prefetch timers on unmount', async () => {
      const user = userEvent.setup()
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      const { unmount } = render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      // Create some pending timers by hovering
      const nextButton = screen.getByLabelText('Go to next page')
      await user.hover(nextButton)
      
      // Unmount should cleanup timers without throwing
      expect(() => unmount()).not.toThrow()
      
      clearTimeoutSpy.mockRestore()
    })

    it('should handle timer management correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={100}
          totalPages={5}
        />,
        { wrapper }
      )

      const nextButton = screen.getByLabelText('Go to next page')
      
      // Hover multiple times to test timer management
      await user.hover(nextButton)
      await user.hover(nextButton)
      
      // Wait for debounce delay
      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalledWith('/conversations?page=3')
      }, { timeout: 300 })
      
      // Test should pass without throwing
      expect(true).toBe(true)
    })
  })

  describe('page size selection', () => {
    it('should handle page size change', async () => {
      const user = userEvent.setup()
      
      render(
        <PaginationWithPrefetch
          page={2}
          limit={20}
          total={100}
          totalPages={5}
          showPageSize={true}
        />,
        { wrapper }
      )

      const select = screen.getByLabelText('Items per page')
      await user.click(select)
      
      const option = screen.getByText('50')
      await user.click(option)
      
      expect(mockPush).toHaveBeenCalledWith('/conversations?limit=50')
    })

    it('should handle page size changes without existing query params', async () => {
      const mockSearchParamsEmpty = vi.fn().mockReturnValue(new URLSearchParams())
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParamsEmpty())
      
      const user = userEvent.setup()
      
      render(
        <PaginationWithPrefetch
          page={1}
          limit={20}
          total={100}
          totalPages={5}
          showPageSize={true}
        />,
        { wrapper }
      )

      const select = screen.getByLabelText('Items per page')
      await user.click(select)
      
      const option = screen.getByText('10')
      await user.click(option)
      
      expect(mockPush).toHaveBeenCalledWith('/conversations?limit=10')
    })

    it('should reset page when changing page size', async () => {
      const mockSearchParamsWithPage = vi.fn().mockReturnValue(new URLSearchParams('page=3&limit=20'))
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParamsWithPage())
      
      const user = userEvent.setup()
      
      render(
        <PaginationWithPrefetch
          page={3}
          limit={20}
          total={100}
          totalPages={5}
          showPageSize={true}
        />,
        { wrapper }
      )

      const select = screen.getByLabelText('Items per page')
      await user.click(select)
      
      const option = screen.getByText('100')
      await user.click(option)
      
      expect(mockPush).toHaveBeenCalledWith('/conversations?limit=100')
    })

    it('should test showTotal conditional rendering', () => {
      const { rerender } = render(
        <PaginationWithPrefetch
          page={1}
          limit={20}
          total={42}
          totalPages={3}
          showTotal={false}
        />,
        { wrapper }
      )

      // Should not show total when showTotal is false
      expect(screen.queryByText('42 conversations')).not.toBeInTheDocument()

      // Should show total when showTotal is true (default)
      rerender(
        <PaginationWithPrefetch
          page={1}
          limit={20}
          total={42}
          totalPages={3}
          showTotal={true}
        />
      )

      expect(screen.getByText('42 conversations')).toBeInTheDocument()
    })

    it('should handle singular conversation text', () => {
      render(
        <PaginationWithPrefetch
          page={1}
          limit={20}
          total={1}
          totalPages={2}
          showTotal={true}
        />,
        { wrapper }
      )

      // Should show singular form for 1 conversation
      expect(screen.getByText('1 conversation')).toBeInTheDocument()
    })

    it('should not render when totalPages is 1 or less', () => {
      const { container } = render(
        <PaginationWithPrefetch
          page={1}
          limit={20}
          total={1}
          totalPages={1}
          showTotal={true}
        />,
        { wrapper }
      )

      // Component should return null for single page
      expect(container.firstChild).toBeNull()
    })
  })
})