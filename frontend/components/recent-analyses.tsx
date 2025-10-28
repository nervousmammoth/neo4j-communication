'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { UserAvatar } from '@/components/user-avatar';
import { ArrowRight } from 'lucide-react';
import { CommunicationsEmptyState } from '@/components/communications-empty-state';

interface SelectedUser {
  userId: string;
  name: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
}

interface RecentAnalysis {
  user1: SelectedUser;
  user2: SelectedUser;
  timestamp: string;
}

export function RecentAnalyses() {
  const [recent, setRecent] = useState<RecentAnalysis[]>([]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('recentAnalyses');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecent(parsed);
          }
        }
      }
    } catch (error) {
      // Silently handle localStorage errors
      console.error('Failed to load recent analyses:', error);
    }
  }, []);

  if (recent.length === 0) {
    return <CommunicationsEmptyState />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Analyses</h2>
      <div className="space-y-2">
        {recent.map((analysis, index) => {
          // Normalize IDs for consistent URLs
          const [id1, id2] = [analysis.user1.userId, analysis.user2.userId].sort();
          
          let timeAgo = '';
          try {
            timeAgo = formatDistanceToNow(new Date(analysis.timestamp), { addSuffix: true });
          } catch {
            // Handle invalid dates silently
            timeAgo = '';
          }

          return (
            <Link
              key={index}
              href={`/users/communications/${id1}/${id2}`}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <UserAvatar 
                user={{
                  name: analysis.user1.name || '',
                  avatarUrl: analysis.user1.avatarUrl
                }} 
                className="h-8 w-8" 
              />
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <UserAvatar 
                user={{
                  name: analysis.user2.name || '',
                  avatarUrl: analysis.user2.avatarUrl
                }} 
                className="h-8 w-8" 
              />
              <div className="flex-1">
                <div className="font-medium">
                  {analysis.user1.name || ''} ↔ {analysis.user2.name || ''}
                </div>
                {timeAgo && (
                  <div className="text-sm text-muted-foreground">
                    {timeAgo}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}