'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import type { SharedConversation } from '@/lib/neo4j';

interface ConversationTypePieProps {
  conversations: SharedConversation[];
}

interface PieData {
  name: string;
  value: number;
  percentage: number;
}

const COLORS = {
  direct: '#8884d8',
  group: '#82ca9d'
};

export function ConversationTypePie({ conversations }: ConversationTypePieProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No conversation data available
      </div>
    );
  }
  
  // Count conversation types
  const directCount = conversations.filter(c => c.type === 'direct').length;
  const groupCount = conversations.filter(c => c.type === 'group').length;
  const total = conversations.length;
  
  // Calculate message volumes
  const directMessages = conversations
    .filter(c => c.type === 'direct')
    .reduce((sum, c) => sum + c.messageCount, 0);
  const groupMessages = conversations
    .filter(c => c.type === 'group')
    .reduce((sum, c) => sum + c.messageCount, 0);
  
  // Calculate averages
  const directAvgMessages = directCount > 0 ? Math.round(directMessages / directCount) : 0;
  const groupAvgMessages = groupCount > 0 ? Math.round(groupMessages / groupCount) : 0;
  
  // Prepare pie chart data
  const pieData: PieData[] = [];
  
  if (directCount > 0) {
    pieData.push({
      name: 'Direct',
      value: directCount,
      percentage: Math.round((directCount / total) * 100)
    });
  }
  
  if (groupCount > 0) {
    pieData.push({
      name: 'Group',
      value: groupCount,
      percentage: Math.round((groupCount / total) * 100)
    });
  }
  
  const renderCustomLabel = (props: { name?: string; value?: number }) => {
    if (!props.name || props.value === undefined) return '';
    const data = pieData.find(d => d.name === props.name);
    if (!data) return '';
    return `${data.name}: ${data.value} (${data.percentage}%)`;
  };
  
  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center p-3 border rounded-lg">
          <div className="text-muted-foreground">Total</div>
          <div data-testid="total-conversations" className="text-2xl font-semibold">
            {total}
          </div>
        </div>
        <div className="text-center p-3 border rounded-lg">
          <div className="text-muted-foreground">Direct</div>
          <div data-testid="direct-count" className="text-2xl font-semibold">
            {directCount}
          </div>
        </div>
        <div className="text-center p-3 border rounded-lg">
          <div className="text-muted-foreground">Group</div>
          <div data-testid="group-count" className="text-2xl font-semibold">
            {groupCount}
          </div>
        </div>
      </div>
      
      {/* Pie Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {pieData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.name === 'Direct' ? COLORS.direct : COLORS.group} 
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Message Volume Statistics */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 border rounded-lg">
          <div className="text-muted-foreground">Direct Messages</div>
          <div className="flex justify-between items-baseline">
            <span data-testid="direct-messages" className="text-lg font-semibold">
              {directMessages.toLocaleString()}
            </span>
            <span data-testid="direct-avg-messages" className="text-xs text-muted-foreground">
              avg: {directAvgMessages.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-muted-foreground">Group Messages</div>
          <div className="flex justify-between items-baseline">
            <span data-testid="group-messages" className="text-lg font-semibold">
              {groupMessages.toLocaleString()}
            </span>
            <span data-testid="group-avg-messages" className="text-xs text-muted-foreground">
              avg: {groupAvgMessages.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}