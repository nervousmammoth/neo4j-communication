import { NextRequest, NextResponse } from 'next/server'
import { executeReadQuery } from '@/lib/neo4j'

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
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const conversation = result.records[0].get('conversation')
    
    // Convert Neo4j DateTime to ISO string
    if (conversation.createdAt && typeof conversation.createdAt === 'object' && 'year' in conversation.createdAt) {
      conversation.createdAt = conversation.createdAt.toString()
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