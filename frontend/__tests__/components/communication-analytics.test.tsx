import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { CommunicationAnalytics } from '@/components/communication-analytics'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { UserCommunicationData, UserSummary } from '@/lib/neo4j'

// Mock the Tabs components from shadcn/ui to make them testable
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => {
    const [activeTab, setActiveTab] = React.useState(defaultValue)
    return (
      <div data-testid="tabs" data-active-tab={activeTab}>
        {React.Children.map(children, child => 
          React.cloneElement(child, { activeTab, setActiveTab })
        )}
      </div>
    )
  },
  TabsList: ({ children, setActiveTab }: any) => (
    <div role="tablist">
      {React.Children.map(children, child => 
        React.cloneElement(child, { setActiveTab })
      )}
    </div>
  ),
  TabsTrigger: ({ children, value, setActiveTab }: any) => (
    <button role="tab" onClick={() => setActiveTab(value)}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value, activeTab }: any) => 
    activeTab === value ? <div>{children}</div> : null
}))

// Mock the child components to focus on testing CommunicationAnalytics
vi.mock('@/components/charts/frequency-chart', () => ({
  FrequencyChart: vi.fn(({ user1, user2, dateRange, granularity }) => (
    <div data-testid="frequency-chart">
      FrequencyChart - {user1.name} - {user2.name} - {granularity}
    </div>
  ))
}))

vi.mock('@/components/charts/talk-listen-ratio', () => ({
  TalkListenRatio: vi.fn(({ user1, user2, user1Messages, user2Messages }) => (
    <div data-testid="talk-listen-ratio">
      TalkListenRatio - {user1.name}: {user1Messages} - {user2.name}: {user2Messages}
    </div>
  ))
}))

vi.mock('@/components/charts/response-time-chart', () => ({
  ResponseTimeChart: vi.fn(({ responseTimeData, isLoading }) => (
    <div data-testid="response-time-chart">
      ResponseTimeChart - Loading: {isLoading ? 'true' : 'false'}
      {responseTimeData && ` - Avg: ${responseTimeData.avgResponseTime}`}
    </div>
  ))
}))

vi.mock('@/components/charts/activity-heatmap', () => ({
  ActivityHeatmap: vi.fn(({ heatmapData, isLoading }) => (
    <div data-testid="activity-heatmap">
      ActivityHeatmap - Loading: {isLoading ? 'true' : 'false'}
      {heatmapData && ` - Data points: ${heatmapData.length}`}
    </div>
  ))
}))

vi.mock('@/components/charts/conversation-type-pie', () => ({
  ConversationTypePie: vi.fn(({ conversations }) => (
    <div data-testid="conversation-type-pie">
      ConversationTypePie - Conversations: {conversations.length}
    </div>
  ))
}))

vi.mock('@/components/date-range-filter', () => ({
  DateRangeFilter: vi.fn(() => (
    <div data-testid="date-range-filter">DateRangeFilter</div>
  ))
}))

vi.mock('@/components/export-dropdown', () => ({
  ExportDropdown: vi.fn(({ data, filename }) => (
    <div data-testid="export-dropdown">
      ExportDropdown - {filename}
    </div>
  ))
}))

vi.mock('@/components/message-type-filter', () => ({
  MessageTypeFilter: vi.fn(() => (
    <div data-testid="message-type-filter">MessageTypeFilter</div>
  ))
}))

// Mock the API client
const mockFetchAggregatedData = vi.fn()
vi.mock('@/lib/api-client', () => ({
  fetchAggregatedData: (...args: any[]) => mockFetchAggregatedData(...args)
}))

