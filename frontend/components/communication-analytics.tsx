'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FrequencyChart } from './charts/frequency-chart';
import { TalkListenRatio } from './charts/talk-listen-ratio';
import { ResponseTimeChart } from './charts/response-time-chart';
import { ActivityHeatmap } from './charts/activity-heatmap';
import { ConversationTypePie } from './charts/conversation-type-pie';
import { DateRangeFilter } from './date-range-filter';
import { ExportDropdown } from './export-dropdown';
import { MessageTypeFilter } from './message-type-filter';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { UserCommunicationData, UserSummary } from '@/lib/neo4j';
import { fetchAggregatedData } from '@/lib/api-client';

interface CommunicationAnalyticsProps {
  data: UserCommunicationData;
  user1: UserSummary;
  user2: UserSummary;
}

export function CommunicationAnalytics({
  data,
  user1,
  user2
}: CommunicationAnalyticsProps) {
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });

  // Fetch aggregated data for analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['analytics', user1.userId, user2.userId, dateRange, granularity],
    queryFn: () => fetchAggregatedData(user1.userId, user2.userId, dateRange, granularity),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <DateRangeFilter />
          <MessageTypeFilter />
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <ExportDropdown 
          data={data} 
          filename={`communication-${user1.userId}-${user2.userId}-${new Date().toISOString().split('T')[0]}`}
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="frequency">Frequency</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.communicationStats.totalMessages.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Shared Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.communicationStats.totalSharedConversations}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">First Interaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {data.communicationStats.firstInteraction 
                    ? new Date(data.communicationStats.firstInteraction).toLocaleDateString()
                    : 'N/A'}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Interaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {data.communicationStats.lastInteraction
                    ? new Date(data.communicationStats.lastInteraction).toLocaleDateString()
                    : 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <TalkListenRatio
              user1={user1}
              user2={user2}
              user1Messages={analyticsData?.talkToListenRatio?.user1Messages || data.communicationStats.user1Messages}
              user2Messages={analyticsData?.talkToListenRatio?.user2Messages || data.communicationStats.user2Messages}
            />
            <ConversationTypePie 
              conversations={data.sharedConversations} 
            />
          </div>
        </TabsContent>
        
        <TabsContent value="frequency">
          <Card>
            <CardHeader>
              <CardTitle>Message Frequency Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <FrequencyChart
                user1={user1}
                user2={user2}
                dateRange={dateRange}
                granularity={granularity}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Time Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponseTimeChart
                responseTimeData={analyticsData?.responseTime}
                isLoading={!analyticsData}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Activity Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityHeatmap
                heatmapData={analyticsData?.activityHeatmap}
                isLoading={!analyticsData}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}