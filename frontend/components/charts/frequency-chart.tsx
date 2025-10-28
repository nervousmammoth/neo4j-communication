'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { ChartSkeleton } from './chart-skeleton';
import type { UserSummary } from '@/lib/neo4j';
import { fetchAggregatedData } from '@/lib/api-client';

interface FrequencyChartProps {
  user1: UserSummary;
  user2: UserSummary;
  dateRange: { from: Date; to: Date };
  granularity: 'daily' | 'weekly' | 'monthly';
}

export function FrequencyChart({
  user1,
  user2,
  dateRange,
  granularity
}: FrequencyChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['frequency', user1.userId, user2.userId, dateRange, granularity],
    queryFn: () => fetchAggregatedData(user1.userId, user2.userId, dateRange, granularity as 'daily' | 'weekly' | 'monthly'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (error) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">
        Failed to load chart data
      </div>
    );
  }

  const chartData = data?.frequency || [];

  if (chartData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">
        No data available for the selected range
      </div>
    );
  }

  // Format dates based on granularity
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    switch (granularity) {
      case 'monthly':
        return format(date, 'MMM yyyy');
      case 'weekly':
        return format(date, 'MMM dd');
      default:
        return format(date, 'MMM dd');
    }
  };

  const formattedData = chartData.map((point: {
    date: string;
    totalMessages: number;
    user1Messages: number;
    user2Messages: number;
  }) => ({
    ...point,
    date: formatDate(point.date)
  }));

  return (
    <div aria-label="Message frequency chart" className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="totalMessages"
            stroke="#8884d8"
            name="Total"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="user1Messages"
            stroke="#82ca9d"
            name={user1.name}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="user2Messages"
            stroke="#ffc658"
            name={user2.name}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}