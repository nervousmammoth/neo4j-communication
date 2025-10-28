'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { ResponseTimeAnalysis } from '@/lib/neo4j';

interface ResponseTimeChartProps {
  responseTimeData: ResponseTimeAnalysis | undefined;
  isLoading?: boolean;
}

export function ResponseTimeChart({ responseTimeData, isLoading }: ResponseTimeChartProps) {
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        <div className="animate-pulse">Loading response time data...</div>
      </div>
    );
  }
  
  // No response data available
  if (!responseTimeData || !responseTimeData.distribution || responseTimeData.distribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No response time data available
      </div>
    );
  }
  
  // Use the pre-aggregated distribution data directly
  const chartData = responseTimeData.distribution.map(item => ({
    range: item.range,
    count: item.count
  }));
  
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m`;
    } else {
      return `${(seconds / 3600).toFixed(1)}h`;
    }
  };
  
  return (
    <div className="space-y-4">
      <div data-testid="response-stats" className="grid grid-cols-2 gap-4">
        <div className="p-3 border rounded-lg">
          <div className="text-sm text-muted-foreground">Average Response Time</div>
          <div data-testid="average-response-time" className="text-xl font-semibold">
            {formatTime(responseTimeData.avgResponseTime)}
          </div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-sm text-muted-foreground">Median Response Time</div>
          <div data-testid="median-response-time" className="text-xl font-semibold">
            {formatTime(responseTimeData.medianResponseTime)}
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="range" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar 
            dataKey="count" 
            fill="#82ca9d" 
            name="Response Count"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}