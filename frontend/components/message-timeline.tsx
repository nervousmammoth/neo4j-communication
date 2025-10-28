'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FixedSizeList as List } from 'react-window'
import { PaginationWithPrefetch } from '@/components/pagination-prefetch'
import { ViewToggle } from '@/components/view-toggle'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/user-avatar'
import { formatLastActivity } from '@/lib/date-formatting'
import { cn } from '@/lib/utils'
import { Search, ExternalLink } from 'lucide-react'
import type { TimelineMessage, UserSummary, PaginationInfo } from '@/lib/neo4j'

interface MessageTimelineProps {
  messages: TimelineMessage[]
  pagination: PaginationInfo
  user1: UserSummary
  user2: UserSummary
  viewMode?: string
  searchQuery?: string
}

export function MessageTimeline({
  messages,
  pagination,
  user1,
  user2,
  viewMode: initialView = 'timeline',
  searchQuery: initialSearch = ''
}: MessageTimelineProps) {
  const [localSearch, setLocalSearch] = useState(initialSearch)
  const [viewMode, setViewMode] = useState<'list' | 'card'>(
    initialView === 'timeline' ? 'list' : initialView === 'grouped' ? 'card' : 'list'
  )
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Filter messages based on search
  const filteredMessages = useMemo(() => {
    if (!localSearch) return messages
    const query = localSearch.toLowerCase()
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(query) ||
      msg.conversationTitle.toLowerCase().includes(query)
    )
  }, [messages, localSearch])
  
  // Apply search to URL
  const handleSearch = useCallback((query: string) => {
    setLocalSearch(query)
    const params = new URLSearchParams(searchParams)
    if (query) {
      params.set('search', query)
    } else {
      params.delete('search')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])
  
  if (messages.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          No messages found between these users
        </div>
      </Card>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Message Timeline</h2>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search messages..."
              value={localSearch}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 w-[200px]"
            />
          </div>
          
          <ViewToggle
            view={viewMode}
            onViewChange={setViewMode}
          />
        </div>
      </div>
      
      {viewMode === 'list' ? (
        <TimelineView
          messages={filteredMessages}
          user1={user1}
          user2={user2}
        />
      ) : (
        <GroupedView
          messages={filteredMessages}
          user1={user1}
          user2={user2}
        />
      )}
      
      <PaginationWithPrefetch
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        showPageSize={true}
      />
    </div>
  )
}

interface ViewProps {
  messages: TimelineMessage[]
  user1: UserSummary
  user2: UserSummary
}

function TimelineView({ messages, user1, user2 }: ViewProps) {
  // Row renderer for virtual scrolling
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = messages[index]
    const isUser1 = message.senderId === user1.userId
    const sender = isUser1 ? user1 : user2
    
    return (
      <div style={style}>
        <Card
          className={cn(
            "p-4 mb-2",
            isUser1 ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-green-500"
          )}
        >
          <div className="flex items-start gap-3">
            <UserAvatar user={sender} size="sm" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{sender.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatLastActivity(message.timestamp)}
                </span>
              </div>
              <p className="text-sm">{message.content}</p>
              <Link
                href={`/conversations/${message.conversationId}`}
                className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
              >
                from: {message.conversationTitle}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    )
  }
  
  // Use virtual scrolling for performance
  return (
    <div data-testid="virtual-list-container">
      <List
        height={600} // Adjust based on viewport
        itemCount={messages.length}
        itemSize={120} // Estimated height of each message card
        width="100%"
        className="scrollbar-thin"
      >
        {Row}
      </List>
    </div>
  )
}

function GroupedView({ messages, user1, user2 }: ViewProps) {
  // Group messages by conversation
  const groupedMessages = useMemo(() => {
    const groups = new Map<string, TimelineMessage[]>()
    
    messages.forEach(msg => {
      if (!groups.has(msg.conversationId)) {
        groups.set(msg.conversationId, [])
      }
      groups.get(msg.conversationId)!.push(msg)
    })
    
    return Array.from(groups.entries())
  }, [messages])
  
  return (
    <div className="space-y-4">
      {groupedMessages.map(([conversationId, msgs]) => (
        <Card key={conversationId} className="p-4">
          <h3 className="font-medium mb-3">
            {msgs[0].conversationTitle}
          </h3>
          <div className="space-y-2">
            {msgs.map(msg => {
              const isUser1 = msg.senderId === user1.userId
              const sender = isUser1 ? user1 : user2
              
              return (
                <div
                  key={msg.messageId}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded",
                    isUser1 ? "bg-blue-50" : "bg-green-50"
                  )}
                >
                  <UserAvatar user={sender} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{sender.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatLastActivity(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}