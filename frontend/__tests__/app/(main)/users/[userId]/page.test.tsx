import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import UserDetailPage from '@/app/(main)/users/[userId]/page'
import * as apiClient from '@/lib/api-client'
import { notFound } from 'next/navigation'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  getUserDetail: vi.fn()
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  })
}))

// Mock the child components
vi.mock('@/components/user-profile-header', () => ({
  UserProfileHeader: ({ user }: any) => (
    <div data-testid="user-profile-header">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}))

vi.mock('@/components/user-stats-dashboard', () => ({
  UserStatsDashboard: ({ stats }: any) => (
    <div data-testid="user-stats-dashboard">
      <p>Messages: {stats.totalMessages}</p>
      <p>Conversations: {stats.totalConversations}</p>
    </div>
  )
}))

vi.mock('@/components/user-conversations-list', () => ({
  UserConversationsList: ({ conversations, userId }: any) => (
    <div data-testid="user-conversations-list">
      <p>User: {userId}</p>
      <p>Conversations count: {conversations.length}</p>
      {conversations.map((conv: any) => (
        <div key={conv.conversationId}>{conv.title}</div>
      ))}
    </div>
  )
}))

vi.mock('@/components/user-activity-timeline', () => ({
  UserActivityTimeline: ({ activities, userId }: any) => (
    <div data-testid="user-activity-timeline">
      <p>Activities count: {activities.length}</p>
      {activities.map((activity: any, index: number) => (
        <div key={index}>{activity.type}</div>
      ))}
    </div>
  )
}))

// Mock the Tabs components from shadcn/ui
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => <div data-testid="tabs" data-default={defaultValue}>{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-testid={`tab-trigger-${value}`}>{children}</button>,
  TabsContent: ({ children, value }: any) => <div data-testid={`tab-content-${value}`}>{children}</div>
}))

describe('UserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render user details successfully', async () => {
    const mockUserId = 'user-123'
    const mockUserData = {
      user: {
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Software Developer',
        status: 'online',
        lastSeen: '2025-01-14T10:00:00Z'
      },
      stats: {
        totalMessages: 150,
        totalConversations: 12,
        averageMessagesPerConversation: 12.5,
        mostActiveDay: 'Monday'
      },
      conversations: [
        {
          conversationId: 'conv-1',
          title: 'Project Discussion',
          type: 'group',
          lastMessageTimestamp: '2025-01-14T09:00:00Z',
          messageCount: 25
        }
      ],
      activityTimeline: [
        {
          type: 'message_sent',
          conversationId: 'conv-1',
          timestamp: '2025-01-14T09:00:00Z'
        }
      ]
    }

    vi.mocked(apiClient.getUserDetail).mockResolvedValue(mockUserData)

    const params = { userId: mockUserId }
    const searchParams = {}

    const Component = await UserDetailPage({ 
      params: Promise.resolve(params),
      searchParams: Promise.resolve(searchParams)
    })

    render(Component as any)

    // Check if main components are rendered
    expect(screen.getByTestId('user-profile-header')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()

    expect(screen.getByTestId('user-stats-dashboard')).toBeInTheDocument()
    expect(screen.getByText('Messages: 150')).toBeInTheDocument()
    expect(screen.getByText('Conversations: 12')).toBeInTheDocument()

    expect(screen.getByTestId('user-conversations-list')).toBeInTheDocument()
    expect(screen.getByText('User: user-123')).toBeInTheDocument()
    expect(screen.getByText('Project Discussion')).toBeInTheDocument()

    expect(screen.getByTestId('user-activity-timeline')).toBeInTheDocument()
    expect(screen.getByText('Activities count: 1')).toBeInTheDocument()
  })

  it('should call notFound when user does not exist', async () => {
    const mockUserId = 'non-existent-user'
    
    vi.mocked(apiClient.getUserDetail).mockResolvedValue(null)

    const params = { userId: mockUserId }
    const searchParams = {}

    await expect(
      UserDetailPage({ 
        params: Promise.resolve(params),
        searchParams: Promise.resolve(searchParams)
      })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(notFound).toHaveBeenCalledTimes(1)
  })

  it('should handle API errors gracefully', async () => {
    const mockUserId = 'user-123'
    const mockError = new Error('API Error')

    vi.mocked(apiClient.getUserDetail).mockRejectedValue(mockError)

    const params = { userId: mockUserId }
    const searchParams = {}

    await expect(
      UserDetailPage({ 
        params: Promise.resolve(params),
        searchParams: Promise.resolve(searchParams)
      })
    ).rejects.toThrow('API Error')
  })

  it('should handle empty conversations list', async () => {
    const mockUserId = 'user-456'
    const mockUserData = {
      user: {
        userId: 'user-456',
        name: 'Jane Smith',
        email: 'jane@example.com'
      },
      stats: {
        totalMessages: 0,
        totalConversations: 0
      },
      conversations: [],
      activityTimeline: []
    }

    vi.mocked(apiClient.getUserDetail).mockResolvedValue(mockUserData)

    const params = { userId: mockUserId }
    const searchParams = {}

    const Component = await UserDetailPage({ 
      params: Promise.resolve(params),
      searchParams: Promise.resolve(searchParams)
    })

    render(Component as any)

    expect(screen.getByTestId('user-conversations-list')).toBeInTheDocument()
    expect(screen.getByText('Conversations count: 0')).toBeInTheDocument()
    expect(screen.getByText('Activities count: 0')).toBeInTheDocument()
  })

  it('should handle searchParams for navigation context', async () => {
    const mockUserId = 'user-789'
    const mockUserData = {
      user: {
        userId: 'user-789',
        name: 'Bob Johnson',
        email: 'bob@example.com'
      },
      stats: {
        totalMessages: 50,
        totalConversations: 5
      },
      conversations: [],
      activityTimeline: []
    }

    vi.mocked(apiClient.getUserDetail).mockResolvedValue(mockUserData)

    const params = { userId: mockUserId }
    const searchParams = { from: '2' } // Coming from page 2 of user list

    const Component = await UserDetailPage({ 
      params: Promise.resolve(params),
      searchParams: Promise.resolve(searchParams)
    })

    render(Component as any)

    expect(screen.getByTestId('user-profile-header')).toBeInTheDocument()
    expect(apiClient.getUserDetail).toHaveBeenCalledWith(mockUserId)
  })

  it('should validate userId parameter', async () => {
    const params = { userId: '' }
    const searchParams = {}

    await expect(
      UserDetailPage({ 
        params: Promise.resolve(params),
        searchParams: Promise.resolve(searchParams)
      })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(notFound).toHaveBeenCalledTimes(1)
    expect(apiClient.getUserDetail).not.toHaveBeenCalled()
  })

  it('should handle special characters in userId', async () => {
    const mockUserId = 'user-123@test.com'
    const mockUserData = {
      user: {
        userId: mockUserId,
        name: 'Special User',
        email: 'special@example.com'
      },
      stats: {
        totalMessages: 10,
        totalConversations: 1
      },
      conversations: [],
      activityTimeline: []
    }

    vi.mocked(apiClient.getUserDetail).mockResolvedValue(mockUserData)

    const params = { userId: mockUserId }
    const searchParams = {}

    const Component = await UserDetailPage({ 
      params: Promise.resolve(params),
      searchParams: Promise.resolve(searchParams)
    })

    render(Component as any)

    expect(screen.getByText('Special User')).toBeInTheDocument()
    expect(apiClient.getUserDetail).toHaveBeenCalledWith(mockUserId)
  })
})