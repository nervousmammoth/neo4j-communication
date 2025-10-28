import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityHeatmap } from '@/components/charts/activity-heatmap';
import type { ActivityHeatmapPoint } from '@/lib/neo4j';

describe('ActivityHeatmap', () => {
  const createMockHeatmapData = (pattern: 'weekday' | 'weekend' | 'mixed' | 'single'): ActivityHeatmapPoint[] => {
    const heatmapData: ActivityHeatmapPoint[] = [];
    
    switch (pattern) {
      case 'weekday':
        // Monday 9am, Tuesday 2pm, Wednesday 10am, Thursday 3pm, Friday 11am
        heatmapData.push(
          { dayOfWeek: 0, hour: 9, messageCount: 5 },   // Monday 9am
          { dayOfWeek: 1, hour: 14, messageCount: 3 },  // Tuesday 2pm
          { dayOfWeek: 2, hour: 10, messageCount: 7 },  // Wednesday 10am
          { dayOfWeek: 3, hour: 15, messageCount: 2 },  // Thursday 3pm
          { dayOfWeek: 4, hour: 11, messageCount: 4 }   // Friday 11am
        );
        break;

      case 'weekend':
        // Saturday and Sunday various times
        heatmapData.push(
          { dayOfWeek: 5, hour: 8, messageCount: 2 },   // Saturday 8am
          { dayOfWeek: 5, hour: 19, messageCount: 3 },  // Saturday 7pm
          { dayOfWeek: 6, hour: 14, messageCount: 1 }   // Sunday 2pm
        );
        break;

      case 'mixed':
        // Generate data for each hour of each day to test full heatmap
        for (let day = 0; day < 7; day++) {
          for (let hour = 0; hour < 24; hour++) {
            // Vary intensity by day and hour
            const messageCount = (day < 5 && hour >= 9 && hour <= 17) ? 3 : 1; // More messages during work hours on weekdays
            
            heatmapData.push({
              dayOfWeek: day,
              hour: hour,
              messageCount: messageCount
            });
          }
        }
        break;

      case 'single':
        // Single data point to test edge case
        heatmapData.push(
          { dayOfWeek: 2, hour: 14, messageCount: 1 }  // Wednesday 2pm
        );
        break;
    }
    
    return heatmapData;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state when isLoading is true', () => {
      render(<ActivityHeatmap heatmapData={undefined} isLoading={true} />);
      expect(screen.getByText(/Loading activity data/i)).toBeInTheDocument();
      expect(screen.queryByTestId('activity-heatmap')).not.toBeInTheDocument();
    });
  });

  describe('No Data State', () => {
    it('should show no data message when heatmapData is undefined', () => {
      render(<ActivityHeatmap heatmapData={undefined} isLoading={false} />);
      expect(screen.getByText(/No activity data available/i)).toBeInTheDocument();
    });

    it('should show no data message when heatmapData is empty', () => {
      render(<ActivityHeatmap heatmapData={[]} isLoading={false} />);
      expect(screen.getByText(/No activity data available/i)).toBeInTheDocument();
    });
  });

  describe('Heatmap Rendering', () => {
    it('should render the heatmap grid', () => {
      const data = createMockHeatmapData('mixed');
      
      render(<ActivityHeatmap heatmapData={data} isLoading={false} />);

      // Should have 7 days x 24 hours = 168 cells
      const cells = screen.getAllByTestId(/^cell-\d+-\d+$/);
      expect(cells).toHaveLength(168);
    });

    it('should render day labels', () => {
      const data = createMockHeatmapData('mixed');
      
      render(<ActivityHeatmap heatmapData={data} isLoading={false} />);

      // Check for abbreviated day names
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });

    it('should render hour labels for every 4 hours', () => {
      const data = createMockHeatmapData('mixed');
      
      render(<ActivityHeatmap heatmapData={data} isLoading={false} />);

      // Check for hour labels (displayed every 4 hours)
      expect(screen.getByText('12 AM')).toBeInTheDocument();
      expect(screen.getByText('4 AM')).toBeInTheDocument();
      expect(screen.getByText('8 AM')).toBeInTheDocument();
      expect(screen.getByText('12 PM')).toBeInTheDocument();
      expect(screen.getByText('4 PM')).toBeInTheDocument();
      expect(screen.getByText('8 PM')).toBeInTheDocument();
    });

    it('should apply correct intensity classes based on message count', () => {
      const data = createMockHeatmapData('weekday');
      
      render(<ActivityHeatmap heatmapData={data} isLoading={false} />);

      // Monday 9am has 5 messages (should be medium intensity)
      const mondayCell = screen.getByTestId('cell-0-9');
      expect(mondayCell).toHaveClass('bg-green-300');

      // Check empty cells have muted background
      const emptyCell = screen.getByTestId('cell-0-0');
      expect(emptyCell).toHaveClass('bg-muted');
    });

    it('should handle single data point correctly', () => {
      const data = createMockHeatmapData('single');
      
      render(<ActivityHeatmap heatmapData={data} isLoading={false} />);

      // Wednesday 2pm should have data
      const activeCell = screen.getByTestId('cell-2-14');
      expect(activeCell).toHaveClass('bg-green-100'); // 1 message = light intensity

      // Other cells should be empty
      const emptyCell = screen.getByTestId('cell-0-0');
      expect(emptyCell).toHaveClass('bg-muted');
    });
  });

  describe('Interactive Features', () => {
    it('should show tooltip on hover', () => {
      const data = createMockHeatmapData('weekday');
      
      render(<ActivityHeatmap heatmapData={data} isLoading={false} />);

      const cell = screen.getByTestId('cell-0-9');
      fireEvent.mouseEnter(cell);

      // Should show hover information
      expect(screen.getByText(/Monday.*9:00 AM.*5 messages/)).toBeInTheDocument();
    });

    it('should highlight cell on hover', () => {
      const data = createMockHeatmapData('weekday');
      
      render(<ActivityHeatmap heatmapData={data} isLoading={false} />);

      const cell = screen.getByTestId('cell-0-9');
      
      // Initially not highlighted
      expect(cell).not.toHaveClass('ring-2');
      
      // Hover over cell
      fireEvent.mouseEnter(cell);
      expect(cell).toHaveClass('ring-2', 'ring-primary');
      
      // Mouse leave
      fireEvent.mouseLeave(cell);
      expect(cell).not.toHaveClass('ring-2');
    });

    it('should have proper title attributes for accessibility', () => {
      const data = createMockHeatmapData('weekday');
      
      render(<ActivityHeatmap heatmapData={data} isLoading={false} />);

      const cell = screen.getByTestId('cell-0-9');
      expect(cell).toHaveAttribute('title', 'Monday 9:00 AM: 5 messages');
    });
  });

  describe('Legend', () => {
    it('should render the legend', () => {
      const data = createMockHeatmapData('mixed');
      
      render(<ActivityHeatmap heatmapData={data} isLoading={false} />);

      // Check for legend text
      expect(screen.getByText('Less')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();

      // Check for legend color boxes (by title attribute)
      expect(screen.getByTitle('0 messages')).toBeInTheDocument();
      expect(screen.getByTitle('1-2 messages')).toBeInTheDocument();
      expect(screen.getByTitle('3-5 messages')).toBeInTheDocument();
      expect(screen.getByTitle('6-10 messages')).toBeInTheDocument();
      expect(screen.getByTitle('10+ messages')).toBeInTheDocument();
    });
  });

  describe('Data Aggregation', () => {
    it('should correctly aggregate weekday business hours', () => {
      const data = createMockHeatmapData('mixed');
      
      render(<ActivityHeatmap heatmapData={data} isLoading={false} />);

      // Check weekday business hours (9-17) have higher intensity
      const weekdayBusinessHour = screen.getByTestId('cell-0-10'); // Monday 10am
      const weekendHour = screen.getByTestId('cell-5-10'); // Saturday 10am
      
      // Business hours should have higher intensity class
      expect(weekdayBusinessHour).toHaveClass('bg-green-300'); // 3 messages (medium intensity)
      expect(weekendHour).toHaveClass('bg-green-100'); // 1 message (light intensity)
    });

    it('should handle weekend data correctly', () => {
      const data = createMockHeatmapData('weekend');
      
      render(<ActivityHeatmap heatmapData={data} isLoading={false} />);

      // Saturday 8am
      const saturdayMorning = screen.getByTestId('cell-5-8');
      expect(saturdayMorning).toHaveClass('bg-green-100'); // 2 messages

      // Sunday 2pm
      const sundayAfternoon = screen.getByTestId('cell-6-14');
      expect(sundayAfternoon).toHaveClass('bg-green-100'); // 1 message
    });
  });
});