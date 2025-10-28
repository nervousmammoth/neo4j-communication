import { Suspense } from 'react';
import { UserPairSearch } from '@/components/user-pair-search';
import { RecentAnalyses } from '@/components/recent-analyses';
import { Skeleton } from '@/components/ui/skeleton';

function SearchSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

function RecentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export default async function CommunicationsHub() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Communication Analysis</h1>
          <p className="text-muted-foreground">
            Analyze conversations and communication patterns between any two users
          </p>
        </div>
        
        <Suspense fallback={<SearchSkeleton />}>
          <UserPairSearch />
        </Suspense>
        
        <Suspense fallback={<RecentSkeleton />}>
          <RecentAnalyses />
        </Suspense>
      </div>
    </div>
  );
}