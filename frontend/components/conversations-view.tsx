'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ViewToggle } from '@/components/view-toggle'
import { ConversationsList } from '@/components/conversations-list'
import { useViewPreference } from '@/hooks/useViewPreference'
import { MessageCircle, Users, Clock } from 'lucide-react'
import Link from 'next/link'
import type { ConversationSummary } from '@/lib/neo4j'

interface ConversationsViewProps {
  conversations: ConversationSummary[]
  currentPage: number
}

export function ConversationsView({ conversations, currentPage }: ConversationsViewProps) {
  const { view, setView } = useViewPreference()

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Conversations</h1>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {/* Conversations display based on selected view */}
      {view === 'list' ? (
        <ConversationsList conversations={conversations} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conversations.map((conversation) => (
            <Link
              key={conversation.conversationId}
              href={`/conversations/${conversation.conversationId}?from=${currentPage}`}
              className="block transition-transform hover:scale-[1.02]"
            >
              <Card 
                className="h-full hover:shadow-lg transition-shadow"
                data-priority={conversation.priority}
              >
                <CardHeader>
                  <h2 className="text-lg font-semibold line-clamp-1">
                    {conversation.title || 'Untitled Conversation'}
                  </h2>
                  {conversation.priority === 'high' && (
                    <span className="text-xs text-red-600 font-medium">High Priority</span>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{conversation.participantCount} participants</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      <span>{conversation.messageCount} messages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {new Date(conversation.lastMessageTimestamp).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}