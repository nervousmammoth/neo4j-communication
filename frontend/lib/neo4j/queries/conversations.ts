/**
 * Conversation-related Neo4j queries
 *
 * This module contains all data-fetching functions related to conversations:
 * - getConversations: Paginated conversation listing
 */

import neo4j from 'neo4j-driver';
import { executeReadQuery } from '../connection';
import type { ConversationSummary, PaginationInfo } from '../types';

/**
 * Get paginated list of all conversations with participant and message counts
 */
export async function getConversations({
  page = 1,
  limit = 20
}: {
  page?: number | string;
  limit?: number | string;
} = {}): Promise<{
  conversations: ConversationSummary[];
  pagination: PaginationInfo;
}> {
  // Validate and sanitize pagination parameters
  // Handle string inputs by converting to number first
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

  // Apply Gemini's suggestion: remove redundant Math.max since ternary ensures value >= 1
  const validPage = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  const validLimit = Math.min(100, Math.max(1, Number.isInteger(limitNum) && limitNum > 0 ? limitNum : 20));
  const skip = (validPage - 1) * validLimit;

  // First, get the total count of conversations
  const countQuery = 'MATCH (c:Conversation) RETURN count(c) as total';
  const countResult = await executeReadQuery(countQuery);
  const totalRecord = countResult.records[0];
  const totalCount = totalRecord.get('total') || 0;

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / validLimit);

  // Then, get the paginated data with optimized query
  // Key optimization: Apply pagination BEFORE calculating counts
  const dataQuery = `
    MATCH (c:Conversation)
    WITH c
    ORDER BY c.lastMessageTimestamp DESC
    SKIP $skip
    LIMIT $limit
    RETURN {
      conversationId: c.conversationId,
      title: c.title,
      type: c.type,
      priority: c.priority,
      lastMessageTimestamp: c.lastMessageTimestamp,
      participantCount: COUNT { (:User)-[:PARTICIPATES_IN]->(c) },
      messageCount: COUNT { (:Message)-[:BELONGS_TO]->(c) }
    } as conversation
  `;

  // Even with disableLosslessIntegers: true, we need to use neo4j.int() for parameters
  // to ensure they're sent as integers to Neo4j
  const result = await executeReadQuery(dataQuery, {
    skip: neo4j.int(skip),
    limit: neo4j.int(validLimit)
  });

  const conversations: ConversationSummary[] = result.records.map(record => {
    const conv = record.get('conversation');
    return {
      conversationId: conv.conversationId,
      title: conv.title,
      participantCount: conv.participantCount,
      messageCount: conv.messageCount,
      lastMessageTimestamp: neo4j.isDateTime(conv.lastMessageTimestamp)
        ? conv.lastMessageTimestamp.toString()
        : conv.lastMessageTimestamp,
      type: conv.type,
      priority: conv.priority,
    };
  });

  return {
    conversations,
    pagination: {
      page: validPage,
      limit: validLimit,
      total: totalCount,
      totalPages,
    },
  };
}

/**
 * Search conversations by title, participant names, with optional filters
 * @param query - Search query string
 * @param type - Filter by conversation type (group/direct)
 * @param priority - Filter by priority level
 * @param dateFrom - Filter by minimum last message timestamp
 * @param dateTo - Filter by maximum last message timestamp
 * @param page - Page number for pagination (1-indexed)
 * @param limit - Number of results per page
 * @returns Search results with pagination info
 */
export async function searchConversations({
  query,
  type,
  priority,
  dateFrom,
  dateTo,
  page = 1,
  limit = 20
}: {
  query: string;
  type?: 'group' | 'direct';
  priority?: 'high' | 'medium' | 'low';
  dateFrom?: string;
  dateTo?: string;
  page?: number | string;
  limit?: number | string;
}): Promise<{
  results: ConversationSummary[];
  total: number;
}> {
  // Validate and sanitize query
  const trimmedQuery = query.trim();

  // Return empty results for empty query
  if (!trimmedQuery) {
    return { results: [], total: 0 };
  }

  // Validate and sanitize pagination parameters
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

  const validPage = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  const validLimit = Math.min(100, Math.max(1, Number.isInteger(limitNum) && limitNum > 0 ? limitNum : 20));
  const skip = (validPage - 1) * validLimit;

  // Build WHERE clause with search and filter conditions
  const whereConditions: string[] = [
    `(toLower(c.title) CONTAINS toLower($query) OR EXISTS { MATCH (u:User)-[:PARTICIPATES_IN]->(c) WHERE toLower(u.name) CONTAINS toLower($query) })`
  ];

  // Build parameters object with proper typing
  const queryParams: Record<string, string> = { query: trimmedQuery };

  // Add optional filters
  if (type) {
    whereConditions.push('c.type = $type');
    queryParams.type = type;
  }

  if (priority) {
    whereConditions.push('c.priority = $priority');
    queryParams.priority = priority;
  }

  if (dateFrom) {
    whereConditions.push('c.lastMessageTimestamp >= datetime($dateFrom)');
    queryParams.dateFrom = dateFrom;
  }

  if (dateTo) {
    whereConditions.push('c.lastMessageTimestamp <= datetime($dateTo)');
    queryParams.dateTo = dateTo;
  }

  const whereClause = whereConditions.join(' AND ');

  // Count query
  const countQuery = `
    MATCH (c:Conversation)
    WHERE ${whereClause}
    RETURN COUNT(c) as total
  `;

  const countResult = await executeReadQuery(countQuery, queryParams);
  const totalValue = countResult.records[0]?.get('total');
  const total = typeof totalValue === 'number' ? totalValue : (totalValue?.toNumber ? totalValue.toNumber() : 0);

  // If no results, return early
  if (total === 0) {
    return { results: [], total: 0 };
  }

  // Data query with relevance scoring
  const dataQuery = `
    MATCH (c:Conversation)
    WHERE ${whereClause}
    WITH c,
      CASE
        WHEN toLower(c.title) = toLower($query) THEN 1
        WHEN toLower(c.title) STARTS WITH toLower($query) THEN 2
        WHEN toLower(c.title) CONTAINS toLower($query) THEN 3
        ELSE 4
      END as relevance
    ORDER BY relevance, c.lastMessageTimestamp DESC
    SKIP $skip
    LIMIT $limit
    RETURN {
      conversationId: c.conversationId,
      title: c.title,
      type: c.type,
      priority: c.priority,
      lastMessageTimestamp: c.lastMessageTimestamp,
      participantCount: COUNT { (:User)-[:PARTICIPATES_IN]->(c) },
      messageCount: COUNT { (:Message)-[:BELONGS_TO]->(c) }
    } as conversation
  `;

  const dataParams = {
    ...queryParams,
    skip: neo4j.int(skip),
    limit: neo4j.int(validLimit)
  };

  const result = await executeReadQuery(dataQuery, dataParams);

  const results: ConversationSummary[] = result.records.map(record => {
    const conv = record.get('conversation');
    return {
      conversationId: conv.conversationId,
      title: conv.title,
      participantCount: conv.participantCount,
      messageCount: conv.messageCount,
      lastMessageTimestamp: neo4j.isDateTime(conv.lastMessageTimestamp)
        ? conv.lastMessageTimestamp.toString()
        : conv.lastMessageTimestamp,
      type: conv.type,
      priority: conv.priority,
    };
  });

  return {
    results,
    total
  };
}
