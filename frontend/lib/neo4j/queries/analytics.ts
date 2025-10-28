/**
 * Analytics-related Neo4j queries
 *
 * This module contains all data-fetching functions related to communication analytics:
 * - getUserCommunicationData: Comprehensive user-to-user communication analysis
 * - getAggregatedCommunicationData: Server-side aggregated analytics data
 */

import neo4j from 'neo4j-driver';
import { executeReadQuery } from '../connection';
import { formatDateTime } from '../utils';
import { getUserSummaries } from './users';
import type {
  UserCommunicationData,
  AggregatedCommunicationData,
  SharedConversation,
  CommunicationStats,
  TimelineMessage,
  FrequencyDataPoint,
  ResponseTimeAnalysis,
  ActivityHeatmapPoint,
  TalkListenRatio,
  ConversationTypeDistribution,
} from '../types';

/**
 * Get comprehensive communication data between two users
 * Includes shared conversations, message timeline, and statistics
 */
export async function getUserCommunicationData(
  userId1: string,
  userId2: string,
  options: { page?: number; limit?: number; conversationId?: string; dateFrom?: string; dateTo?: string } = {}
): Promise<UserCommunicationData> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 50));
  const skip = (page - 1) * limit;

  // Build date filter conditions
  const dateFilters = [];
  if (options.dateFrom) {
    dateFilters.push('m.timestamp >= $dateFrom');
  }
  if (options.dateTo) {
    dateFilters.push('m.timestamp <= $dateTo');
  }
  const dateFilterClause = dateFilters.length > 0 ? ` AND ${dateFilters.join(' AND ')}` : '';

  // Get user summaries
  const userMap = await getUserSummaries([userId1, userId2]);
  const user1 = userMap.get(userId1) || null;
  const user2 = userMap.get(userId2) || null;

  // If either user doesn't exist, return empty data
  if (!user1 || !user2) {
    return {
      user1,
      user2,
      sharedConversations: [],
      communicationStats: {
        totalSharedConversations: 0,
        totalMessages: 0,
        user1Messages: 0,
        user2Messages: 0,
        firstInteraction: null,
        lastInteraction: null,
      },
      messageTimeline: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  // Get shared conversations with message counts
  const conversationsQuery = `
    MATCH (u1:User {userId: $userId1})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User {userId: $userId2})
    WITH c
    ORDER BY c.lastMessageTimestamp DESC
    CALL {
      WITH c
      OPTIONAL MATCH (c)<-[:BELONGS_TO]-(m:Message)
      RETURN count(m) as totalMessages,
             sum(CASE WHEN m.senderId = $userId1 THEN 1 ELSE 0 END) as user1Messages,
             sum(CASE WHEN m.senderId = $userId2 THEN 1 ELSE 0 END) as user2Messages
    }
    CALL {
      WITH c
      MATCH (u:User)-[:PARTICIPATES_IN]->(c)
      RETURN collect({
        userId: u.userId,
        name: u.name,
        email: u.email,
        avatar: u.avatarUrl,
        conversationCount: 0,
        messageCount: 0,
        lastActiveTimestamp: ''
      }) as participants
    }
    RETURN c.conversationId AS conversationId,
           c.title AS title,
           c.type AS type,
           c.lastMessageTimestamp AS lastMessageTimestamp,
           totalMessages,
           user1Messages,
           user2Messages,
           participants
  `;

  const conversationsResult = await executeReadQuery(conversationsQuery, { userId1, userId2 });

  const sharedConversations: SharedConversation[] = conversationsResult.records.map(record => ({
    conversationId: record.get('conversationId'),
    title: record.get('title') || 'Untitled Conversation',
    type: record.get('type') === 'direct' ? 'direct' : 'group',
    messageCount: record.get('totalMessages') || 0,
    user1MessageCount: record.get('user1Messages') || 0,
    user2MessageCount: record.get('user2Messages') || 0,
    lastMessageTimestamp: formatDateTime(record.get('lastMessageTimestamp')) || '',
    participants: record.get('participants') || [],
  }));

  // Get communication statistics
  const statsQuery = `
    MATCH (u1:User {userId: $userId1})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User {userId: $userId2})
    OPTIONAL MATCH (c)<-[:BELONGS_TO]-(m:Message)
    WHERE m.senderId IN [$userId1, $userId2]${dateFilterClause}
    WITH count(DISTINCT c) as totalConversations,
         count(m) as totalMessages,
         sum(CASE WHEN m.senderId = $userId1 THEN 1 ELSE 0 END) as user1Messages,
         sum(CASE WHEN m.senderId = $userId2 THEN 1 ELSE 0 END) as user2Messages,
         min(m.timestamp) as firstInteraction,
         max(m.timestamp) as lastInteraction
    RETURN totalConversations, totalMessages, user1Messages, user2Messages, firstInteraction, lastInteraction
  `;

  const statsParams: Record<string, string> = { userId1, userId2 };
  if (options.dateFrom) {
    statsParams.dateFrom = options.dateFrom;
  }
  if (options.dateTo) {
    statsParams.dateTo = options.dateTo;
  }
  const statsResult = await executeReadQuery(statsQuery, statsParams);
  const statsRecord = statsResult.records[0];

  const communicationStats: CommunicationStats = {
    totalSharedConversations: statsRecord?.get('totalConversations') || 0,
    totalMessages: statsRecord?.get('totalMessages') || 0,
    user1Messages: statsRecord?.get('user1Messages') || 0,
    user2Messages: statsRecord?.get('user2Messages') || 0,
    firstInteraction: statsRecord ? formatDateTime(statsRecord.get('firstInteraction')) : null,
    lastInteraction: statsRecord ? formatDateTime(statsRecord.get('lastInteraction')) : null,
  };

  // Get total count for pagination
  const conversationFilter = options.conversationId ? ' AND c.conversationId = $conversationId' : '';
  const countQuery = `
    MATCH (u1:User {userId: $userId1})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User {userId: $userId2})
    MATCH (c)<-[:BELONGS_TO]-(m:Message)
    WHERE m.senderId IN [$userId1, $userId2]${conversationFilter}${dateFilterClause}
    RETURN count(m) as total
  `;

  const countParams: Record<string, string> = { userId1, userId2 };
  if (options.conversationId) {
    countParams.conversationId = options.conversationId;
  }
  if (options.dateFrom) {
    countParams.dateFrom = options.dateFrom;
  }
  if (options.dateTo) {
    countParams.dateTo = options.dateTo;
  }

  const countResult = await executeReadQuery(countQuery, countParams);
  const totalCount = countResult.records[0]?.get('total') || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Get paginated message timeline
  const timelineQuery = `
    MATCH (u1:User {userId: $userId1})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User {userId: $userId2})
    MATCH (c)<-[:BELONGS_TO]-(m:Message)
    WHERE m.senderId IN [$userId1, $userId2]${conversationFilter}${dateFilterClause}
    RETURN m.messageId AS messageId,
           m.content AS content,
           m.senderId AS senderId,
           m.timestamp AS timestamp,
           c.conversationId AS conversationId,
           c.title AS conversationTitle
    ORDER BY m.timestamp DESC
    SKIP $skip
    LIMIT $limit
  `;

  const timelineParams: Record<string, string | ReturnType<typeof neo4j.int>> = {
    userId1,
    userId2,
    skip: neo4j.int(skip),
    limit: neo4j.int(limit),
  };
  if (options.conversationId) {
    timelineParams.conversationId = options.conversationId;
  }
  if (options.dateFrom) {
    timelineParams.dateFrom = options.dateFrom;
  }
  if (options.dateTo) {
    timelineParams.dateTo = options.dateTo;
  }

  const timelineResult = await executeReadQuery(timelineQuery, timelineParams);

  const messageTimeline: TimelineMessage[] = timelineResult.records.map(record => ({
    messageId: record.get('messageId'),
    content: record.get('content'),
    senderId: record.get('senderId'),
    timestamp: formatDateTime(record.get('timestamp')) || '',
    conversationId: record.get('conversationId'),
    conversationTitle: record.get('conversationTitle') || 'Untitled Conversation',
  }));

  return {
    user1,
    user2,
    sharedConversations,
    communicationStats,
    messageTimeline,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
    },
  };
}

