import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { FrequencyChart } from '@/components/charts/frequency-chart'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import * as apiClient from '@/lib/api-client'

vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  )
  const MockLineChart = ({ children, data }: { children: React.ReactNode, data: any[] }) => (
    <div data-testid="line-chart" data-point-count={data.length}>{children}</div>
  )
  const MockLine = ({ dataKey, name, stroke }: { dataKey: string, name: string, stroke: string }) => (
    <div data-testid={`line-${dataKey}`} data-name={name} data-stroke={stroke} />
  )
  const MockXAxis = ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-key={dataKey} />
  )
  const MockYAxis = () => <div data-testid="y-axis" />
  const MockCartesianGrid = () => <div data-testid="cartesian-grid" />
  const MockTooltip = () => <div data-testid="tooltip" />
  const MockLegend = () => <div data-testid="legend" />

  return {
    ResponsiveContainer: MockResponsiveContainer,
    LineChart: MockLineChart,
    Line: MockLine,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    CartesianGrid: MockCartesianGrid,
    Tooltip: MockTooltip,
    Legend: MockLegend
  }
})

vi.mock('@/lib/api-client')

describe('FrequencyChart', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  const mockUser1 = {
    userId: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: null,
    conversationCount: 10,
    messageCount: 100,
    lastActiveTimestamp: '2024-01-15T10:00:00Z'
  }

  const mockUser2 = {
    userId: 'user-456',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: null,
    conversationCount: 10,
    messageCount: 80,
    lastActiveTimestamp: '2024-01-15T09:00:00Z'
  }

  const mockFrequencyData = {
    frequency: [
      { date: '2024-01-01', totalMessages: 100, user1Messages: 60, user2Messages: 40 },
      { date: '2024-01-02', totalMessages: 120, user1Messages: 70, user2Messages: 50 },
      { date: '2024-01-03', totalMessages: 80, user1Messages: 30, user2Messages: 50 },
      { date: '2024-01-04', totalMessages: 150, user1Messages: 90, user2Messages: 60 },
      { date: '2024-01-05', totalMessages: 110, user1Messages: 55, user2Messages: 55 }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  describe('Data Loading', () => {
    it('should show loading skeleton while fetching data', () => {
      (apiClient.fetchAggregatedData as vi.Mock).mockImplementation(
        () => new Promise(() => {})
      )

      render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-05') }}
          granularity="daily"
        />,
        { wrapper }
      )

      expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument()
    })

    it('should render chart after data loads', async () => {
      (apiClient.fetchAggregatedData as vi.Mock).mockResolvedValueOnce(mockFrequencyData)

      render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-05') }}
          granularity="daily"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-point-count', '5')
    })

    it('should handle empty data gracefully', async () => {
      (apiClient.fetchAggregatedData as vi.Mock).mockResolvedValueOnce({ frequency: [] })

      render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-05') }}
          granularity="daily"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(screen.getByText('No data available for the selected range')).toBeInTheDocument()
      })
    })

    it('should handle fetch errors gracefully', async () => {
      (apiClient.fetchAggregatedData as vi.Mock).mockRejectedValueOnce(new Error('Failed to fetch'))

      render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-05') }}
          granularity="daily"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(screen.getByText(/Failed to load chart data/i)).toBeInTheDocument()
      })
    })
  })

  describe('Chart Rendering', () => {
    beforeEach(async () => {
      (apiClient.fetchAggregatedData as vi.Mock).mockResolvedValue(mockFrequencyData)
    })

    it('should render all chart components', async () => {
      render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-05') }}
          granularity="daily"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(screen.getByTestId('y-axis')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('legend')).toBeInTheDocument()
    })

    it('should render three lines with correct properties', async () => {
      render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-05') }}
          granularity="daily"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      const totalLine = screen.getByTestId('line-totalMessages')
      expect(totalLine).toHaveAttribute('data-name', 'Total')
      expect(totalLine).toHaveAttribute('data-stroke', '#8884d8')

      const user1Line = screen.getByTestId('line-user1Messages')
      expect(user1Line).toHaveAttribute('data-name', 'John Doe')
      expect(user1Line).toHaveAttribute('data-stroke', '#82ca9d')

      const user2Line = screen.getByTestId('line-user2Messages')
      expect(user2Line).toHaveAttribute('data-name', 'Jane Smith')
      expect(user2Line).toHaveAttribute('data-stroke', '#ffc658')
    })
  })

  describe('Granularity Support', () => {
    it('should fetch daily data', async () => {
      (apiClient.fetchAggregatedData as vi.Mock).mockResolvedValueOnce(mockFrequencyData)

      render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-05') }}
          granularity="daily"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(apiClient.fetchAggregatedData).toHaveBeenCalledWith(
          'user-123',
          'user-456',
          { from: new Date('2024-01-01'), to: new Date('2024-01-05') },
          'daily'
        )
      })
    })

    it('should fetch weekly data', async () => {
      (apiClient.fetchAggregatedData as vi.Mock).mockResolvedValueOnce({
        frequency: [
          { date: 'Week 1', totalMessages: 500, user1Messages: 300, user2Messages: 200 },
          { date: 'Week 2', totalMessages: 600, user1Messages: 350, user2Messages: 250 }
        ]
      })

      render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-14') }}
          granularity="weekly"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(apiClient.fetchAggregatedData).toHaveBeenCalledWith(
          'user-123',
          'user-456',
          { from: new Date('2024-01-01'), to: new Date('2024-01-14') },
          'weekly'
        )
      })
    })

    it('should fetch monthly data', async () => {
      (apiClient.fetchAggregatedData as vi.Mock).mockResolvedValueOnce({
        frequency: [
          { date: 'Jan 2024', totalMessages: 2000, user1Messages: 1200, user2Messages: 800 },
          { date: 'Feb 2024', totalMessages: 2500, user1Messages: 1400, user2Messages: 1100 }
        ]
      })

      render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-02-29') }}
          granularity="monthly"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(apiClient.fetchAggregatedData).toHaveBeenCalledWith(
          'user-123',
          'user-456',
          { from: new Date('2024-01-01'), to: new Date('2024-02-29') },
          'monthly'
        )
      })
    })
  })

  describe('Caching', () => {
    it('should cache data for 5 minutes', async () => {
      (apiClient.fetchAggregatedData as vi.Mock).mockResolvedValue(mockFrequencyData)

      const { rerender } = render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-05') }}
          granularity="daily"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(apiClient.fetchAggregatedData).toHaveBeenCalledTimes(1)
      })

      rerender(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-05') }}
          granularity="daily"
        />
      )

      expect(apiClient.fetchAggregatedData).toHaveBeenCalledTimes(1)
    })

    it('should refetch when parameters change', async () => {
      (apiClient.fetchAggregatedData as vi.Mock).mockResolvedValue(mockFrequencyData)

      const { rerender } = render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-05') }}
          granularity="daily"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(apiClient.fetchAggregatedData).toHaveBeenCalledTimes(1)
      })

      rerender(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-06'), to: new Date('2024-01-10') }}
          granularity="daily"
        />
      )

      await waitFor(() => {
        expect(apiClient.fetchAggregatedData).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible chart description', async () => {
      (apiClient.fetchAggregatedData as vi.Mock).mockResolvedValueOnce(mockFrequencyData)

      render(
        <FrequencyChart
          user1={mockUser1}
          user2={mockUser2}
          dateRange={{ from: new Date('2024-01-01'), to: new Date('2024-01-05') }}
          granularity="daily"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/Message frequency chart/i)).toBeInTheDocument()
    })
  })
})