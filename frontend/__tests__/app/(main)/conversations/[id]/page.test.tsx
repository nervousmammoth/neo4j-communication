import { render, screen } from '@testing-library/react'
import ConversationDetailPage from '@/app/(main)/conversations/[id]/page'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the components
vi.mock('@/components/conversation-header', () => ({
  default: ({ conversation }: any) => (
    <div data-testid="conversation-header">
      {conversation.title || 'Direct Message'}
    </div>
  )
}))

vi.mock('@/components/participant-list', () => ({
  default: ({ participants }: any) => (
    <div data-testid="participant-list">
      {participants.length} participants
    </div>
  )
}))

vi.mock('@/components/message-list', () => ({
  default: ({ conversationId }: any) => (
    <div data-testid="message-list">
      Messages for {conversationId}
    </div>
  )
}))

// Mock Link from next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => (
    <a href={href}>{children}</a>
  )
}))

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  getConversationDetail: vi.fn()
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

import { getConversationDetail } from '@/lib/api-client'

describe('ConversationDetailPage', () => {
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
  })

  const mockConversation = {
    conversationId: 'conv-001',
    title: 'Project Discussion',
    type: 'group',
    priority: 'high',
    createdAt: '2024-01-15T10:00:00Z',
    tags: ['project', 'urgent'],
    participants: [
      {
        userId: 'user-001',
        name: 'Alice Johnson',
        email: 'alice@company.com',
        avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=alice',
        status: 'online'
      },
      {
        userId: 'user-002',
        name: 'Bob Smith',
        email: 'bob@company.com',
        avatarUrl: null,
        status: 'offline'
      }
    ]
  }

  it('should render conversation details', async () => {
    vi.mocked(getConversationDetail).mockResolvedValueOnce(mockConversation)

    const params = Promise.resolve({ id: 'conv-001' })
    const element = await ConversationDetailPage({ params })
    const { container } = render(element)

    expect(screen.getByTestId('conversation-header')).toHaveTextContent('Project Discussion')
    expect(screen.getByTestId('participant-list')).toHaveTextContent('2 participants')
    expect(screen.getByTestId('message-list')).toHaveTextContent('Messages for conv-001')
    expect(container.querySelector('a[href="/conversations?page=1"]')).toBeInTheDocument()
  })

  it('should handle conversations without title', async () => {
    const conversationWithoutTitle = {
      ...mockConversation,
      title: null
    }
    vi.mocked(getConversationDetail).mockResolvedValueOnce(conversationWithoutTitle)

    const params = Promise.resolve({ id: 'conv-001' })
    const element = await ConversationDetailPage({ params })
    render(element)

    expect(screen.getByTestId('conversation-header')).toHaveTextContent('Direct Message')
  })

  it('should handle empty participants list', async () => {
    const conversationWithoutParticipants = {
      ...mockConversation,
      participants: []
    }
    vi.mocked(getConversationDetail).mockResolvedValueOnce(conversationWithoutParticipants)

    const params = Promise.resolve({ id: 'conv-001' })
    const element = await ConversationDetailPage({ params })
    render(element)

    expect(screen.getByTestId('participant-list')).toHaveTextContent('0 participants')
  })

  it('should apply correct layout classes', async () => {
    vi.mocked(getConversationDetail).mockResolvedValueOnce(mockConversation)

    const params = Promise.resolve({ id: 'conv-001' })
    const element = await ConversationDetailPage({ params })
    const { container } = render(element)

    const mainElement = container.querySelector('main')
    expect(mainElement).toHaveClass('flex', 'min-h-screen', 'flex-col', 'p-4', 'md:p-8')
  })

  it('should render back navigation link', async () => {
    vi.mocked(getConversationDetail).mockResolvedValueOnce(mockConversation)

    const params = Promise.resolve({ id: 'conv-001' })
    const element = await ConversationDetailPage({ params })
    render(element)

    const backLink = screen.getByText('← Back to Conversations')
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/conversations?page=1')
  })

  it('should preserve page number in back link when from parameter is provided', async () => {
    vi.mocked(getConversationDetail).mockResolvedValueOnce(mockConversation)

    const params = Promise.resolve({ id: 'conv-001' })
    const searchParams = Promise.resolve({ from: '5' })
    const element = await ConversationDetailPage({ params, searchParams })
    render(element)

    const backLink = screen.getByText('← Back to Conversations')
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/conversations?page=5')
  })

  it('should default to page 1 in back link when no from parameter', async () => {
    vi.mocked(getConversationDetail).mockResolvedValueOnce(mockConversation)

    const params = Promise.resolve({ id: 'conv-001' })
    const searchParams = Promise.resolve({})
    const element = await ConversationDetailPage({ params, searchParams })
    render(element)

    const backLink = screen.getByText('← Back to Conversations')
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/conversations?page=1')
  })

  it('should pass conversation ID to message list', async () => {
    vi.mocked(getConversationDetail).mockResolvedValueOnce(mockConversation)

    const params = Promise.resolve({ id: 'conv-001' })
    const element = await ConversationDetailPage({ params })
    render(element)

    expect(getConversationDetail).toHaveBeenCalledWith('conv-001')
    expect(screen.getByTestId('message-list')).toHaveTextContent('Messages for conv-001')
  })

  it('should throw error when API fails', async () => {
    const testError = new Error('Failed to fetch conversation detail: 404 Not Found')
    vi.mocked(getConversationDetail).mockRejectedValueOnce(testError)

    const params = Promise.resolve({ id: 'non-existent-id' })

    await expect(async () => {
      await ConversationDetailPage({ params })
    }).rejects.toThrow('Failed to fetch conversation detail')

    expect(consoleErrorSpy).toHaveBeenCalledWith('Page error:', testError)
  })

  it('should handle errors and log them', async () => {
    const testError = new Error('Network error')
    vi.mocked(getConversationDetail).mockRejectedValueOnce(testError)

    const params = Promise.resolve({ id: 'conv-001' })

    await expect(async () => {
      await ConversationDetailPage({ params })
    }).rejects.toThrow('Network error')

    expect(consoleErrorSpy).toHaveBeenCalledWith('Page error:', testError)
  })

  it('should handle conversation with null createdAt', async () => {
    const conversationWithNullDate = {
      ...mockConversation,
      createdAt: null as any
    }
    vi.mocked(getConversationDetail).mockResolvedValueOnce(conversationWithNullDate)

    const params = Promise.resolve({ id: 'conv-001' })
    const element = await ConversationDetailPage({ params })
    render(element)

    expect(screen.getByTestId('conversation-header')).toBeInTheDocument()
  })

  it('should handle conversation with string createdAt', async () => {
    const conversationWithStringDate = {
      ...mockConversation,
      createdAt: '2024-01-15T10:00:00Z'
    }
    vi.mocked(getConversationDetail).mockResolvedValueOnce(conversationWithStringDate)

    const params = Promise.resolve({ id: 'conv-001' })
    const element = await ConversationDetailPage({ params })
    render(element)

    expect(screen.getByTestId('conversation-header')).toBeInTheDocument()
  })
})
