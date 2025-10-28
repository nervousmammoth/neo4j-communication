import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from '@/app/(main)/users/page'
import type { UserSummary } from '@/lib/neo4j'
import * as apiClient from '@/lib/api-client'

// Mock the getUsersPaginated function
vi.mock('@/lib/api-client', () => ({
  getUsersPaginated: vi.fn()
}))

// Mock the UsersView component
vi.mock('@/components/users-view', () => ({
  UsersView: ({ users, currentPage }: { users: UserSummary[]; currentPage: number }) => (
    <div data-testid="users-view">
      <h1>Users</h1>
      <div data-testid="current-page">{currentPage}</div>
      <div data-testid="users-count">{users.length}</div>
      {users.map(user => (
        <div key={user.userId} data-testid={`user-${user.userId}`}>
          {user.name}
        </div>
      ))}
    </div>
  )
}))

// Mock the PaginationWithPrefetch component
vi.mock('@/components/pagination-prefetch', () => ({
  PaginationWithPrefetch: ({ 
    page, 
    limit, 
    total, 
    totalPages, 
    showPageSize, 
    showTotal,
    className 
  }: {
    page: number
    limit: number
    total: number
    totalPages: number
    showPageSize: boolean
    showTotal: boolean
    className?: string
  }) => (
    <div data-testid="pagination" className={className}>
      <span data-testid="pagination-page">{page}</span>
      <span data-testid="pagination-limit">{limit}</span>
      <span data-testid="pagination-total">{total}</span>
      <span data-testid="pagination-total-pages">{totalPages}</span>
      <span data-testid="pagination-show-page-size">{showPageSize.toString()}</span>
      <span data-testid="pagination-show-total">{showTotal.toString()}</span>
    </div>
  )
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
}))

// Mock the AppSidebar component
vi.mock('@/components/app-sidebar', () => ({
  AppSidebar: () => <div data-testid="app-sidebar">Mocked AppSidebar</div>
}))

// Mock the sidebar components  
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children, ...props }: any) => (
    <div data-testid="sidebar-provider" {...props}>{children}</div>
  ),
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Toggle Sidebar</button>,
  SidebarInset: ({ children, ...props }: any) => (
    <div data-testid="sidebar-inset" {...props}>{children}</div>
  ),
}))

