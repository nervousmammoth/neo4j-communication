import { NextRequest, NextResponse } from 'next/server'
import neo4j from 'neo4j-driver'
import { executeReadQuery } from '@/lib/neo4j'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const { searchParams } = new URL(request.url)
  
  if (!conversationId) {
    return NextResponse.json(
      { error: 'Conversation ID is required' },
      { status: 400 }
    )
  }

  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

  if (page < 1) {
    return NextResponse.json(
      { error: 'Invalid page number' },
      { status: 400 }
    )
  }

  if (limit < 1) {
    return NextResponse.json(
      { error: 'Invalid limit value' },
      { status: 400 }
    )
  }

  const skip = (page - 1) * limit

  try {
    // First, get the total count of messages
    const countResult = await executeReadQuery(
      `
      MATCH (m:Message)-[:BELONGS_TO]->(c:Conversation {conversationId: $conversationId})
      RETURN count(m) as count
      `,
      { conversationId }
    )

    const totalRecord = countResult.records[0].get('count')
    const total = totalRecord || 0
    const totalPages = Math.ceil(total / limit)

    // Then, get the paginated messages
    const messagesResult = await executeReadQuery(
      `
      MATCH (m:Message)-[:BELONGS_TO]->(c:Conversation {conversationId: $conversationId})
      RETURN m {
        messageId: m.messageId,
        content: m.content,
        senderId: m.senderId,
        timestamp: m.timestamp,
        status: m.status,
        type: m.type,
        reactions: m.reactions
      }
      ORDER BY m.timestamp ASC
      SKIP $skip
      LIMIT $limit
      `,
      { conversationId, skip: neo4j.int(skip), limit: neo4j.int(limit) }
    )

    const messages = messagesResult.records.map(record => {
      const message = record.get('m')
      
      // Convert Neo4j DateTime to ISO string if needed
      if (neo4j.isDateTime(message.timestamp)) {
        message.timestamp = message.timestamp.toString()
      }
      
      return message
    })

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}