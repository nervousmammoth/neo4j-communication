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

                {/* Message distribution */}
                <MessageDistribution
                  user1Count={conv.user1MessageCount}
                  user2Count={conv.user2MessageCount}
                  user1Name={conv.participants[0]?.name || 'User 1'}
                  user2Name={conv.participants[1]?.name || 'User 2'}
                />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

interface MessageDistributionProps {
  user1Count: number
  user2Count: number
  user1Name: string
  user2Name: string
}

function MessageDistribution({
  user1Count,
  user2Count,
  user1Name,
  user2Name
}: MessageDistributionProps) {
  const total = user1Count + user2Count

  // Handle edge case: no messages
  if (total === 0) {
    return (
      <div
        className="text-xs text-muted-foreground mt-1"
        data-testid="message-distribution"
      >
        No messages
      </div>
    )
  }

  // Calculate percentages (rounded to whole numbers)
  const user1Percentage = Math.round((user1Count / total) * 100)
  const user2Percentage = Math.round((user2Count / total) * 100)

  // Create detailed tooltip text
  const tooltipText = `${user1Name}: ${user1Count} (${user1Percentage}%) • ${user2Name}: ${user2Count} (${user2Percentage}%)`

  return (
    <div
      className="text-xs text-muted-foreground mt-1"
      title={tooltipText}
      data-testid="message-distribution"
    >
      {user1Percentage}% / {user2Percentage}%
    </div>
  )
}