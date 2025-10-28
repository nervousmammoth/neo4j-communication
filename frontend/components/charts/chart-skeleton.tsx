import { Skeleton } from '@/components/ui/skeleton'

export function ChartSkeleton() {
  return (
    <div className="w-full h-[300px] flex items-center justify-center" data-testid="chart-skeleton">
      <div className="w-full h-full animate-pulse">
        <div className="h-full bg-muted rounded-lg flex flex-col items-center justify-center">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-2 w-48" />
        </div>
      </div>
    </div>
  )
}