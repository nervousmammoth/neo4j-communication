'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLastSeen } from '@/lib/date-formatting'
import { MessageCircle, Users, Clock, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ActivityItem {
  type: string
  conversationId: string
  conversationTitle?: string
  timestamp: string
  content?: string
}

interface UserActivityTimelineProps {
  activities?: ActivityItem[]
  userId: string
  className?: string
}

export function UserActivityTimeline({
  activities,
  className
}: UserActivityTimelineProps) {
  const router = useRouter()

  // Loading skeleton
  if (!activities) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No recent activity</h3>
        <p className="text-muted-foreground">
          This user hasn&apos;t had any recent activity in the last 30 days.
        </p>
      </div>
    )
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message_sent':
        return <MessageCircle className="h-4 w-4" />
      case 'conversation_joined':
        return <Users className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'message_sent':
        return 'Sent a message'
      case 'conversation_joined':
        return 'Joined conversation'
      default:
        return 'Activity'
    }
  }

  const handleConversationClick = (conversationId: string) => {
    router.push(`/conversations/${conversationId}`)
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-8 bottom-0 w-px bg-border" />

        {/* Activity items */}
        {activities.map((activity, index) => (
          <div key={index} className="relative flex gap-4 pb-6">
            {/* Timeline dot */}
            <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 border-border">
              {getActivityIcon(activity.type)}
            </div>

            {/* Activity content */}
            <Card 
              className="flex-1 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => activity.conversationId && handleConversationClick(activity.conversationId)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">
                      {getActivityLabel(activity.type)}
                    </p>
                    {activity.conversationTitle && (
                      <p className="text-sm text-muted-foreground">
                        in <span className="font-medium">{activity.conversationTitle}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatLastSeen(activity.timestamp)}
                  </Badge>
                </div>

                {/* Message content preview */}
                {activity.content && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {activity.content}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}