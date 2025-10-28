'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { UserSummary } from '@/lib/neo4j';

interface TalkListenRatioProps {
  user1: UserSummary;
  user2: UserSummary;
  user1Messages: number;
  user2Messages: number;
}

export function TalkListenRatio({
  user1,
  user2,
  user1Messages: rawUser1Messages,
  user2Messages: rawUser2Messages
}: TalkListenRatioProps) {
  // Handle negative numbers
  const user1Messages = Math.max(0, rawUser1Messages);
  const user2Messages = Math.max(0, rawUser2Messages);
  
  const total = user1Messages + user2Messages;
  const user1Percentage = total > 0 ? (user1Messages / total) * 100 : 50;
  const user2Percentage = total > 0 ? (user2Messages / total) * 100 : 50;
  
  const getDominanceText = () => {
    if (user1Percentage > user2Percentage) {
      return `${user1.name} dominates the conversation`;
    } else if (user2Percentage > user1Percentage) {
      return `${user2.name} dominates the conversation`;
    }
    return 'Balanced conversation';
  };
  
  return (
    <Card>
      <CardHeader>
                <CardTitle role="heading" aria-level={2}>Talk-to-Listen Ratio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{user1.name}</span>
            <span data-testid={`percentage-${user1.userId}`}>{user1Percentage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={user1Percentage} 
            className="h-2"
            aria-label={`${user1.name} message percentage`}
            aria-valuenow={Math.round(user1Percentage)}
          />
          <div className="text-xs text-muted-foreground">
            {user1Messages.toLocaleString()} messages
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{user2.name}</span>
            <span data-testid={`percentage-${user2.userId}`}>{user2Percentage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={user2Percentage} 
            className="h-2"
            aria-label={`${user2.name} message percentage`}
            aria-valuenow={Math.round(user2Percentage)}
          />
          <div className="text-xs text-muted-foreground">
            {user2Messages.toLocaleString()} messages
          </div>
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          {getDominanceText()}
        </div>
      </CardContent>
    </Card>
  );
}