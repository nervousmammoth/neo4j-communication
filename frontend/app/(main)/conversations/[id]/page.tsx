import Link from 'next/link'
import neo4j from 'neo4j-driver'
import { executeReadQuery } from '@/lib/neo4j'
import ConversationHeader from '@/components/conversation-header'
import ParticipantList from '@/components/participant-list'
import MessageList from '@/components/message-list'
import type { ConversationDetail } from '@/lib/api-client'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ConversationDetailPage({
  params,
  searchParams
}: PageProps) {
  try {
    const { id: conversationId } = await params
    const resolvedSearchParams = searchParams ? await searchParams : undefined
    const from = resolvedSearchParams?.from as string | undefined
    
    // Fetch data directly from Neo4j instead of going through the API route
    const result = await executeReadQuery(
      `
      MATCH (c:Conversation {conversationId: $conversationId})
      OPTIONAL MATCH (u:User)-[:PARTICIPATES_IN]->(c)
      WITH c, collect(DISTINCT u {
        userId: u.userId,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        status: u.status
      }) as participants
      RETURN {
        conversationId: c.conversationId,
        title: c.title,
        type: c.type,
        priority: c.priority,
        createdAt: c.createdAt,
        tags: c.tags,
        participants: participants
      } as conversation
      `,
      { conversationId }
    )

    if (result.records.length === 0) {
      throw new Error('Conversation not found')
    }

    const conversation = result.records[0].get('conversation') as ConversationDetail
    
    // Convert Neo4j DateTime to ISO string if needed
    if (neo4j.isDateTime(conversation.createdAt)) {
      conversation.createdAt = conversation.createdAt.toString()
    }

    return (
      <main className="flex min-h-screen flex-col p-4 md:p-8">
        <div className="mb-4">
          <Link 
            href={`/conversations?page=${from || '1'}`} 
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Back to Conversations
          </Link>
        </div>

        <div className="space-y-6">
          <ConversationHeader conversation={conversation} />
          <ParticipantList participants={conversation.participants} />
          <MessageList conversationId={conversation.conversationId} />
        </div>
      </main>
    )
  } catch (error) {
    console.error('Page error:', error)
    throw error
  }
}