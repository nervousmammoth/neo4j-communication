import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { notFound, redirect } from 'next/navigation'
import CommunicationAnalysisPage from '@/app/(main)/users/communications/[userId1]/[userId2]/page'
import { getCommunicationData } from '@/lib/api-client'
import type { UserCommunicationData } from '@/lib/neo4j'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

// Mock API client
vi.mock('@/lib/api-client', () => ({
  getCommunicationData: vi.fn(),
}))

// Mock components
vi.mock('@/components/communication-header', () => ({
  CommunicationHeader: vi.fn(({ user1, user2, stats }) => (
    <div data-testid="communication-header">
      <span>{user1.name}</span>
      <span>{user2.name}</span>
      <span>{stats.totalMessages} messages</span>
    </div>
  )),
}))

vi.mock('@/components/shared-conversations', () => ({
  SharedConversations: vi.fn(({ conversations, selectedId }) => (
    <div data-testid="shared-conversations">
      {conversations.length} conversations
      {selectedId && <span>Selected: {selectedId}</span>}
    </div>
  )),
}))

vi.mock('@/components/message-timeline', () => ({
  MessageTimeline: vi.fn(({ messages, pagination }) => (
    <div data-testid="message-timeline">
      {messages.length} messages
      Page {pagination.page} of {pagination.totalPages}
    </div>
  )),
}))

vi.mock('@/components/communication-skeleton', () => ({
  CommunicationSkeleton: vi.fn(() => (
    <div data-testid="communication-skeleton">Loading...</div>
  )),
}))

