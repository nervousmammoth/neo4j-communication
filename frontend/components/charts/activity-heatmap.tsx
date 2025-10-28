'use client';

import { useState } from 'react';
import type { ActivityHeatmapPoint } from '@/lib/neo4j';
import { cn } from '@/lib/utils';

interface ActivityHeatmapProps {
  heatmapData: ActivityHeatmapPoint[] | undefined;
  isLoading?: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap({ heatmapData, isLoading }: ActivityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        <div className="animate-pulse">Loading activity data...</div>
      </div>
    );
  }
  
  if (!heatmapData || heatmapData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No activity data available
      </div>
    );
  }
  
  // Create a 7x24 grid for day-of-week x hour-of-day
  const heatmapGrid: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
  
  // Populate grid from pre-aggregated data
  heatmapData.forEach(point => {
    if (point.dayOfWeek >= 0 && point.dayOfWeek < 7 && point.hour >= 0 && point.hour < 24) {
      heatmapGrid[point.dayOfWeek][point.hour] = point.messageCount;
    }
  });
  
  // Find max count for intensity calculation
  const maxCount = Math.max(...heatmapGrid.flat());
  
  const getIntensityClass = (count: number): string => {
    if (count === 0) return 'bg-muted';
    if (maxCount === 0) return 'bg-muted';
    
    // Use fixed thresholds instead of relative to max
    if (count <= 2) return 'bg-green-100 dark:bg-green-900';
    if (count <= 5) return 'bg-green-300 dark:bg-green-700';
    if (count <= 10) return 'bg-green-500 dark:bg-green-500';
    return 'bg-green-700 dark:bg-green-300';
  };
  
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };
  
  const formatTime = (hour: number): string => {
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour < 12 ? 'AM' : 'PM';
    return `${hour12}:00 ${period}`;
  };
  
  return (
    <div data-testid="activity-heatmap" className="space-y-2">
      {/* Header with hours */}
      <div className="flex items-center gap-1">
        <div className="w-20" /> {/* Spacer for day labels */}
        <div className="flex gap-1 flex-1">
          {HOURS.map(hour => (
            <div 
              key={hour} 
              className="flex-1 text-xs text-center text-muted-foreground"
              title={formatTime(hour)}
            >
              {hour % 4 === 0 ? formatHour(hour) : ''}
            </div>
          ))}
        </div>
      </div>
      
      {/* Grid */}
      {DAYS.map((day, dayIndex) => (
        <div key={day} className="flex items-center gap-1">
          <div className="w-20 text-sm text-right pr-2">{day.slice(0, 3)}</div>
          <div className="flex gap-1 flex-1">
            {HOURS.map(hour => {
              const count = heatmapGrid[dayIndex][hour];
              const isHovered = hoveredCell?.day === dayIndex && hoveredCell?.hour === hour;
              
              return (
                <div
                  key={`${dayIndex}-${hour}`}
                  data-testid={`cell-${dayIndex}-${hour}`}
                  className={cn(
                    'flex-1 aspect-square rounded-sm cursor-pointer transition-all',
                    getIntensityClass(count),
                    isHovered && 'ring-2 ring-primary ring-offset-1'
                  )}
                  onMouseEnter={() => setHoveredCell({ day: dayIndex, hour })}
                  onMouseLeave={() => setHoveredCell(null)}
                  title={`${day} ${formatTime(hour)}: ${count} messages`}
                />
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <span className="text-xs text-muted-foreground">Less</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-muted rounded-sm" title="0 messages" />
          <div className="w-4 h-4 bg-green-100 dark:bg-green-900 rounded-sm" title="1-2 messages" />
          <div className="w-4 h-4 bg-green-300 dark:bg-green-700 rounded-sm" title="3-5 messages" />
          <div className="w-4 h-4 bg-green-500 dark:bg-green-500 rounded-sm" title="6-10 messages" />
          <div className="w-4 h-4 bg-green-700 dark:bg-green-300 rounded-sm" title="10+ messages" />
        </div>
        <span className="text-xs text-muted-foreground">More</span>
      </div>
      
      {hoveredCell && (
        <div className="text-center text-sm text-muted-foreground">
          {DAYS[hoveredCell.day]} {formatTime(hoveredCell.hour)}: {heatmapGrid[hoveredCell.day][hoveredCell.hour]} messages
        </div>
      )}
    </div>
  );
}