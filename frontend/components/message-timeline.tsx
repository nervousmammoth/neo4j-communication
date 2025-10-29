'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FixedSizeList as List } from 'react-window'
import { PaginationWithPrefetch } from '@/components/pagination-prefetch'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/user-avatar'
import { formatChatTimestamp } from '@/lib/timestamp'
import { cn } from '@/lib/utils'
import { Search, ExternalLink } from 'lucide-react'
import type { TimelineMessage, UserSummary, PaginationInfo } from '@/lib/neo4j'

interface MessageTimelineProps {
  messages: TimelineMessage[]
  pagination: PaginationInfo
  user1: UserSummary
  user2: UserSummary
  searchQuery?: string
}

export function MessageTimeline({
  messages,
  pagination,
  user1,
  user2,
  searchQuery: initialSearch = ''
}: MessageTimelineProps) {
  const [localSearch, setLocalSearch] = useState(initialSearch)
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
      <div className="p-8 border rounded-lg bg-card">
        <div className="text-center text-muted-foreground">
          No messages found between these users
        </div>
      </div>
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
        </div>
      </div>

      <TimelineView
        messages={filteredMessages}
        user1={user1}
        user2={user2}
      />

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

// Row component for virtual scrolling - extracted and memoized for performance
interface RowProps {
  index: number
  style: React.CSSProperties
  data: {
    messages: TimelineMessage[]
    user1: UserSummary
    user2: UserSummary
  }
}

const VirtualizedRow = memo(({ index, style, data }: RowProps) => {
  const { messages, user1, user2 } = data
  const message = messages[index]
  const isUser1 = message.senderId === user1.userId
  const sender = isUser1 ? user1 : user2

  return (
    <div style={style} className="px-2">
      <div className={cn(
        "flex gap-3 mb-2",
        isUser1 ? "justify-start" : "justify-end"
      )}>
        {/* Avatar on left for received messages (user1) */}
        {isUser1 && <UserAvatar user={sender} size="sm" />}

        {/* Chat bubble container */}
        <div className={cn("max-w-[70%] flex flex-col", isUser1 ? "items-start" : "items-end")}>
          {/* Bubble */}
          <div className={cn(
            "rounded-2xl shadow-sm p-3",
            isUser1 ? "bg-gray-100 text-gray-900" : "bg-gray-900 text-white"
          )}>
            <p className="text-sm break-words">{message.content}</p>
          </div>

          {/* Timestamp */}
          <span className="text-xs text-muted-foreground mt-1">
            {formatChatTimestamp(message.timestamp)}
          </span>

          {/* Conversation link */}
          <Link
            href={`/conversations/${message.conversationId}`}
            className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-1"
          >
            from: {message.conversationTitle}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Avatar on right for sent messages (user2) */}
        {!isUser1 && <UserAvatar user={sender} size="sm" />}
      </div>
    </div>
  )
})

VirtualizedRow.displayName = 'VirtualizedRow'

function TimelineView({ messages, user1, user2 }: ViewProps) {
  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    messages,
    user1,
    user2
  }), [messages, user1, user2])

  // Use virtual scrolling for performance
  return (
    <div data-testid="virtual-list-container">
      <List
        height={600} // Adjust based on viewport
        itemCount={messages.length}
        // itemSize: 160px accommodates chat bubble design with:
        // - Avatar (32px) + spacing
        // - Chat bubble content with padding (variable, avg ~60-80px)
        // - Timestamp line (~20px)
        // - Conversation link (~20px)
        // - Bottom margin (8px)
        // NOTE: Long messages may clip. Consider VariableSizeList if issues occur.
        itemSize={160}
        width="100%"
        className="scrollbar-thin"
        itemData={itemData}
      >
        {VirtualizedRow}
      </List>
    </div>
  )
}