describe('CommunicationAnalysisPage', () => {
  const mockCommunicationData: UserCommunicationData = {
    user1: {
      userId: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
      status: 'active',
      avatarUrl: null,
      lastSeen: '2024-01-15T10:00:00Z',
    },
    user2: {
      userId: 'user2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      username: 'janesmith',
      status: 'active',
      avatarUrl: null,
      lastSeen: '2024-01-15T11:00:00Z',
    },
    sharedConversations: [
      {
        conversationId: 'conv1',
        title: 'Project Discussion',
        type: 'group',
        messageCount: 150,
        user1MessageCount: 75,
        user2MessageCount: 75,
        participants: ['user1', 'user2', 'user3'],
        lastActivity: '2024-01-15T09:00:00Z',
      },
    ],
    communicationStats: {
      totalSharedConversations: 5,
      totalMessages: 500,
      user1Messages: 250,
      user2Messages: 250,
      firstInteraction: '2023-01-01T00:00:00Z',
      lastInteraction: '2024-01-15T09:00:00Z',
    },
    messageTimeline: [
      {
        messageId: 'msg1',
        content: 'Hello!',
        senderId: 'user1',
        timestamp: '2024-01-15T09:00:00Z',
        conversationId: 'conv1',
        conversationTitle: 'Project Discussion',
      },
    ],
    pagination: {
      page: 1,
      limit: 50,
      total: 100,
      totalPages: 2,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render communication data successfully', async () => {
    vi.mocked(getCommunicationData).mockResolvedValueOnce(mockCommunicationData)

    const params = { userId1: 'user1', userId2: 'user2' }
    const searchParams = {}

    const Component = await CommunicationAnalysisPage({
      params,
      searchParams,
    })

    render(Component)

    // Check API was called with normalized IDs
    expect(getCommunicationData).toHaveBeenCalledWith('user1', 'user2', {
      page: 1,
      limit: 50,
      conversationId: undefined,
    })

    // Check components are rendered
    expect(screen.getByTestId('communication-header')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('500 messages')).toBeInTheDocument()

    expect(screen.getByTestId('shared-conversations')).toBeInTheDocument()
    expect(screen.getByText('1 conversations')).toBeInTheDocument()

    expect(screen.getByTestId('message-timeline')).toBeInTheDocument()
    // Messages are displayed separately in the mock
    expect(screen.getByTestId('message-timeline')).toHaveTextContent('1')
  })

  it('should normalize user IDs and redirect if not normalized', async () => {
    vi.mocked(getCommunicationData).mockResolvedValueOnce(mockCommunicationData)

    const params = { userId1: 'user2', userId2: 'user1' }
    const searchParams = {}

    await CommunicationAnalysisPage({
      params,
      searchParams,
    })

    expect(redirect).toHaveBeenCalledWith('/users/communications/user1/user2')
  })

  it('should handle pagination parameters', async () => {
    vi.mocked(getCommunicationData).mockResolvedValueOnce(mockCommunicationData)

    const params = { userId1: 'user1', userId2: 'user2' }
    const searchParams = { page: '2', limit: '25' }

    await CommunicationAnalysisPage({
      params,
      searchParams,
    })

    expect(getCommunicationData).toHaveBeenCalledWith('user1', 'user2', {
      page: 2,
      limit: 25,
      conversationId: undefined,
    })
  })

  it('should handle conversation filter', async () => {
    vi.mocked(getCommunicationData).mockResolvedValueOnce(mockCommunicationData)

    const params = { userId1: 'user1', userId2: 'user2' }
    const searchParams = { conversation: 'conv123' }

    const Component = await CommunicationAnalysisPage({
      params,
      searchParams,
    })

    render(Component)

    expect(getCommunicationData).toHaveBeenCalledWith('user1', 'user2', {
      page: 1,
      limit: 50,
      conversationId: 'conv123',
    })

    expect(screen.getByTestId('shared-conversations')).toBeInTheDocument()
    expect(screen.getByText('Selected: conv123')).toBeInTheDocument()
  })

  it('should handle primary user parameter', async () => {
    vi.mocked(getCommunicationData).mockResolvedValueOnce(mockCommunicationData)

    const params = { userId1: 'user1', userId2: 'user2' }
    const searchParams = { primary: 'user2' }

    const Component = await CommunicationAnalysisPage({
      params,
      searchParams,
    })

    render(Component)

    expect(getCommunicationData).toHaveBeenCalledWith('user1', 'user2', {
      page: 1,
      limit: 50,
      conversationId: undefined,
    })
  })

  it('should handle search and date filters', async () => {
    vi.mocked(getCommunicationData).mockResolvedValueOnce(mockCommunicationData)

    const params = { userId1: 'user1', userId2: 'user2' }
    const searchParams = {
      search: 'hello',
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
    }

    const Component = await CommunicationAnalysisPage({
      params,
      searchParams,
    })

    render(Component)

    expect(getCommunicationData).toHaveBeenCalledWith('user1', 'user2', {
      page: 1,
      limit: 50,
      conversationId: undefined,
    })
  })

  it('should show 404 when users not found', async () => {
    vi.mocked(getCommunicationData).mockResolvedValueOnce({
      ...mockCommunicationData,
      user1: null,
      user2: null,
    })

    const params = { userId1: 'invalid1', userId2: 'invalid2' }
    const searchParams = {}

    await CommunicationAnalysisPage({
      params,
      searchParams,
    })

    expect(notFound).toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(getCommunicationData).mockRejectedValueOnce(new Error('API Error'))

    const params = { userId1: 'user1', userId2: 'user2' }
    const searchParams = {}

    await expect(
      CommunicationAnalysisPage({
        params,
        searchParams,
      })
    ).rejects.toThrow('API Error')
  })

  it('should render with view parameter', async () => {
    vi.mocked(getCommunicationData).mockResolvedValueOnce(mockCommunicationData)

    const params = { userId1: 'user1', userId2: 'user2' }
    const searchParams = { view: 'timeline' }

    const Component = await CommunicationAnalysisPage({
      params,
      searchParams,
    })

    render(Component)

    expect(screen.getByTestId('message-timeline')).toBeInTheDocument()
  })

  it('should handle empty shared conversations', async () => {
    vi.mocked(getCommunicationData).mockResolvedValueOnce({
      ...mockCommunicationData,
      sharedConversations: [],
      messageTimeline: [],
      communicationStats: {
        ...mockCommunicationData.communicationStats,
        totalSharedConversations: 0,
        totalMessages: 0,
        user1Messages: 0,
        user2Messages: 0,
      },
    })

    const params = { userId1: 'user1', userId2: 'user2' }
    const searchParams = {}

    const Component = await CommunicationAnalysisPage({
      params,
      searchParams,
    })

    render(Component)

    expect(screen.getByTestId('shared-conversations')).toBeInTheDocument()
    expect(screen.getByText('0 conversations')).toBeInTheDocument()
    expect(screen.getByText('0 messages')).toBeInTheDocument()
  })

  it('should handle invalid page number', async () => {
    vi.mocked(getCommunicationData).mockResolvedValueOnce(mockCommunicationData)

    const params = { userId1: 'user1', userId2: 'user2' }
    const searchParams = { page: 'invalid' }

    await CommunicationAnalysisPage({
      params,
      searchParams,
    })

    // Should default to page 1
    expect(getCommunicationData).toHaveBeenCalledWith('user1', 'user2', {
      page: 1,
      limit: 50,
      conversationId: undefined,
    })
  })

  it('should handle limit exceeding maximum', async () => {
    vi.mocked(getCommunicationData).mockResolvedValueOnce(mockCommunicationData)

    const params = { userId1: 'user1', userId2: 'user2' }
    const searchParams = { limit: '200' }

    await CommunicationAnalysisPage({
      params,
      searchParams,
    })

    // Should cap at 100
    expect(getCommunicationData).toHaveBeenCalledWith('user1', 'user2', {
      page: 1,
      limit: 100,
      conversationId: undefined,
    })
  })
})