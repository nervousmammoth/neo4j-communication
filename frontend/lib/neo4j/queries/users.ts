/**
 * User-related Neo4j queries
 *
 * This module contains all data-fetching functions related to users:
 * - getUsers: Paginated user listing
 * - getUserSummaries: Batch user information retrieval
 * - searchUsers: User search functionality
 * - getUserContacts: User contact relationships
 */

import neo4j from 'neo4j-driver';
import { executeReadQuery } from '../connection';
import { formatDateTime } from '../utils';
import type { User, UserSummary, PaginationInfo, UserContact } from '../types';

/**
 * Get paginated list of all users with conversation and message counts
 */
export async function getUsers({
  page = 1,
  limit = 20
}: {
  page?: number | string;
  limit?: number | string;
} = {}): Promise<{
  users: UserSummary[];
  pagination: PaginationInfo;
}> {
  // Validate and sanitize pagination parameters
  // Handle string inputs by converting to number first
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

  // Apply validation: remove redundant Math.max since ternary ensures value >= 1
  const validPage = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  const validLimit = Math.min(100, Math.max(1, Number.isInteger(limitNum) && limitNum > 0 ? limitNum : 20));
  const skip = (validPage - 1) * validLimit;

  // First, get the total count
  const countQuery = 'MATCH (u:User) RETURN count(u) as total';
  const countResult = await executeReadQuery(countQuery);
  const totalRecord = countResult.records[0];
  const totalCount = totalRecord.get('total') || 0;

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / validLimit);

  // Then, get the paginated data with optimized query
  // Key optimization: Apply pagination BEFORE calculating counts
  const dataQuery = `
    MATCH (u:User)
    WITH u
    ORDER BY u.name
    SKIP $skip
    LIMIT $limit
    RETURN {
      userId: u.userId,
      name: u.name,
      avatar: u.avatarUrl,
      email: u.email,
      lastActiveTimestamp: u.lastSeen,
      conversationCount: COUNT { (u)-[:PARTICIPATES_IN]->(:Conversation) },
      messageCount: COUNT { (u)-[:SENT]->(:Message) }
    } as user
  `;

  // Even with disableLosslessIntegers: true, we need to use neo4j.int() for parameters
  // to ensure they're sent as integers to Neo4j
  const result = await executeReadQuery(dataQuery, {
    skip: neo4j.int(skip),
    limit: neo4j.int(validLimit)
  });

  const users: UserSummary[] = result.records.map(record => {
    const user = record.get('user');
    return {
      userId: user.userId,
      name: user.name,
      avatar: user.avatar,
      email: user.email,
      conversationCount: user.conversationCount,
      messageCount: user.messageCount,
      lastActiveTimestamp: neo4j.isDateTime(user.lastActiveTimestamp)
        ? user.lastActiveTimestamp.toString()
        : user.lastActiveTimestamp,
    };
  });

  return {
    users,
    pagination: {
      page: validPage,
      limit: validLimit,
      total: totalCount,
      totalPages,
    },
  };
}

/**
 * Get user summaries for multiple users by their IDs
 * Used to fetch basic user information efficiently
 */
export async function getUserSummaries(userIds: string[]): Promise<Map<string, UserSummary>> {
  if (!userIds || userIds.length === 0) {
    return new Map();
  }

  const query = `
    MATCH (u:User)
    WHERE u.userId IN $userIds
    RETURN {
      userId: u.userId,
      name: u.name,
      email: u.email,
      avatar: u.avatarUrl,
      lastActiveTimestamp: u.lastSeen,
      conversationCount: COUNT { (u)-[:PARTICIPATES_IN]->(:Conversation) },
      messageCount: COUNT { (u)-[:SENT]->(:Message) }
    } as user
  `;

  const result = await executeReadQuery(query, { userIds });

  const userMap = new Map<string, UserSummary>();
  result.records.forEach(record => {
    const user = record.get('user');
    userMap.set(user.userId, {
      userId: user.userId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      conversationCount: user.conversationCount,
      messageCount: user.messageCount,
      lastActiveTimestamp: formatDateTime(user.lastActiveTimestamp) || '',
    });
  });

  return userMap;
}

