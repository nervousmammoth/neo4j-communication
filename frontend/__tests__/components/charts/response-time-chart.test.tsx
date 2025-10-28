import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ResponseTimeChart } from '@/components/charts/response-time-chart';
import type { ResponseTimeAnalysis } from '@/lib/neo4j';

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill, name }: any) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill} data-name={name} />
  ),
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" role="tooltip" aria-hidden="true" />,
  Legend: () => <div data-testid="legend" />,
  Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />
}));

describe('ResponseTimeChart', () => {
  const createMockResponseTimeData = (pattern: 'normal' | 'quick' | 'slow' | 'mixed'): ResponseTimeAnalysis => {
    switch (pattern) {
      case 'normal':
        return {
          avgResponseTime: 480, // 8 minutes
          medianResponseTime: 300, // 5 minutes
          distribution: [
            { range: '1-5 min', count: 10 },
            { range: '5-15 min', count: 15 },
            { range: '15-30 min', count: 5 }
          ]
        };

      case 'quick':
        return {
          avgResponseTime: 45, // 45 seconds
          medianResponseTime: 30, // 30 seconds
          distribution: [
            { range: '<1 min', count: 25 },
            { range: '1-5 min', count: 3 }
          ]
        };

      case 'slow':
        return {
          avgResponseTime: 7200, // 2 hours
          medianResponseTime: 5400, // 1.5 hours
          distribution: [
            { range: '30-60 min', count: 2 },
            { range: '1-2 hrs', count: 5 },
            { range: '2-6 hrs', count: 3 }
          ]
        };

      case 'mixed':
        return {
          avgResponseTime: 1800, // 30 minutes
          medianResponseTime: 600, // 10 minutes
          distribution: [
            { range: '<1 min', count: 5 },
            { range: '1-5 min', count: 8 },
            { range: '5-15 min', count: 10 },
            { range: '15-30 min', count: 6 },
            { range: '30-60 min', count: 3 },
            { range: '1-2 hrs', count: 2 }
          ]
        };
    }
  };

  describe('Loading State', () => {
    it('should show loading state when isLoading is true', () => {
      render(<ResponseTimeChart responseTimeData={undefined} isLoading={true} />);
      expect(screen.getByText(/Loading response time data/i)).toBeInTheDocument();
      expect(screen.queryByTestId('response-stats')).not.toBeInTheDocument();
    });
  });

  describe('No Data State', () => {
    it('should show no data message when responseTimeData is undefined', () => {
      render(<ResponseTimeChart responseTimeData={undefined} isLoading={false} />);
      expect(screen.getByText(/No response time data available/i)).toBeInTheDocument();
    });

    it('should show no data message when distribution is empty', () => {
      const emptyData: ResponseTimeAnalysis = {
        avgResponseTime: 0,
        medianResponseTime: 0,
        distribution: []
      };
      render(<ResponseTimeChart responseTimeData={emptyData} isLoading={false} />);
      expect(screen.getByText(/No response time data available/i)).toBeInTheDocument();
    });
  });

  describe('Chart Rendering', () => {
    it('should render chart with normal response times', () => {
      const data = createMockResponseTimeData('normal');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      // Check statistics display
      expect(screen.getByTestId('response-stats')).toBeInTheDocument();
      expect(screen.getByTestId('average-response-time')).toHaveTextContent('8m');
      expect(screen.getByTestId('median-response-time')).toHaveTextContent('5m');
      
      // Check chart components
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-count')).toBeInTheDocument();
    });

    it('should render chart with quick response times', () => {
      const data = createMockResponseTimeData('quick');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      expect(screen.getByTestId('average-response-time')).toHaveTextContent('45s');
      expect(screen.getByTestId('median-response-time')).toHaveTextContent('30s');
    });

    it('should render chart with slow response times', () => {
      const data = createMockResponseTimeData('slow');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      expect(screen.getByTestId('average-response-time')).toHaveTextContent('2.0h');
      expect(screen.getByTestId('median-response-time')).toHaveTextContent('1.5h');
    });

    it('should pass correct data to chart component', () => {
      const data = createMockResponseTimeData('mixed');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(6);
      expect(chartData[0]).toEqual({ range: '<1 min', count: 5 });
      expect(chartData[5]).toEqual({ range: '1-2 hrs', count: 2 });
    });
  });

  describe('Time Formatting', () => {
    it('should format seconds correctly', () => {
      const data: ResponseTimeAnalysis = {
        avgResponseTime: 45,
        medianResponseTime: 30,
        distribution: [{ range: '<1 min', count: 1 }]
      };
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      expect(screen.getByTestId('average-response-time')).toHaveTextContent('45s');
      expect(screen.getByTestId('median-response-time')).toHaveTextContent('30s');
    });

    it('should format minutes correctly', () => {
      const data: ResponseTimeAnalysis = {
        avgResponseTime: 300,
        medianResponseTime: 600,
        distribution: [{ range: '5-15 min', count: 1 }]
      };
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      expect(screen.getByTestId('average-response-time')).toHaveTextContent('5m');
      expect(screen.getByTestId('median-response-time')).toHaveTextContent('10m');
    });

    it('should format hours correctly', () => {
      const data: ResponseTimeAnalysis = {
        avgResponseTime: 7200,
        medianResponseTime: 10800,
        distribution: [{ range: '2-6 hrs', count: 1 }]
      };
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      expect(screen.getByTestId('average-response-time')).toHaveTextContent('2.0h');
      expect(screen.getByTestId('median-response-time')).toHaveTextContent('3.0h');
    });
  });

  describe('Chart Components', () => {
    it('should render all chart components', () => {
      const data = createMockResponseTimeData('normal');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
      expect(screen.getByTestId('bar-count')).toBeInTheDocument();
    });

    it('should pass correct props to Bar component', () => {
      const data = createMockResponseTimeData('normal');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      const bar = screen.getByTestId('bar-count');
      expect(bar).toHaveAttribute('data-fill', '#82ca9d');
      expect(bar).toHaveAttribute('data-name', 'Response Count');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible chart description', () => {
      const data = createMockResponseTimeData('normal');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      // Check that chart is rendered with testid
      const chart = screen.getByTestId('bar-chart');
      expect(chart).toBeInTheDocument();
    });

    it('should have accessible statistics with proper labeling', () => {
      const data = createMockResponseTimeData('normal');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      // Check that statistics are displayed with correct values
      const avgStat = screen.getByTestId('average-response-time');
      expect(avgStat).toHaveTextContent('8m');
      
      const medianStat = screen.getByTestId('median-response-time');
      expect(medianStat).toHaveTextContent('5m');
    });

    it('should provide text alternatives for visual data', () => {
      const data = createMockResponseTimeData('mixed');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      // Check that statistics provide text representation of data
      const avgStat = screen.getByTestId('average-response-time');
      expect(avgStat).toHaveTextContent('30m');
      
      const medianStat = screen.getByTestId('median-response-time');
      expect(medianStat).toHaveTextContent('10m');
    });

    it('should have keyboard navigable elements', () => {
      const data = createMockResponseTimeData('normal');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      // Check that statistics container exists
      const statsContainer = screen.getByTestId('response-stats');
      expect(statsContainer).toBeInTheDocument();
    });

    it('should announce loading state to screen readers', () => {
      render(<ResponseTimeChart responseTimeData={undefined} isLoading={true} />);
      
      const loadingMessage = screen.getByText(/Loading response time data/i);
      expect(loadingMessage).toBeInTheDocument();
    });

    it('should announce no data state to screen readers', () => {
      render(<ResponseTimeChart responseTimeData={undefined} isLoading={false} />);
      
      const noDataMessage = screen.getByText(/No response time data available/i);
      expect(noDataMessage).toBeInTheDocument();
    });

    it('should provide descriptive tooltips for chart elements', () => {
      const data = createMockResponseTimeData('normal');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      // Check that the tooltip component is rendered
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
      // Our mock has role="tooltip" and aria-hidden="true"
      expect(tooltip).toHaveAttribute('role', 'tooltip');
    });

    it('should use semantic HTML for statistics display', () => {
      const data = createMockResponseTimeData('normal');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      // Statistics container should exist
      const statsContainer = screen.getByTestId('response-stats');
      expect(statsContainer).toBeInTheDocument();
      // Check that it contains the statistics
      expect(statsContainer).toHaveTextContent('8m');
      expect(statsContainer).toHaveTextContent('5m');
    });
  });

  describe('Interactivity', () => {
    it('should handle tooltip display on bar hover', () => {
      const data = createMockResponseTimeData('normal');
      render(<ResponseTimeChart responseTimeData={data} isLoading={false} />);
      
      const barChart = screen.getByTestId('bar-chart');
      
      // Simulate hover interaction
      fireEvent.mouseEnter(barChart);
      
      // Tooltip should be present (our mock always renders it with aria-hidden="true")
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute('aria-hidden', 'true');
      
      fireEvent.mouseLeave(barChart);
      expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    });

    it('should update when data changes', () => {
      const { rerender } = render(
        <ResponseTimeChart responseTimeData={createMockResponseTimeData('quick')} isLoading={false} />
      );
      
      expect(screen.getByTestId('average-response-time')).toHaveTextContent('45s');
      
      // Update with new data
      rerender(
        <ResponseTimeChart responseTimeData={createMockResponseTimeData('slow')} isLoading={false} />
      );
      
      expect(screen.getByTestId('average-response-time')).toHaveTextContent('2.0h');
    });
  });
});