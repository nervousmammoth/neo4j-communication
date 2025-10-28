import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft } from 'lucide-react'

export default function UserDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back navigation skeleton */}
      <div className="mb-6">
        <div className="inline-flex items-center text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4 mr-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* User Profile Header skeleton */}
      <div className="bg-card rounded-lg border p-6 mb-8">
        <div className="flex items-start gap-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-32" />
            <div className="pt-2">
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Statistics Dashboard skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
        ))}
      </div>

      {/* Activity chart skeleton */}
      <div className="bg-card rounded-lg border p-6 mb-8">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="flex items-end gap-2 h-32">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton
              key={i}
              className="flex-1"
              style={{ height: `${Math.random() * 100}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span key={day} className="text-xs text-muted-foreground">
              {day}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-6">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>

        {/* Conversations list skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}