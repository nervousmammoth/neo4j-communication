import { render, screen } from '@testing-library/react'
import ConversationsPage from '@/app/(main)/conversations/page'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the ConversationsView component
vi.mock('@/components/conversations-view', () => ({
  ConversationsView: ({ conversations, currentPage }: any) => (
    <div data-testid="conversations-view">
      <div data-testid="conversation-count">{conversations.length}</div>
      <div data-testid="current-page">{currentPage}</div>
      {conversations.map((conv: any) => (
        <div key={conv.conversationId} data-testid={`conversation-${conv.conversationId}`}>
          {conv.title}
        </div>
      ))}
    </div>
  )
}))

// Mock the PaginationWithPrefetch component
vi.mock('@/components/pagination-prefetch', () => ({
  PaginationWithPrefetch: ({ page, limit, total, totalPages }: any) => (
    <div data-testid="pagination">
      Page {page} of {totalPages} (Total: {total})
    </div>
  )
}))

// Mock Link from next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => (
    <a href={href}>{children}</a>
  )
}))

// Mock ConversationSearchBar component
vi.mock('@/components/conversation-search-bar', () => ({
  ConversationSearchBar: ({ initialQuery }: any) => (
    <div data-testid="search-bar">
      Search bar (query: {initialQuery || 'none'})
    </div>
  )
}))

// Mock API client
vi.mock('@/lib/api-client', () => ({
  getConversationsPaginated: vi.fn(),
  searchConversations: vi.fn()
}))

import { getConversationsPaginated } from '@/lib/api-client'

