import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserStatsDashboard } from '@/components/user-stats-dashboard'

// Mock icons from lucide-react
vi.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="message-icon">MessageCircle</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  TrendingUp: () => <div data-testid="trending-icon">TrendingUp</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Activity: () => <div data-testid="activity-icon">Activity</div>
}))

describe('UserStatsDashboard', () => {
  const mockStats = {
    totalMessages: 1500,
    totalConversations: 25,
    averageMessagesPerConversation: 60,
    mostActiveDay: 'Monday',
    firstActivity: '2024-01-01T08:00:00Z',
    lastActivity: '2025-01-14T10:00:00Z',
    messagesByDay: {
      Monday: 350,
      Tuesday: 280,
      Wednesday: 220,
      Thursday: 300,
      Friday: 250,
      Saturday: 50,
      Sunday: 50
    }
  }

  it('should render all statistics correctly', () => {
    render(<UserStatsDashboard stats={mockStats} />)

    // Check main stats
    expect(screen.getByText('Total Messages')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()

    expect(screen.getByText('Total Conversations')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()

    expect(screen.getByText('Avg Messages/Conversation')).toBeInTheDocument()
    expect(screen.getByText('60')).toBeInTheDocument()

    expect(screen.getByText('Most Active Day')).toBeInTheDocument()
    expect(screen.getByText('Monday')).toBeInTheDocument()
  })

  it('should render activity period correctly', () => {
    render(<UserStatsDashboard stats={mockStats} />)

    expect(screen.getByText('First Activity')).toBeInTheDocument()
    expect(screen.getByText('Jan 01, 2024')).toBeInTheDocument()

    expect(screen.getByText('Last Activity')).toBeInTheDocument()
    expect(screen.getByText('Jan 14, 2025')).toBeInTheDocument()
  })

  it('should handle zero statistics gracefully', () => {
    const zeroStats = {
      totalMessages: 0,
      totalConversations: 0,
      averageMessagesPerConversation: 0,
      mostActiveDay: null,
      firstActivity: null,
      lastActivity: null,
      messagesByDay: {}
    }

    render(<UserStatsDashboard stats={zeroStats} />)

    // Check that zeros are displayed for counts
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(3) // At least totalMessages, totalConversations, average

    // Most active day should show N/A - but there might be multiple N/A elements
    const naElements = screen.getAllByText('N/A')
    expect(naElements.length).toBeGreaterThanOrEqual(1) // At least one N/A
    
    expect(screen.getAllByText('Never')).toHaveLength(2) // First and last activity
  })

  it('should format large numbers with commas', () => {
    const largeStats = {
      ...mockStats,
      totalMessages: 1234567,
      totalConversations: 9876
    }

    render(<UserStatsDashboard stats={largeStats} />)

    expect(screen.getByText('1,234,567')).toBeInTheDocument()
    expect(screen.getByText('9,876')).toBeInTheDocument()
  })

  it('should calculate and display percentage changes', () => {
    render(<UserStatsDashboard stats={mockStats} />)

    // Should show trend indicators
    const trendingIcons = screen.getAllByTestId('trending-icon')
    expect(trendingIcons.length).toBeGreaterThan(0)
  })

  it('should render activity chart for messages by day', () => {
    render(<UserStatsDashboard stats={mockStats} />)

    // Check if day labels are rendered
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()

    // Check if chart bars are rendered
    const chartBars = screen.getAllByTestId(/chart-bar-/)
    expect(chartBars).toHaveLength(7)
  })

  it('should handle missing messagesByDay data', () => {
    const statsWithoutDayData = {
      ...mockStats,
      messagesByDay: undefined
    }

    render(<UserStatsDashboard stats={statsWithoutDayData} />)

    // Should still render without crashing
    expect(screen.getByText('Total Messages')).toBeInTheDocument()
  })

  it('should display activity duration', () => {
    render(<UserStatsDashboard stats={mockStats} />)

    expect(screen.getByText('Activity Duration')).toBeInTheDocument()
    expect(screen.getByText(/1 year/)).toBeInTheDocument() // Approximate duration
  })

  it('should handle same day first and last activity', () => {
    const sameDayStats = {
      ...mockStats,
      firstActivity: '2025-01-14T08:00:00Z',
      lastActivity: '2025-01-14T18:00:00Z'
    }

    render(<UserStatsDashboard stats={sameDayStats} />)

    expect(screen.getByText('Activity Duration')).toBeInTheDocument()
    expect(screen.getByText('1 day')).toBeInTheDocument()
  })

  it('should render stat cards with appropriate icons', () => {
    render(<UserStatsDashboard stats={mockStats} />)

    expect(screen.getByTestId('message-icon')).toBeInTheDocument()
    expect(screen.getByTestId('users-icon')).toBeInTheDocument()
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument()
    // There are multiple clock icons, so check for at least one
    const clockIcons = screen.getAllByTestId('clock-icon')
    expect(clockIcons.length).toBeGreaterThanOrEqual(1)
  })

  it('should apply custom className if provided', () => {
    const { container } = render(
      <UserStatsDashboard stats={mockStats} className="custom-dashboard" />
    )

    const dashboard = container.firstChild
    expect(dashboard).toHaveClass('custom-dashboard')
  })

  it('should calculate average correctly with edge cases', () => {
    const edgeCaseStats = {
      ...mockStats,
      totalMessages: 1,
      totalConversations: 1,
      averageMessagesPerConversation: 1
    }

    render(<UserStatsDashboard stats={edgeCaseStats} />)

    expect(screen.getByText('Avg Messages/Conversation')).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(3)
  })

  it('should highlight most active day', () => {
    render(<UserStatsDashboard stats={mockStats} />)

    const mondayBar = screen.getByTestId('chart-bar-Monday')
    expect(mondayBar).toHaveClass('bg-primary') // Highlighted color
  })

  it('should show relative bar heights in activity chart', () => {
    render(<UserStatsDashboard stats={mockStats} />)

    const mondayBar = screen.getByTestId('chart-bar-Monday')
    const saturdayBar = screen.getByTestId('chart-bar-Saturday')

    // Monday should be taller than Saturday (350 vs 50 messages)
    const mondayHeight = mondayBar.style.height
    const saturdayHeight = saturdayBar.style.height

    expect(parseInt(mondayHeight)).toBeGreaterThan(parseInt(saturdayHeight))
  })

  it('should handle decimal averages', () => {
    const decimalStats = {
      ...mockStats,
      averageMessagesPerConversation: 12.567
    }

    render(<UserStatsDashboard stats={decimalStats} />)

    expect(screen.getByText('12.6')).toBeInTheDocument() // Rounded to 1 decimal
  })

  it('should render loading skeleton when stats are undefined', () => {
    render(<UserStatsDashboard stats={undefined} />)

    const skeletons = screen.getAllByTestId('skeleton-loader')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should format dates in user-friendly format', () => {
    render(<UserStatsDashboard stats={mockStats} />)

    // Dates should be formatted nicely
    expect(screen.queryByText('2024-01-01T08:00:00Z')).not.toBeInTheDocument()
    expect(screen.queryByText('2025-01-14T10:00:00Z')).not.toBeInTheDocument()
    
    // Instead, formatted dates should appear (checking for the actual formatted dates)
    expect(screen.getByText('Jan 01, 2024')).toBeInTheDocument()
    expect(screen.getByText('Jan 14, 2025')).toBeInTheDocument()
  })
})