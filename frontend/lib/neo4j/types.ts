/**
 * TypeScript type definitions for Neo4j data models
 *
 * This module contains all interface definitions used throughout the application.
 * Separating types improves maintainability and allows for easy imports.
 */

// Core Data Models

export interface User {
  userId: string;
  email: string;
  name: string;
  username: string;
  status: string;
  role: string;
  avatarUrl: string;
  bio: string;
  lastSeen: string;
  department?: string;
  location?: string;
}

export interface Conversation {
  conversationId: string;
  title: string;
  type: string;
  priority: string;
  tags: string[];
  createdAt: string;
  lastMessageTimestamp: string;
  lastMessagePreview: string;
  unreadCount?: number;
}

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: string;
  type: string;
  reactions: string[];
  edited?: boolean;
}

export interface ConversationSummary {
  conversationId: string;
  title: string;
  participantCount: number;
  messageCount: number;
  lastMessageTimestamp: string;
  type: string;
  priority: string;
}

export interface UserSummary {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  conversationCount: number;
  messageCount: number;
  lastActiveTimestamp: string;
}

// Communication Analysis Types

export interface TimelineMessage {
  messageId: string;
  content: string;
  senderId: string;
  timestamp: string;
  conversationId: string;
  conversationTitle: string;
}

export interface SharedConversation {
  conversationId: string;
  title: string;
  type: 'group' | 'direct';
  messageCount: number;
  user1MessageCount: number;
  user2MessageCount: number;
  lastMessageTimestamp: string;
  participants: UserSummary[];
}

export interface CommunicationStats {
  totalSharedConversations: number;
  totalMessages: number;
  user1Messages: number;
  user2Messages: number;
  firstInteraction: string | null;
  lastInteraction: string | null;
}

export interface UserCommunicationData {
  user1: UserSummary | null;
  user2: UserSummary | null;
  sharedConversations: SharedConversation[];
  communicationStats: CommunicationStats;
  messageTimeline: TimelineMessage[];
  pagination: PaginationInfo;
}

// Analytics Types

export interface AggregatedCommunicationData {
  frequency: FrequencyDataPoint[];
  responseTime: ResponseTimeAnalysis;
  activityHeatmap: ActivityHeatmapPoint[];
  talkToListenRatio: TalkListenRatio;
  conversationTypes: ConversationTypeDistribution[];
}

export interface FrequencyDataPoint {
  date: string;
  totalMessages: number;
  user1Messages: number;
  user2Messages: number;
}

export interface ResponseTimeAnalysis {
  avgResponseTime: number;
  medianResponseTime: number;
  distribution: ResponseTimeDistribution[];
}

export interface ResponseTimeDistribution {
  range: string;
  count: number;
}

export interface ActivityHeatmapPoint {
  hour: number;
  dayOfWeek: number;
  messageCount: number;
}

export interface TalkListenRatio {
  user1Messages: number;
  user2Messages: number;
  user1Percentage: number;
  user2Percentage: number;
}

export interface ConversationTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

// Utility Types

/**
 * Pagination information for query results
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Type definition for user contact
export interface UserContact extends User {
  communicationStats: {
    sharedConversationCount: number;
    totalMessageCount: number;
    lastInteraction: string;
    firstInteraction: string;
  };
}