describe('ConversationsPage', () => {
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
  })

  const mockConversations = [
    {
      conversationId: 'conv-001',
      title: 'Project Discussion',
      participantCount: 5,
      messageCount: 100,
      lastMessageTimestamp: '2024-01-15T10:00:00Z',
      type: 'group',
      priority: 'high'
    },
    {
      conversationId: 'conv-002',
      title: 'Daily Standup',
      participantCount: 3,
      messageCount: 50,
      lastMessageTimestamp: '2024-01-14T09:00:00Z',
      type: 'group',
      priority: 'normal'
    }
  ]

  const mockPagination = {
    page: 1,
    limit: 20,
    total: 100,
    totalPages: 5
  }

  it('should render conversations with pagination', async () => {
    vi.mocked(getConversationsPaginated).mockResolvedValueOnce({
      conversations: mockConversations,
      pagination: mockPagination
    })

    const searchParams = Promise.resolve({ page: '1', limit: '20' })
    const element = await ConversationsPage({ searchParams })
    render(element)

    expect(screen.getByTestId('conversations-view')).toBeInTheDocument()
    expect(screen.getByTestId('conversation-count')).toHaveTextContent('2')
    expect(screen.getByTestId('current-page')).toHaveTextContent('1')
    expect(screen.getByTestId('pagination')).toHaveTextContent('Page 1 of 5 (Total: 100)')
  })

  it('should handle default page and limit parameters', async () => {
    vi.mocked(getConversationsPaginated).mockResolvedValueOnce({
      conversations: mockConversations,
      pagination: mockPagination
    })

    const searchParams = Promise.resolve({})
    const element = await ConversationsPage({ searchParams })
    render(element)

    expect(getConversationsPaginated).toHaveBeenCalledWith({ page: 1, limit: 20 })
  })

  it('should parse and validate page parameter', async () => {
    vi.mocked(getConversationsPaginated).mockResolvedValueOnce({
      conversations: mockConversations,
      pagination: { ...mockPagination, page: 3 }
    })

    const searchParams = Promise.resolve({ page: '3', limit: '50' })
    const element = await ConversationsPage({ searchParams })
    render(element)

    expect(getConversationsPaginated).toHaveBeenCalledWith({ page: 3, limit: 50 })
  })

  it('should handle invalid page parameter', async () => {
    vi.mocked(getConversationsPaginated).mockResolvedValueOnce({
      conversations: mockConversations,
      pagination: mockPagination
    })

    const searchParams = Promise.resolve({ page: 'invalid', limit: 'invalid' })
    const element = await ConversationsPage({ searchParams })
    render(element)

    expect(getConversationsPaginated).toHaveBeenCalledWith({ page: 1, limit: 20 })
  })

  it('should enforce minimum page value', async () => {
    vi.mocked(getConversationsPaginated).mockResolvedValueOnce({
      conversations: mockConversations,
      pagination: mockPagination
    })

    const searchParams = Promise.resolve({ page: '-5' })
    const element = await ConversationsPage({ searchParams })
    render(element)

    expect(getConversationsPaginated).toHaveBeenCalledWith({ page: 1, limit: 20 })
  })

  it('should enforce limit boundaries', async () => {
    vi.mocked(getConversationsPaginated).mockResolvedValueOnce({
      conversations: mockConversations,
      pagination: mockPagination
    })

    const searchParams = Promise.resolve({ limit: '200' })
    const element = await ConversationsPage({ searchParams })
    render(element)

    expect(getConversationsPaginated).toHaveBeenCalledWith({ page: 1, limit: 100 })
  })

  it('should render empty state when no conversations', async () => {
    vi.mocked(getConversationsPaginated).mockResolvedValueOnce({
      conversations: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    })

    const searchParams = Promise.resolve({})
    const element = await ConversationsPage({ searchParams })
    const { container } = render(element)

    expect(screen.getByTestId('search-bar')).toBeInTheDocument()
    expect(screen.getByText('No conversations found')).toBeInTheDocument()
    expect(screen.getByText('There are no conversations to display.')).toBeInTheDocument()
    expect(container.querySelector('.container')).toBeInTheDocument()
  })

  it('should render empty state with clear search link when no search results', async () => {
    const { searchConversations } = await import('@/lib/api-client')
    vi.mocked(searchConversations).mockResolvedValueOnce({
      results: [],
      total: 0
    })

    const searchParams = Promise.resolve({ query: 'nonexistent', page: '1' })
    const element = await ConversationsPage({ searchParams })
    render(element)

    expect(screen.getByTestId('search-bar')).toBeInTheDocument()
    expect(screen.getByText('No conversations match your search')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search terms or filters')).toBeInTheDocument()
    expect(screen.getByText('Clear search and view all conversations')).toBeInTheDocument()

    const clearLink = screen.getByText('Clear search and view all conversations')
    expect(clearLink.closest('a')).toHaveAttribute('href', '/conversations')
  })

  it('should handle API errors and render error state', async () => {
    const testError = new Error('API Error')
    vi.mocked(getConversationsPaginated).mockRejectedValueOnce(testError)

    const searchParams = Promise.resolve({})
    const element = await ConversationsPage({ searchParams })
    render(element)

    expect(screen.getByText('Error loading conversations')).toBeInTheDocument()
    expect(screen.getByText('API Error')).toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading conversations:', testError)
  })

  it('should handle non-Error exceptions', async () => {
    vi.mocked(getConversationsPaginated).mockRejectedValueOnce('String error')

    const searchParams = Promise.resolve({})
    const element = await ConversationsPage({ searchParams })
    render(element)

    expect(screen.getByText('Error loading conversations')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
  })

  it('should pass conversations and current page to ConversationsView', async () => {
    vi.mocked(getConversationsPaginated).mockResolvedValueOnce({
      conversations: mockConversations,
      pagination: { ...mockPagination, page: 2 }
    })

    const searchParams = Promise.resolve({ page: '2' })
    const element = await ConversationsPage({ searchParams })
    render(element)

    expect(screen.getByTestId('current-page')).toHaveTextContent('2')
    expect(screen.getByTestId('conversation-conv-001')).toHaveTextContent('Project Discussion')
    expect(screen.getByTestId('conversation-conv-002')).toHaveTextContent('Daily Standup')
  })
})