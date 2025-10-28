import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ConversationDetailLoading() {
  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="mb-4">
        <Skeleton className="h-6 w-40" data-testid="skeleton-back-link" />
      </div>

      <div className="space-y-6">
        {/* Conversation Header */}
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" data-testid="skeleton-title" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-6 w-20" data-testid="skeleton-badge" />
              <Skeleton className="h-6 w-20" data-testid="skeleton-badge" />
            </div>
          </CardHeader>
        </Card>

        {/* Participants */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" data-testid="skeleton-participants-title" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-10 rounded-full" data-testid={`skeleton-avatar-${i}`} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" data-testid="skeleton-messages-title" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}