import { NextRequest, NextResponse } from 'next/server'
import { executeReadQuery, convertNeo4jIntegers } from '@/lib/neo4j'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    )
  }

  try {
    // Single comprehensive query to get all user data
    const result = await executeReadQuery(
      `
      MATCH (u:User {userId: $userId})
      
      // Get message and conversation counts
      OPTIONAL MATCH (u)-[:PARTICIPATES_IN]->(c:Conversation)
      WITH u, COUNT(DISTINCT c) as conversationCount
      
      OPTIONAL MATCH (u)-[:SENT]->(m:Message)
      WITH u, conversationCount, COUNT(DISTINCT m) as messageCount
      
      // Get user's conversations with details
      OPTIONAL MATCH (u)-[:PARTICIPATES_IN]->(conv:Conversation)
      OPTIONAL MATCH (conv)<-[:BELONGS_TO]-(msg:Message)
      WITH u, conversationCount, messageCount, conv, 
           COUNT(msg) as msgCount,
           MAX(msg.timestamp) as lastMsgTime
      ORDER BY lastMsgTime DESC
      
      // Get participant count for each conversation
      OPTIONAL MATCH (participant:User)-[:PARTICIPATES_IN]->(conv)
      WITH u, conversationCount, messageCount, conv, msgCount, lastMsgTime,
           COUNT(DISTINCT participant) as participantCount
      
      // Collect conversations (limit to 10 most recent)
      WITH u, conversationCount, messageCount, 
           COLLECT(DISTINCT {
             conversationId: conv.conversationId,
             title: conv.title,
             type: conv.type,
             lastMessageTimestamp: conv.lastMessageTimestamp,
             messageCount: msgCount,
             participantCount: participantCount
           })[0..10] as conversations
      
      // Get activity timeline (recent activities)
      OPTIONAL MATCH (u)-[:SENT]->(recentMsg:Message)
      WHERE recentMsg.timestamp > datetime() - duration('P30D')
      OPTIONAL MATCH (recentMsg)-[:BELONGS_TO]->(recentConv:Conversation)
      WITH u, conversationCount, messageCount, conversations,
           COLLECT(DISTINCT {
             type: 'message_sent',
             conversationId: recentConv.conversationId,
             conversationTitle: recentConv.title,
             timestamp: recentMsg.timestamp,
             content: SUBSTRING(recentMsg.content, 0, 100)
           })[0..20] as activityTimeline
      
      // Calculate statistics
      OPTIONAL MATCH (u)-[:SENT]->(allMsg:Message)
      WITH u, conversationCount, messageCount, conversations, activityTimeline,
           MIN(allMsg.timestamp) as firstActivity,
           MAX(allMsg.timestamp) as lastActivity
      
      // Calculate messages by day of week
      OPTIONAL MATCH (u)-[:SENT]->(dayMsg:Message)
      WITH u, conversationCount, messageCount, conversations, activityTimeline,
           firstActivity, lastActivity,
           CASE 
             WHEN dayMsg.timestamp IS NOT NULL 
             THEN date(dayMsg.timestamp).dayOfWeek
             ELSE null
           END as dayOfWeek,
           dayMsg
      WITH u, conversationCount, messageCount, conversations, activityTimeline,
           firstActivity, lastActivity,
           {
             monday: COUNT(CASE WHEN dayOfWeek = 1 THEN 1 END),
             tuesday: COUNT(CASE WHEN dayOfWeek = 2 THEN 1 END),
             wednesday: COUNT(CASE WHEN dayOfWeek = 3 THEN 1 END),
             thursday: COUNT(CASE WHEN dayOfWeek = 4 THEN 1 END),
             friday: COUNT(CASE WHEN dayOfWeek = 5 THEN 1 END),
             saturday: COUNT(CASE WHEN dayOfWeek = 6 THEN 1 END),
             sunday: COUNT(CASE WHEN dayOfWeek = 7 THEN 1 END)
           } as messagesByDayNumber
      
      // Determine most active day
      WITH u, conversationCount, messageCount, conversations, activityTimeline,
           firstActivity, lastActivity, messagesByDayNumber,
           CASE 
             WHEN messagesByDayNumber.monday >= messagesByDayNumber.tuesday 
              AND messagesByDayNumber.monday >= messagesByDayNumber.wednesday
              AND messagesByDayNumber.monday >= messagesByDayNumber.thursday
              AND messagesByDayNumber.monday >= messagesByDayNumber.friday
              AND messagesByDayNumber.monday >= messagesByDayNumber.saturday
              AND messagesByDayNumber.monday >= messagesByDayNumber.sunday
             THEN 'Monday'
             WHEN messagesByDayNumber.tuesday >= messagesByDayNumber.wednesday
              AND messagesByDayNumber.tuesday >= messagesByDayNumber.thursday
              AND messagesByDayNumber.tuesday >= messagesByDayNumber.friday
              AND messagesByDayNumber.tuesday >= messagesByDayNumber.saturday
              AND messagesByDayNumber.tuesday >= messagesByDayNumber.sunday
             THEN 'Tuesday'
             WHEN messagesByDayNumber.wednesday >= messagesByDayNumber.thursday
              AND messagesByDayNumber.wednesday >= messagesByDayNumber.friday
              AND messagesByDayNumber.wednesday >= messagesByDayNumber.saturday
              AND messagesByDayNumber.wednesday >= messagesByDayNumber.sunday
             THEN 'Wednesday'
             WHEN messagesByDayNumber.thursday >= messagesByDayNumber.friday
              AND messagesByDayNumber.thursday >= messagesByDayNumber.saturday
              AND messagesByDayNumber.thursday >= messagesByDayNumber.sunday
             THEN 'Thursday'
             WHEN messagesByDayNumber.friday >= messagesByDayNumber.saturday
              AND messagesByDayNumber.friday >= messagesByDayNumber.sunday
             THEN 'Friday'
             WHEN messagesByDayNumber.saturday >= messagesByDayNumber.sunday
             THEN 'Saturday'
             ELSE 'Sunday'
           END as mostActiveDay
      
      RETURN u {
        userId: u.userId,
        name: u.name,
        email: u.email,
        username: u.username,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        status: u.status,
        lastSeen: u.lastSeen,
        department: u.department,
        location: u.location,
        role: u.role
      } as user,
      {
        totalMessages: messageCount,
        totalConversations: conversationCount,
        averageMessagesPerConversation: CASE 
          WHEN conversationCount > 0 
          THEN toFloat(messageCount) / conversationCount 
          ELSE 0 
        END,
        mostActiveDay: CASE 
          WHEN messageCount > 0 
          THEN mostActiveDay 
          ELSE null 
        END,
        firstActivity: firstActivity,
        lastActivity: lastActivity,
        messagesByDay: {
          Monday: messagesByDayNumber.monday,
          Tuesday: messagesByDayNumber.tuesday,
          Wednesday: messagesByDayNumber.wednesday,
          Thursday: messagesByDayNumber.thursday,
          Friday: messagesByDayNumber.friday,
          Saturday: messagesByDayNumber.saturday,
          Sunday: messagesByDayNumber.sunday
        }
      } as stats,
      conversations,
      activityTimeline
      `,
      { userId }
    )

    if (result.records.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const record = result.records[0]
    const user = record.get('user')
    const stats = record.get('stats')
    const conversations = record.get('conversations')
    const activityTimeline = record.get('activityTimeline')

    // Convert all Neo4j special types (Integers and DateTimes) to JavaScript types
    const convertedUser = convertNeo4jIntegers(user)
    const convertedStats = convertNeo4jIntegers(stats)
    const convertedConversations = convertNeo4jIntegers(conversations)
    const convertedTimeline = convertNeo4jIntegers(activityTimeline)

    // Filter out null conversations and activities
    const processedConversations = Array.isArray(convertedConversations) 
      ? convertedConversations.filter((c: unknown) => 
          typeof c === 'object' && c !== null && 'conversationId' in c
        )
      : []

    const processedTimeline = Array.isArray(convertedTimeline)
      ? convertedTimeline.filter((a: unknown) => 
          typeof a === 'object' && a !== null && 'conversationId' in a
        )
      : []

    return NextResponse.json({
      user: convertedUser,
      stats: convertedStats,
      conversations: processedConversations,
      activityTimeline: processedTimeline
    })
  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch user details', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}