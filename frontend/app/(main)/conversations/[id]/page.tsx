import Link from 'next/link'
import { getConversationDetail } from '@/lib/api-client'
import ConversationHeader from '@/components/conversation-header'
import ParticipantList from '@/components/participant-list'
import MessageList from '@/components/message-list'

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

    // Use API client to fetch conversation data
    const conversation = await getConversationDetail(conversationId)

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