/**
 * Search for users by name, email, or username
 * Returns users matching the search query with relevance scoring
 */
export async function searchUsers({
  query,
  excludeUserId,
  page = 1,
  limit = 10
}: {
  query: string;
  excludeUserId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  results: User[];
  total: number;
}> {
  // Validate pagination parameters
  const validPage = Math.max(1, page);
  const validLimit = Math.min(50, Math.max(1, limit));
  const skip = (validPage - 1) * validLimit;

  // Build the WHERE clause
  const whereConditions = ['toLower(u.name) CONTAINS toLower($query) OR toLower(u.email) CONTAINS toLower($query) OR toLower(u.username) CONTAINS toLower($query)'];

  if (excludeUserId) {
    whereConditions.push('u.userId <> $excludeUserId');
  }

  // Count query for total results
  const countQuery = `
    MATCH (u:User)
    WHERE ${whereConditions.join(' AND ')}
    RETURN count(u) as total
  `;

  const countParams: Record<string, string> = { query };
  if (excludeUserId) {
    countParams.excludeUserId = excludeUserId;
  }

  const countResult = await executeReadQuery(countQuery, countParams);
  const totalValue = countResult.records[0]?.get('total');
  const total = typeof totalValue === 'number' ? totalValue : (totalValue?.toNumber ? totalValue.toNumber() : 0);

  // Data query with relevance scoring and pagination
  const dataQuery = `
    MATCH (u:User)
    WHERE ${whereConditions.join(' AND ')}
    WITH u,
      CASE
        WHEN toLower(u.name) STARTS WITH toLower($query) THEN 1
        WHEN toLower(u.email) STARTS WITH toLower($query) THEN 2
        WHEN toLower(u.username) STARTS WITH toLower($query) THEN 3
        ELSE 4
      END as relevance
    ORDER BY relevance, u.name
    SKIP $skip
    LIMIT $limit
    RETURN {
      userId: u.userId,
      name: u.name,
      email: u.email,
      username: u.username,
      status: u.status,
      role: u.role,
      avatarUrl: u.avatarUrl,
      department: u.department,
      location: u.location,
      bio: u.bio,
      lastSeen: u.lastSeen
    } as user
  `;

  const dataParams: Record<string, string | ReturnType<typeof neo4j.int>> = {
    query,
    skip: neo4j.int(skip),
    limit: neo4j.int(validLimit)
  };
  if (excludeUserId) {
    dataParams.excludeUserId = excludeUserId;
  }

  const result = await executeReadQuery(dataQuery, dataParams);

  const results: User[] = result.records.map(record => {
    const user = record.get('user');
    return {
      userId: user.userId,
      name: user.name,
      email: user.email,
      username: user.username,
      status: user.status,
      role: user.role,
      avatarUrl: user.avatarUrl,
      department: user.department || null,
      location: user.location || null,
      bio: user.bio || null,
      lastSeen: neo4j.isDateTime(user.lastSeen) ? user.lastSeen.toString() : user.lastSeen
    };
  });

  return {
    results,
    total
  };
}

/**
 * Get users who have communicated with a specific user
 * @param userId - The user ID to find contacts for
 * @param query - Optional search query to filter contacts
 * @param page - Page number for pagination (1-indexed)
 * @param limit - Number of results per page
 * @returns List of users with communication statistics
 */
export async function getUserContacts({
  userId,
  query = '',
  page = 1,
  limit = 20
}: {
  userId: string;
  query?: string;
  page?: number;
  limit?: number;
}): Promise<{ results: UserContact[]; total: number }> {
  // Cap limit at 1000 for performance
  const validLimit = Math.min(1000, Math.max(1, limit));

  // First check if the user exists
  const userCheckQuery = `
    MATCH (u:User {userId: $userId})
    RETURN u
    LIMIT 1
  `;

  const userResult = await executeReadQuery(userCheckQuery, { userId });
  if (userResult.records.length === 0) {
    throw new Error('User not found');
  }

  // Build the WHERE conditions for search
  const whereConditions = [];
  if (query) {
    whereConditions.push(`
      (toLower(u2.name) CONTAINS toLower($query) OR
       toLower(u2.email) CONTAINS toLower($query) OR
       toLower(u2.username) CONTAINS toLower($query))
    `);
  }
  const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : '';

  // Get total count of contacts (with search applied)
  const countQuery = `
    MATCH (u1:User {userId: $userId})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User)
    WHERE u1.userId <> u2.userId ${whereClause}
    RETURN COUNT(DISTINCT u2) as total
  `;

  const countResult = await executeReadQuery(countQuery, { userId, query });
  const totalValue = countResult.records[0]?.get('total');
  const total = typeof totalValue === 'number' ? totalValue : (totalValue?.toNumber ? totalValue.toNumber() : 0);

  if (total === 0) {
    return { results: [], total: 0 };
  }

  // Get paginated contacts with communication statistics
  const skip = (page - 1) * validLimit;

  const contactsQuery = `
    MATCH (u1:User {userId: $userId})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User)
    WHERE u1.userId <> u2.userId ${whereClause}
    WITH DISTINCT u2, u1

    // Calculate communication statistics
    CALL {
      WITH u1, u2
      MATCH (u1)-[:PARTICIPATES_IN]->(conv:Conversation)<-[:PARTICIPATES_IN]-(u2)
      RETURN COUNT(DISTINCT conv) as sharedConversationCount
    }

    CALL {
      WITH u1, u2
      MATCH (u1)-[:PARTICIPATES_IN]->(conv:Conversation)<-[:PARTICIPATES_IN]-(u2)
      MATCH (m:Message)-[:BELONGS_TO]->(conv)
      WHERE m.senderId IN [u1.userId, u2.userId]
      RETURN COUNT(m) as totalMessageCount
    }

    CALL {
      WITH u1, u2
      MATCH (u1)-[:PARTICIPATES_IN]->(conv:Conversation)<-[:PARTICIPATES_IN]-(u2)
      MATCH (m:Message)-[:BELONGS_TO]->(conv)
      WHERE m.senderId IN [u1.userId, u2.userId]
      RETURN MIN(m.timestamp) as firstInteraction, MAX(m.timestamp) as lastInteraction
    }

    RETURN u2, sharedConversationCount, totalMessageCount, firstInteraction, lastInteraction
    ORDER BY u2.name
    SKIP $skip
    LIMIT $limit
  `;

  const result = await executeReadQuery(contactsQuery, {
    userId,
    query,
    skip: neo4j.int(skip),
    limit: neo4j.int(validLimit)
  });

  const results: UserContact[] = result.records.map(record => {
    const user = record.get('u2').properties;
    const sharedCountValue = record.get('sharedConversationCount');
    const totalCountValue = record.get('totalMessageCount');
    const sharedConversationCount = typeof sharedCountValue === 'number' ? sharedCountValue : (sharedCountValue?.toNumber ? sharedCountValue.toNumber() : 0);
    const totalMessageCount = typeof totalCountValue === 'number' ? totalCountValue : (totalCountValue?.toNumber ? totalCountValue.toNumber() : 0);
    const firstInteraction = formatDateTime(record.get('firstInteraction'));
    const lastInteraction = formatDateTime(record.get('lastInteraction'));

    return {
      userId: user.userId,
      name: user.name,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl || null,
      status: user.status || 'active',
      role: user.role || 'member',
      bio: user.bio || null,
      department: user.department || null,
      location: user.location || null,
      lastSeen: formatDateTime(user.lastSeen) || '',
      communicationStats: {
        sharedConversationCount,
        totalMessageCount,
        lastInteraction: lastInteraction || '',
        firstInteraction: firstInteraction || ''
      }
    };
  });

  return { results, total };
}