describe('Users Page', () => {
  const mockUsers: UserSummary[] = [
    {
      userId: 'user-1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      avatar: 'https://example.com/avatar1.png',
      conversationCount: 3,
      messageCount: 15,
      lastActiveTimestamp: '2024-01-01T10:00:00Z'
    },
    {
      userId: 'user-2',
      name: 'Bob Smith',
      email: 'bob@example.com',
      avatar: null,
      conversationCount: 2,
      messageCount: 8,
      lastActiveTimestamp: '2024-01-01T09:30:00Z'
    }
  ]

  const mockPagination = {
    page: 1,
    limit: 20,
    total: 1000,
    totalPages: 50
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic rendering', () => {
    it('renders users page with default pagination', async () => {
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: mockUsers,
        pagination: mockPagination
      })

      const searchParams = Promise.resolve({})
      const result = await Page({ searchParams })

      render(result)

      expect(screen.getByTestId('users-view')).toBeInTheDocument()
      expect(screen.getByTestId('current-page')).toHaveTextContent('1')
      expect(screen.getByTestId('users-count')).toHaveTextContent('2')
      expect(screen.getByTestId('user-user-1')).toHaveTextContent('Alice Johnson')
      expect(screen.getByTestId('user-user-2')).toHaveTextContent('Bob Smith')
    })

    it('renders pagination component with correct props', async () => {
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: mockUsers,
        pagination: mockPagination
      })

      const searchParams = Promise.resolve({})
      const result = await Page({ searchParams })

      render(result)

      expect(screen.getByTestId('pagination')).toBeInTheDocument()
      expect(screen.getByTestId('pagination-page')).toHaveTextContent('1')
      expect(screen.getByTestId('pagination-limit')).toHaveTextContent('20')
      expect(screen.getByTestId('pagination-total')).toHaveTextContent('1000')
      expect(screen.getByTestId('pagination-total-pages')).toHaveTextContent('50')
      expect(screen.getByTestId('pagination-show-page-size')).toHaveTextContent('true')
      expect(screen.getByTestId('pagination-show-total')).toHaveTextContent('true')
    })

    it('applies correct CSS classes to pagination', async () => {
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: mockUsers,
        pagination: mockPagination
      })

      const searchParams = Promise.resolve({})
      const result = await Page({ searchParams })

      render(result)

      const pagination = screen.getByTestId('pagination')
      expect(pagination).toHaveClass('mt-8')
    })
  })

  describe('Pagination parameters', () => {
    it('handles custom page parameter', async () => {
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: mockUsers,
        pagination: { ...mockPagination, page: 3 }
      })

      const searchParams = Promise.resolve({ page: '3' })
      const result = await Page({ searchParams })

      render(result)

      expect(vi.mocked(apiClient.getUsersPaginated)).toHaveBeenCalledWith({ page: 3, limit: 20 })
      expect(screen.getByTestId('current-page')).toHaveTextContent('3')
    })

    it('handles custom limit parameter', async () => {
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: mockUsers,
        pagination: { ...mockPagination, limit: 10 }
      })

      const searchParams = Promise.resolve({ limit: '10' })
      const result = await Page({ searchParams })

      render(result)

      expect(vi.mocked(apiClient.getUsersPaginated)).toHaveBeenCalledWith({ page: 1, limit: 10 })
    })

    it('handles both page and limit parameters', async () => {
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: mockUsers,
        pagination: { ...mockPagination, page: 2, limit: 50 }
      })

      const searchParams = Promise.resolve({ page: '2', limit: '50' })
      const result = await Page({ searchParams })

      render(result)

      expect(vi.mocked(apiClient.getUsersPaginated)).toHaveBeenCalledWith({ page: 2, limit: 50 })
    })

    it('handles invalid page parameter gracefully', async () => {
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: mockUsers,
        pagination: mockPagination
      })

      const searchParams = Promise.resolve({ page: 'invalid' })
      const result = await Page({ searchParams })

      render(result)

      expect(vi.mocked(apiClient.getUsersPaginated)).toHaveBeenCalledWith({ page: 1, limit: 20 })
      expect(screen.getByTestId('current-page')).toHaveTextContent('1')
    })

    it('handles extreme limit parameter values (line 18 coverage)', async () => {
      // Test limit value above maximum (should be clamped to 100)
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: mockUsers,
        pagination: mockPagination
      })

      const result1 = await Page({ searchParams: Promise.resolve({ limit: '200' }) })
      render(result1)
      
      // Should have called with limit clamped to 100
      expect(vi.mocked(apiClient.getUsersPaginated)).toHaveBeenCalledWith({ page: 1, limit: 100 })

      // Reset mock
      vi.mocked(apiClient.getUsersPaginated).mockClear()
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: mockUsers,
        pagination: mockPagination
      })

      // Test limit value of 0 (parseInt returns 0, which is falsy, so falls back to 20)
      const result2 = await Page({ searchParams: Promise.resolve({ limit: '0' }) })
      render(result2)
      
      // Should have called with limit defaulting to 20 (because 0 is falsy in || operator)
      expect(vi.mocked(apiClient.getUsersPaginated)).toHaveBeenCalledWith({ page: 1, limit: 20 })

      // Reset mock
      vi.mocked(apiClient.getUsersPaginated).mockClear()
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: mockUsers,
        pagination: mockPagination
      })

      // Test negative limit value that parseInt handles (should be clamped to 1 by Math.max)
      const result3 = await Page({ searchParams: Promise.resolve({ limit: '-5' }) })
      render(result3)
      
      // parseInt('-5') returns -5, which is truthy, so Math.max(1, -5) = 1, Math.min(100, 1) = 1
      expect(vi.mocked(apiClient.getUsersPaginated)).toHaveBeenCalledWith({ page: 1, limit: 1 })
    })

    it('handles invalid limit parameter gracefully', async () => {
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: mockUsers,
        pagination: mockPagination
      })

      // Test with invalid limit (should default to 20)
      const result = await Page({ searchParams: Promise.resolve({ limit: 'invalid' }) })
      render(result)

      expect(vi.mocked(apiClient.getUsersPaginated)).toHaveBeenCalledWith({ page: 1, limit: 20 })
    })
  })

  describe('Empty state', () => {
    it('handles empty users array', async () => {
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      const searchParams = Promise.resolve({})
      const result = await Page({ searchParams })

      render(result)

      expect(screen.getByText('No users found')).toBeInTheDocument()
      expect(screen.getByText('There are no users to display.')).toBeInTheDocument()
    })

    it('handles pagination edge case when page exceeds total pages', async () => {
      vi.mocked(apiClient.getUsersPaginated).mockResolvedValueOnce({
        users: [],
        pagination: { page: 10, limit: 20, total: 50, totalPages: 3 }
      })

      const searchParams = Promise.resolve({ page: '10' })
      const result = await Page({ searchParams })

      render(result)

      expect(screen.getByText('No users found')).toBeInTheDocument()
      expect(screen.getByText('Try going back to the first page.')).toBeInTheDocument()
      expect(screen.getByText('Go to first page')).toBeInTheDocument()
      
      const backLink = screen.getByText('Go to first page')
      expect(backLink.closest('a')).toHaveAttribute('href', '/users')
    })
  })

  describe('Error handling', () => {
    it('renders error state when getUsersPaginated fails', async () => {
      vi.mocked(apiClient.getUsersPaginated).mockRejectedValueOnce(new Error('API Error'))

      const searchParams = Promise.resolve({})
      const result = await Page({ searchParams })

      render(result)

      expect(screen.getByText('Error loading users')).toBeInTheDocument()
      expect(screen.getByText('API Error')).toBeInTheDocument()
    })

    it('handles non-Error exceptions (line 85 coverage)', async () => {
      // Test when error is not an Error instance
      vi.mocked(apiClient.getUsersPaginated).mockRejectedValueOnce('String error')

      const searchParams = Promise.resolve({})
      const result = await Page({ searchParams })

      render(result)

      expect(screen.getByText('Error loading users')).toBeInTheDocument()
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
    })

    it('handles null/undefined exceptions', async () => {
      // Test when error is null/undefined
      vi.mocked(apiClient.getUsersPaginated).mockRejectedValueOnce(null)

      const searchParams = Promise.resolve({})
      const result = await Page({ searchParams })

      render(result)

      expect(screen.getByText('Error loading users')).toBeInTheDocument()
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
    })
  })
})