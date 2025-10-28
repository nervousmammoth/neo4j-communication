// Re-export types from the new modular structure
export type {
  User,
  Conversation,
  Message,
  ConversationSummary,
  UserSummary,
  TimelineMessage,
  SharedConversation,
  CommunicationStats,
  UserCommunicationData,
  AggregatedCommunicationData,
  FrequencyDataPoint,
  ResponseTimeAnalysis,
  ResponseTimeDistribution,
  ActivityHeatmapPoint,
  TalkListenRatio,
  ConversationTypeDistribution,
  PaginationInfo,
  UserContact,
} from './neo4j/types';

// Re-export utility functions from the new modular structure
export { formatDateTime, convertNeo4jIntegers } from './neo4j/utils';

// Re-export connection functions from the new modular structure
export {
  getDriver,
  getSession,
  closeDriver,
  resetDriver,
  executeReadQuery,
  testConnection
} from './neo4j/connection';

// Re-export user query functions from the new modular structure
export {
  getUsers,
  getUserSummaries,
  searchUsers,
  getUserContacts
} from './neo4j/queries/users';

// Re-export conversation query functions from the new modular structure
export { getConversations, searchConversations } from './neo4j/queries/conversations';

// Re-export analytics query functions from the new modular structure
export {
  getUserCommunicationData,
  getAggregatedCommunicationData
} from './neo4j/queries/analytics';