'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { getConversationMessages } from '@/lib/api-client'
import { formatMessageTime, getFullTimestamp, groupMessagesByDate } from '@/lib/timestamp'
import DateSeparator from '@/components/date-separator'
import type { Message } from '@/lib/api-client'

interface MessageListProps {
  conversationId: string
}

export default function MessageList({ conversationId }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMessages = useCallback(async (page: number) => {
    try {
      setLoading(true)
      setError(null)
      const response = await getConversationMessages(conversationId, page, 50)
      setMessages(response.messages)
      setPagination(response.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    loadMessages(1)
  }, [conversationId, loadMessages])

  // Group messages by date for display with separators
  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages])


  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Loading messages...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600">Failed to load messages: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages ({pagination.total})</CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No messages in this conversation</p>
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {messageGroups.map((group) => (
                <div key={group.date}>
                  {/* Date separator */}
                  <DateSeparator displayDate={group.displayDate} />
                  
                  {/* Messages for this date */}
                  <div className="space-y-4">
                    {group.messages.map((message) => (
                      <div key={message.messageId} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-gray-600">
                            {message.senderId.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium">{message.senderId}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-gray-500 cursor-help">
                                  {formatMessageTime(message.timestamp)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getFullTimestamp(message.timestamp)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-sm text-gray-800 mb-1">{message.content}</p>
                          {Object.entries(message.reactions).length > 0 && (
                            <div className="flex gap-2">
                              {Object.entries(message.reactions).map(([emoji, count]) => (
                                <span
                                  key={emoji}
                                  className="text-xs bg-gray-100 rounded-full px-2 py-1"
                                >
                                  {emoji} {count}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={() => loadMessages(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => loadMessages(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}