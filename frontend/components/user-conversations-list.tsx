'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLastSeen } from '@/lib/date-formatting'
import { MessageCircle, Users, Clock, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Conversation {
  conversationId: string
  title: string | null
  type: string
  lastMessageTimestamp: string
  messageCount: number
  participantCount: number
  lastMessagePreview?: string
  hasUnread?: boolean
}

interface UserConversationsListProps {
  conversations?: Conversation[]
  userId: string
  totalCount?: number
  hasMore?: boolean
  isLoading?: boolean
  onLoadMore?: () => void
  error?: string
  onRetry?: () => void
  className?: string
}

export function UserConversationsList({
  conversations,
  totalCount,
  hasMore = false,
  isLoading = false,
  onLoadMore,
  error,
  onRetry,
  className
}: UserConversationsListProps) {
  const router = useRouter()

  // Loading skeleton
  if (!conversations) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i} data-testid="conversation-skeleton">
            <CardContent className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
        <p className="text-destructive mb-4">{error}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        )}
      </div>
    )
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-muted-foreground">
          This user has not participated in any conversations.
        </p>
      </div>
    )
  }

  const handleConversationClick = (conversationId: string) => {
    router.push(`/conversations/${conversationId}`)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Total count display */}
      {totalCount && totalCount > conversations.length && (
        <p className="text-sm text-muted-foreground">
          Showing {conversations.length} of {totalCount} conversations
        </p>
      )}

      {/* Conversations list */}
      {conversations.map((conversation) => (
        <Card
          key={conversation.conversationId}
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            conversation.hasUnread && 'border-primary'
          )}
          role="button"
          tabIndex={0}
          onClick={() => handleConversationClick(conversation.conversationId)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleConversationClick(conversation.conversationId)
            }
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold line-clamp-1">
                {conversation.title || 'Untitled Conversation'}
              </h3>
              <Badge variant="secondary" className="ml-2">
                {conversation.type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Message preview */}
            {conversation.lastMessagePreview && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {conversation.lastMessagePreview || 'No messages yet'}
              </p>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                <span>{conversation.messageCount} messages</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{conversation.participantCount} participants</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatLastSeen(conversation.lastMessageTimestamp)}</span>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Load more section */}
      {(hasMore || isLoading) && (
        <div className="text-center py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more conversations...</span>
            </div>
          ) : (
            hasMore && onLoadMore && (
              <Button
                onClick={onLoadMore}
                variant="outline"
                disabled={isLoading}
              >
                Load more
              </Button>
            )
          )}
        </div>
      )}
    </div>
  )
}