/**
 * Get aggregated communication data for analytics
 */
export async function getAggregatedCommunicationData(
  userId1: string,
  userId2: string,
  options: {
    dateFrom?: string;
    dateTo?: string;
    granularity?: 'daily' | 'weekly' | 'monthly';
  } = {}
): Promise<AggregatedCommunicationData> {
  const { dateFrom, dateTo, granularity = 'daily' } = options;

  // Build date filter clause
  const dateFilters = [];
  if (dateFrom) dateFilters.push('m.timestamp >= $dateFrom');
  if (dateTo) dateFilters.push('m.timestamp <= $dateTo');
  const dateFilterClause = dateFilters.length > 0 ? ` AND ${dateFilters.join(' AND ')}` : '';

  // Get frequency data based on granularity
  const getDateFormat = () => {
    switch (granularity) {
      case 'monthly':
        return 'datetime.truncate("month", m.timestamp)';
      case 'weekly':
        return 'datetime.truncate("week", m.timestamp)';
      default:
        return 'datetime.truncate("day", m.timestamp)';
    }
  };

  const frequencyQuery = `
    MATCH (u1:User {userId: $userId1})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User {userId: $userId2})
    MATCH (c)<-[:BELONGS_TO]-(m:Message)
    WHERE m.senderId IN [$userId1, $userId2]${dateFilterClause}
    WITH ${getDateFormat()} AS period,
         COUNT(m) AS totalMessages,
         SUM(CASE WHEN m.senderId = $userId1 THEN 1 ELSE 0 END) AS user1Messages,
         SUM(CASE WHEN m.senderId = $userId2 THEN 1 ELSE 0 END) AS user2Messages
    ORDER BY period
    RETURN period, totalMessages, user1Messages, user2Messages
  `;

  const frequencyParams: Record<string, string> = { userId1, userId2 };
  if (dateFrom) frequencyParams.dateFrom = dateFrom;
  if (dateTo) frequencyParams.dateTo = dateTo;

  const frequencyResult = await executeReadQuery(frequencyQuery, frequencyParams);

  const frequency: FrequencyDataPoint[] = frequencyResult.records.map(record => ({
    date: formatDateTime(record.get('period')) || '',
    totalMessages: record.get('totalMessages') || 0,
    user1Messages: record.get('user1Messages') || 0,
    user2Messages: record.get('user2Messages') || 0,
  }));

  // Get response time analysis
  const responseTimeQuery = `
    MATCH (u1:User {userId: $userId1})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User {userId: $userId2})
    MATCH (c)<-[:BELONGS_TO]-(m1:Message), (c)<-[:BELONGS_TO]-(m2:Message)
    WHERE m1.senderId IN [$userId1, $userId2]
      AND m2.senderId IN [$userId1, $userId2]
      AND m1.senderId <> m2.senderId
      AND m2.timestamp > m1.timestamp
      ${dateFilterClause.replaceAll('m.', 'm1.')}
    WITH m1, m2, duration.between(m1.timestamp, m2.timestamp) AS responseTime
    WHERE responseTime.milliseconds < 86400000 // Only consider responses within 24 hours
    WITH responseTime.milliseconds AS responseMs
    RETURN AVG(responseMs) AS avgResponseTime,
           percentileCont(responseMs, 0.5) AS medianResponseTime,
           SUM(CASE WHEN responseMs < 3600000 THEN 1 ELSE 0 END) AS under1Hour,
           SUM(CASE WHEN responseMs >= 3600000 AND responseMs < 21600000 THEN 1 ELSE 0 END) AS between1And6Hours,
           SUM(CASE WHEN responseMs >= 21600000 AND responseMs < 86400000 THEN 1 ELSE 0 END) AS between6And24Hours,
           COUNT(responseMs) AS totalResponses
  `;

  const responseTimeResult = await executeReadQuery(responseTimeQuery, frequencyParams);
  const responseRecord = responseTimeResult.records[0];

  const responseTime: ResponseTimeAnalysis = {
    avgResponseTime: responseRecord?.get('avgResponseTime') || 0,
    medianResponseTime: responseRecord?.get('medianResponseTime') || 0,
    distribution: [
      { range: '<1h', count: responseRecord?.get('under1Hour') || 0 },
      { range: '1-6h', count: responseRecord?.get('between1And6Hours') || 0 },
      { range: '6-24h', count: responseRecord?.get('between6And24Hours') || 0 },
    ]
  };

  // Get activity heatmap
  const activityQuery = `
    MATCH (u1:User {userId: $userId1})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User {userId: $userId2})
    MATCH (c)<-[:BELONGS_TO]-(m:Message)
    WHERE m.senderId IN [$userId1, $userId2]${dateFilterClause}
    WITH m.timestamp.hour AS hour,
         m.timestamp.dayOfWeek AS dayOfWeek,
         COUNT(m) AS messageCount
    RETURN hour, dayOfWeek, messageCount
    ORDER BY dayOfWeek, hour
  `;

  const activityResult = await executeReadQuery(activityQuery, frequencyParams);

  const activityHeatmap: ActivityHeatmapPoint[] = activityResult.records.map(record => ({
    hour: record.get('hour') || 0,
    dayOfWeek: record.get('dayOfWeek') || 1,
    messageCount: record.get('messageCount') || 0,
  }));

  // Get talk-to-listen ratio
  const talkListenQuery = `
    MATCH (u1:User {userId: $userId1})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User {userId: $userId2})
    MATCH (c)<-[:BELONGS_TO]-(m:Message)
    WHERE m.senderId IN [$userId1, $userId2]${dateFilterClause}
    WITH SUM(CASE WHEN m.senderId = $userId1 THEN 1 ELSE 0 END) AS user1Messages,
         SUM(CASE WHEN m.senderId = $userId2 THEN 1 ELSE 0 END) AS user2Messages
    RETURN user1Messages, user2Messages
  `;

  const talkListenResult = await executeReadQuery(talkListenQuery, frequencyParams);
  const talkListenRecord = talkListenResult.records[0];

  const user1Msgs = talkListenRecord?.get('user1Messages') || 0;
  const user2Msgs = talkListenRecord?.get('user2Messages') || 0;
  const totalMsgs = user1Msgs + user2Msgs;

  const talkToListenRatio: TalkListenRatio = {
    user1Messages: user1Msgs,
    user2Messages: user2Msgs,
    user1Percentage: totalMsgs > 0 ? (user1Msgs / totalMsgs) * 100 : 50,
    user2Percentage: totalMsgs > 0 ? (user2Msgs / totalMsgs) * 100 : 50,
  };

  // Get conversation type distribution
  const conversationTypesQuery = `
    MATCH (u1:User {userId: $userId1})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User {userId: $userId2})
    WITH c.type AS type, COUNT(DISTINCT c) AS count
    WITH collect({type: type, count: count}) AS types, SUM(count) AS total
    UNWIND types AS t
    RETURN t.type AS type, t.count AS count, (t.count * 100.0 / total) AS percentage
  `;

  const conversationTypesResult = await executeReadQuery(conversationTypesQuery, { userId1, userId2 });

  const conversationTypes: ConversationTypeDistribution[] = conversationTypesResult.records.map(record => ({
    type: record.get('type') || 'unknown',
    count: record.get('count') || 0,
    percentage: record.get('percentage') || 0,
  }));

  return {
    frequency,
    responseTime,
    activityHeatmap,
    talkToListenRatio,
    conversationTypes
  };
}
