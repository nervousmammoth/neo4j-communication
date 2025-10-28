import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/date-formatting'
import { MessageCircle, Users, TrendingUp, Calendar, Clock, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserStatsDashboardProps {
  stats?: {
    totalMessages: number
    totalConversations: number
    averageMessagesPerConversation: number
    mostActiveDay: string | null
    firstActivity: string | null
    lastActivity: string | null
    messagesByDay?: Record<string, number>
  }
  className?: string
}

export function UserStatsDashboard({ stats, className }: UserStatsDashboardProps) {
  // Loading state
  if (!stats) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" data-testid="skeleton-loader" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  // Format average with proper decimals
  const formatAverage = (num: number) => {
    return num % 1 === 0 ? num.toString() : num.toFixed(1)
  }

  // Calculate activity duration
  const getActivityDuration = () => {
    if (!stats.firstActivity || !stats.lastActivity) return 'N/A'
    
    const first = new Date(stats.firstActivity)
    const last = new Date(stats.lastActivity)
    const diffInMs = last.getTime() - first.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return '1 day'
    if (diffInDays < 30) return `${diffInDays} days`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months`
    return `${Math.floor(diffInDays / 365)} year${Math.floor(diffInDays / 365) > 1 ? 's' : ''}`
  }

  // Get max message count for chart scaling
  const maxMessages = stats.messagesByDay ? 
    Math.max(...Object.values(stats.messagesByDay), 1) : 1

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayAbbrev = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalMessages)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              All time
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalConversations)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Participated in
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Messages/Conversation</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAverage(stats.averageMessagesPerConversation)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Per conversation
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Most Active Day</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mostActiveDay || 'N/A'}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Peak activity
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">First Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {stats.firstActivity ? formatDate(stats.firstActivity, 'Never') : 'Never'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {stats.lastActivity ? formatDate(stats.lastActivity, 'Never') : 'Never'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Activity Duration</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{getActivityDuration()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      {stats.messagesByDay && (
        <Card>
          <CardHeader>
            <CardTitle>Activity by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-end gap-2 h-32">
                {dayOrder.map((day) => {
                  const count = stats.messagesByDay?.[day] || 0
                  const height = maxMessages > 0 ? (count / maxMessages) * 100 : 0
                  const isHighest = day === stats.mostActiveDay

                  return (
                    <div key={day} className="flex-1 flex flex-col items-center">
                      <div 
                        className={cn(
                          'w-full rounded-t transition-all',
                          isHighest ? 'bg-primary' : 'bg-muted'
                        )}
                        style={{ height: `${height}%` }}
                        data-testid={`chart-bar-${day}`}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between">
                {dayAbbrev.map((day) => (
                  <span key={day} className="text-xs text-muted-foreground flex-1 text-center">
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}