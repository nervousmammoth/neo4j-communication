'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SharedConversation } from '@/lib/neo4j'

interface SharedConversationsProps {
  conversations: SharedConversation[]
  selectedId?: string
}

export function SharedConversations({ 
  conversations, 
  selectedId 
}: SharedConversationsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  if (conversations.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          No shared conversations found
        </div>
      </Card>
    )
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Shared Conversations ({conversations.length})
      </h2>
      
      <div className="space-y-2">
        {conversations.map((conv) => {
          const params = new URLSearchParams(searchParams)
          params.set('conversation', conv.conversationId)
          
          return (
            <Link
              key={conv.conversationId}
              href={`${pathname}?${params.toString()}`}
              className={cn(
                "block p-3 rounded-lg border transition-colors",
                selectedId === conv.conversationId
                  ? "bg-accent border-primary"
                  : "hover:bg-accent"
              )}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium line-clamp-1">{conv.title}</h3>
                  <Badge variant={conv.type === 'direct' ? 'default' : 'secondary'}>
                    {conv.type}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {conv.messageCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {conv.participants.length}
                  </span>
                </div>
                
                {/* Message distribution bar */}
                <MessageDistributionBar
                  user1Count={conv.user1MessageCount}
                  user2Count={conv.user2MessageCount}
                />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

interface MessageDistributionBarProps {
  user1Count: number
  user2Count: number
}

function MessageDistributionBar({ user1Count, user2Count }: MessageDistributionBarProps) {
  const total = user1Count + user2Count
  
  if (total === 0) {
    return (
      <div 
        className="h-2 bg-muted rounded-full"
        data-testid="message-distribution"
      />
    )
  }
  
  const user1Percentage = (user1Count / total) * 100
  const user2Percentage = (user2Count / total) * 100
  
  return (
    <div 
      className="h-2 bg-muted rounded-full overflow-hidden flex"
      data-testid="message-distribution"
    >
      <div
        className="bg-blue-500 transition-all"
        style={{ width: `${user1Percentage}%` }}
        data-testid="distribution-segment"
        title={`User 1: ${user1Count} messages (${user1Percentage.toFixed(1)}%)`}
      />
      <div
        className="bg-green-500 transition-all"
        style={{ width: `${user2Percentage}%` }}
        data-testid="distribution-segment"
        title={`User 2: ${user2Count} messages (${user2Percentage.toFixed(1)}%)`}
      />
    </div>
  )
}

export { MessageDistributionBar }