describe('CommunicationAnalytics', () => {
  const mockUser1: UserSummary = {
    userId: 'user-1',
    name: 'Alice',
    username: 'alice',
    email: 'alice@example.com',
    avatarUrl: 'https://example.com/alice.jpg'
  }

  const mockUser2: UserSummary = {
    userId: 'user-2',
    name: 'Bob',
    username: 'bob',
    email: 'bob@example.com',
    avatarUrl: 'https://example.com/bob.jpg'
  }

  const mockData: UserCommunicationData = {
    user1: mockUser1,
    user2: mockUser2,
    communicationStats: {
      totalMessages: 150,
      totalSharedConversations: 5,
      firstInteraction: '2024-01-01T10:00:00Z',
      lastInteraction: '2024-03-15T14:30:00Z',
      user1Messages: 80,
      user2Messages: 70
    },
    sharedConversations: [
      {
        conversationId: 'conv-1',
        title: 'Project Discussion',
        type: 'group',
        createdAt: '2024-01-01T10:00:00Z',
        lastMessageTimestamp: '2024-03-15T14:30:00Z',
        lastMessagePreview: 'Latest message',
        participantCount: 3,
        priority: 'normal',
        tags: ['work']
      },
      {
        conversationId: 'conv-2',
        title: 'Direct Chat',
        type: 'direct',
        createdAt: '2024-02-01T10:00:00Z',
        lastMessageTimestamp: '2024-03-10T12:00:00Z',
        lastMessagePreview: 'Hello',
        participantCount: 2,
        priority: 'normal',
        tags: []
      }
    ]
  }

  const mockAnalyticsData = {
    frequency: [
      { date: '2024-01-01', totalMessages: 10, user1Messages: 6, user2Messages: 4 },
      { date: '2024-01-02', totalMessages: 12, user1Messages: 7, user2Messages: 5 }
    ],
    responseTime: {
      avgResponseTime: 3600000,
      medianResponseTime: 1800000,
      distribution: [
        { range: '<1h', count: 5 },
        { range: '1-6h', count: 3 }
      ]
    },
    activityHeatmap: [
      { hour: 9, dayOfWeek: 1, messageCount: 10 },
      { hour: 14, dayOfWeek: 2, messageCount: 15 }
    ],
    talkToListenRatio: {
      user1Messages: 80,
      user2Messages: 70,
      user1Percentage: 53.33,
      user2Percentage: 46.67
    },
    conversationTypes: [
      { type: 'group', count: 3, percentage: 60 },
      { type: 'direct', count: 2, percentage: 40 }
    ]
  }

  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 }
      }
    })
    mockFetchAggregatedData.mockResolvedValue(mockAnalyticsData)
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CommunicationAnalytics
          data={mockData}
          user1={mockUser1}
          user2={mockUser2}
        />
      </QueryClientProvider>
    )
  }

  it('should render the component with all sections', () => {
    renderComponent()

    // Check main controls are rendered
    expect(screen.getByTestId('date-range-filter')).toBeInTheDocument()
    expect(screen.getByTestId('message-type-filter')).toBeInTheDocument()
    expect(screen.getByTestId('export-dropdown')).toBeInTheDocument()
    
    // Check granularity selector
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Daily')).toBeInTheDocument()

    // Check tabs are rendered
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Frequency' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Patterns' })).toBeInTheDocument()
  })

  it('should display overview statistics correctly', () => {
    renderComponent()

    // Check overview stats cards
    expect(screen.getByText('Total Messages')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    
    expect(screen.getByText('Shared Conversations')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    
    expect(screen.getByText('First Interaction')).toBeInTheDocument()
    expect(screen.getByText('1/1/2024')).toBeInTheDocument()
    
    expect(screen.getByText('Last Interaction')).toBeInTheDocument()
    expect(screen.getByText('3/15/2024')).toBeInTheDocument()
  })

  it('should render charts with correct data', async () => {
    renderComponent()

    await waitFor(() => {
      // Check that TalkListenRatio receives correct props
      const talkListenRatio = screen.getByTestId('talk-listen-ratio')
      expect(talkListenRatio).toHaveTextContent('Alice: 80')
      expect(talkListenRatio).toHaveTextContent('Bob: 70')

      // Check ConversationTypePie receives correct data
      const conversationPie = screen.getByTestId('conversation-type-pie')
      expect(conversationPie).toHaveTextContent('Conversations: 2')
    })
  })

  it('should switch between tabs correctly', async () => {
    renderComponent()

    // Initially on Overview tab
    expect(screen.getByTestId('talk-listen-ratio')).toBeInTheDocument()
    expect(screen.getByTestId('conversation-type-pie')).toBeInTheDocument()

    // Click on Frequency tab
    const frequencyTab = screen.getByRole('tab', { name: 'Frequency' })
    fireEvent.click(frequencyTab)

    // Wait for the tab content to change
    await waitFor(() => {
      expect(screen.getByText('Message Frequency Over Time')).toBeInTheDocument()
    })
    
    // Now the frequency chart should be visible
    expect(screen.getByTestId('frequency-chart')).toBeInTheDocument()

    // Click on Patterns tab  
    const patternsTab = screen.getByRole('tab', { name: 'Patterns' })
    fireEvent.click(patternsTab)

    // Wait for the tab content to change
    await waitFor(() => {
      expect(screen.getByText('Response Time Analysis')).toBeInTheDocument()
    })
    
    // Now the pattern charts should be visible
    expect(screen.getByTestId('response-time-chart')).toBeInTheDocument()
    expect(screen.getByTestId('activity-heatmap')).toBeInTheDocument()
    expect(screen.getByText('Activity Heatmap')).toBeInTheDocument()
  })

  it('should handle granularity changes', async () => {
    renderComponent()

    const granularitySelect = screen.getByRole('combobox')
    
    // Change to weekly
    fireEvent.change(granularitySelect, { target: { value: 'weekly' } })
    expect(granularitySelect).toHaveValue('weekly')

    // Change to monthly
    fireEvent.change(granularitySelect, { target: { value: 'monthly' } })
    expect(granularitySelect).toHaveValue('monthly')

    // Switch to frequency tab to see the effect
    const frequencyTab = screen.getByRole('tab', { name: 'Frequency' })
    fireEvent.click(frequencyTab)

    // Wait for tab content to load
    await waitFor(() => {
      expect(screen.getByText('Message Frequency Over Time')).toBeInTheDocument()
    })
    
    // Now check the frequency chart content
    const frequencyChart = screen.getByTestId('frequency-chart')
    expect(frequencyChart).toHaveTextContent('monthly')
  })

  it('should fetch aggregated data with correct parameters', async () => {
    renderComponent()

    await waitFor(() => {
      expect(mockFetchAggregatedData).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        expect.objectContaining({
          from: expect.any(Date),
          to: expect.any(Date)
        }),
        'daily'
      )
    })
  })

  it('should handle missing first and last interaction dates', () => {
    const dataWithoutDates = {
      ...mockData,
      communicationStats: {
        ...mockData.communicationStats,
        firstInteraction: null,
        lastInteraction: null
      }
    }

    render(
      <QueryClientProvider client={queryClient}>
        <CommunicationAnalytics
          data={dataWithoutDates}
          user1={mockUser1}
          user2={mockUser2}
        />
      </QueryClientProvider>
    )

    // Check that N/A is displayed for missing dates
    const firstInteractionCard = screen.getByText('First Interaction').parentElement?.parentElement
    expect(firstInteractionCard).toHaveTextContent('N/A')
    
    const lastInteractionCard = screen.getByText('Last Interaction').parentElement?.parentElement
    expect(lastInteractionCard).toHaveTextContent('N/A')
  })

  it('should pass analytics data to response time and activity charts', async () => {
    renderComponent()

    // Switch to patterns tab
    const patternsTab = screen.getByRole('tab', { name: 'Patterns' })
    fireEvent.click(patternsTab)

    // Wait for tab content to load
    await waitFor(() => {
      expect(screen.getByText('Response Time Analysis')).toBeInTheDocument()
    })
    
    // Now check the chart contents
    const responseTimeChart = screen.getByTestId('response-time-chart')
    expect(responseTimeChart).toHaveTextContent('Loading: false')
    expect(responseTimeChart).toHaveTextContent('Avg: 3600000')

    const activityHeatmap = screen.getByTestId('activity-heatmap')
    expect(activityHeatmap).toHaveTextContent('Loading: false')
    expect(activityHeatmap).toHaveTextContent('Data points: 2')
  })

  it('should show loading state when analytics data is not available', async () => {
    mockFetchAggregatedData.mockReturnValue(new Promise(() => {})) // Never resolves

    renderComponent()

    // Switch to patterns tab
    const patternsTab = screen.getByRole('tab', { name: 'Patterns' })
    fireEvent.click(patternsTab)

    // Wait for tab content to appear
    await waitFor(() => {
      expect(screen.getByText('Response Time Analysis')).toBeInTheDocument()
    })
    
    // Charts should show loading state
    const responseTimeChart = screen.getByTestId('response-time-chart')
    expect(responseTimeChart).toHaveTextContent('Loading: true')

    const activityHeatmap = screen.getByTestId('activity-heatmap')
    expect(activityHeatmap).toHaveTextContent('Loading: true')
  })

  it('should generate correct filename for export', () => {
    renderComponent()

    const exportDropdown = screen.getByTestId('export-dropdown')
    // The mock includes "ExportDropdown - " prefix, so check the actual text content
    const textContent = exportDropdown.textContent || ''
    expect(textContent).toMatch(/communication-user-1-user-2-\d{4}-\d{2}-\d{2}/)
  })

  it('should use analytics data for talk-listen ratio when available', async () => {
    renderComponent()

    await waitFor(() => {
      const talkListenRatio = screen.getByTestId('talk-listen-ratio')
      // Should use analytics data (80, 70) instead of basic stats
      expect(talkListenRatio).toHaveTextContent('Alice: 80')
      expect(talkListenRatio).toHaveTextContent('Bob: 70')
    })
  })
})