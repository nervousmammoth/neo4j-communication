import { NextRequest, NextResponse } from 'next/server'
import { getConversationById } from '@/lib/neo4j/queries/conversations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params

  if (!conversationId) {
    return NextResponse.json(
      { error: 'Conversation ID is required' },
      { status: 400 }
    )
  }

  try {
    const conversation = await getConversationById(conversationId)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
