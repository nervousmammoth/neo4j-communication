import type { ConversationSummary, UserSummary, UserCommunicationData, User, AggregatedCommunicationData } from "@/lib/neo4j";

// Helper function to get the base URL for API calls
function getBaseUrl(): string {
  // In test environment or when explicitly set, use the configured URL
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }
  
  // In client-side code, we can use relative URLs
  if (typeof window !== 'undefined') {
    return '';
  }
  
  // Default to localhost with the port from env or 3000 (server-side)
  return `http://localhost:${process.env.PORT || 3000}`;
}

export interface ConversationDetail {
  conversationId: string
  title: string | null
  type: string
  priority: string
  createdAt: string
  tags: string[]
  participants: Participant[]
}

export interface Participant {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  status: string
}

export interface Message {
  messageId: string
  content: string
  senderId: string
  timestamp: string
  status: string
  type: string
  reactions: Record<string, number>
}

export interface MessagesResponse {
  messages: Message[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface PaginatedResponse {
  conversations: ConversationSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getConversations(): Promise<ConversationSummary[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/conversations`, {
      next: { revalidate: 300 }  // Cache for 5 minutes
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch conversations');
    }
    
    const data = await res.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object');
    }
    
    if (!Array.isArray(data.conversations)) {
      throw new Error('Invalid API response: conversations must be an array');
    }
    
    // Validate each conversation has required fields
    data.conversations.forEach((conv: ConversationSummary, index: number) => {
      if (!conv.conversationId || typeof conv.conversationId !== 'string') {
        throw new Error(`Invalid conversation at index ${index}: missing or invalid conversationId`);
      }
    });
    
    return data.conversations;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

export async function getConversationDetail(conversationId: string): Promise<ConversationDetail> {
  try {
    const url = `${getBaseUrl()}/api/conversations/${conversationId}`;
    
    const res = await fetch(url, {
      next: { revalidate: 60 }  // Cache for 1 minute
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch conversation detail: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object');
    }
    
    if (!data.conversationId || typeof data.conversationId !== 'string') {
      throw new Error('Invalid API response: missing conversationId');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching conversation detail:', error);
    throw error;
  }
}

export async function getConversationMessages(
  conversationId: string,
  page: number = 1,
  limit: number = 50
): Promise<MessagesResponse> {
  try {
    const baseUrl = getBaseUrl();
    const path = `/api/conversations/${conversationId}/messages`;
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    const url = `${baseUrl}${path}?${params}`;
    
    const res = await fetch(url, {
      next: { revalidate: 30 }  // Cache for 30 seconds
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch messages');
    }
    
    const data = await res.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object');
    }
    
    if (!Array.isArray(data.messages)) {
      throw new Error('Invalid API response: messages must be an array');
    }
    
    if (!data.pagination || typeof data.pagination !== 'object') {
      throw new Error('Invalid API response: missing pagination');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

export async function getConversationsPaginated(
  params?: PaginationParams,
  signal?: AbortSignal
): Promise<PaginatedResponse> {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    
    const url = queryParams.toString() 
      ? `${getBaseUrl()}/api/conversations?${queryParams.toString()}`
      : `${getBaseUrl()}/api/conversations`;
    
    const res = await fetch(url, {
      signal,
      next: { revalidate: 300 }  // Cache for 5 minutes
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch conversations');
    }
    
    const data = await res.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object');
    }
    
    if (!Array.isArray(data.conversations)) {
      throw new Error('Invalid API response: conversations must be an array');
    }
    
    if (!data.pagination || typeof data.pagination !== 'object') {
      throw new Error('Invalid API response: missing pagination');
    }
    
    // Validate pagination structure
    if (typeof data.pagination.page !== 'number') {
      throw new Error('Invalid API response: pagination page must be a number');
    }
    if (typeof data.pagination.limit !== 'number') {
      throw new Error('Invalid API response: pagination limit must be a number');
    }
    if (typeof data.pagination.total !== 'number') {
      throw new Error('Invalid API response: pagination total must be a number');
    }
    if (typeof data.pagination.totalPages !== 'number') {
      throw new Error('Invalid API response: pagination totalPages must be a number');
    }
    
    // Validate each conversation has required fields
    data.conversations.forEach((conv: ConversationSummary, index: number) => {
      if (!conv.conversationId || typeof conv.conversationId !== 'string') {
        throw new Error(`Invalid conversation at index ${index}: missing or invalid conversationId`);
      }
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Request was aborted - return empty result with requested pagination params
      return {
        conversations: [],
        pagination: { 
          page: params?.page || 1, 
          limit: params?.limit || 20, 
          total: 0, 
          totalPages: 0 
        }
      };
    }
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Search conversations with optional filters
 * @param searchParams - Search query and filter options
 * @param signal - AbortSignal for cancelling the request
 * @returns Search results with total count
 */
export async function searchConversations(
  searchParams: {
    query: string;
    type?: 'group' | 'direct';
    priority?: 'high' | 'medium' | 'low';
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  },
  signal?: AbortSignal
): Promise<{ results: ConversationSummary[]; total: number }> {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append('query', searchParams.query);

    if (searchParams.type) {
      queryParams.append('type', searchParams.type);
    }
    if (searchParams.priority) {
      queryParams.append('priority', searchParams.priority);
    }
    if (searchParams.dateFrom) {
      queryParams.append('dateFrom', searchParams.dateFrom);
    }
    if (searchParams.dateTo) {
      queryParams.append('dateTo', searchParams.dateTo);
    }
    if (searchParams.page !== undefined) {
      queryParams.append('page', searchParams.page.toString());
    }
    if (searchParams.limit !== undefined) {
      queryParams.append('limit', searchParams.limit.toString());
    }

    const url = `${getBaseUrl()}/api/conversations/search?${queryParams.toString()}`;

    const res = await fetch(url, {
      signal,
      next: { revalidate: 60 }  // Cache for 1 minute
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = typeof errorData.error === 'string'
        ? errorData.error
        : `Search failed with status ${res.status}`;
      throw new Error(errorMessage);
    }

    const data = await res.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object');
    }

    if (!Array.isArray(data.results)) {
      throw new Error('Invalid API response: results must be an array');
    }

    if (typeof data.total !== 'number') {
      throw new Error('Invalid API response: total must be a number');
    }

    // Validate each result has required fields
    data.results.forEach((conv: ConversationSummary, index: number) => {
      if (!conv.conversationId || typeof conv.conversationId !== 'string') {
        throw new Error(`Invalid conversation at index ${index}: missing or invalid conversationId`);
      }
    });

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Request was aborted - return empty result
      return {
        results: [],
        total: 0
      };
    }
    console.error('Error searching conversations:', error);
    throw error;
  }
}

interface UsersResponse {
  users: UserSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getUsersPaginated(
  params?: PaginationParams,
  signal?: AbortSignal
): Promise<UsersResponse> {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    
    const url = queryParams.toString() 
      ? `${getBaseUrl()}/api/users?${queryParams.toString()}`
      : `${getBaseUrl()}/api/users`;
    
    const res = await fetch(url, {
      signal,
      next: { revalidate: 300 }  // Cache for 5 minutes
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch users');
    }
    
    const data = await res.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object');
    }
    
    if (!Array.isArray(data.users)) {
      throw new Error('Invalid API response: users must be an array');
    }
    
    if (!data.pagination || typeof data.pagination !== 'object') {
      throw new Error('Invalid API response: missing pagination');
    }
    
    // Validate pagination structure
    if (typeof data.pagination.page !== 'number') {
      throw new Error('Invalid API response: pagination page must be a number');
    }
    if (typeof data.pagination.limit !== 'number') {
      throw new Error('Invalid API response: pagination limit must be a number');
    }
    if (typeof data.pagination.total !== 'number') {
      throw new Error('Invalid API response: pagination total must be a number');
    }
    if (typeof data.pagination.totalPages !== 'number') {
      throw new Error('Invalid API response: pagination totalPages must be a number');
    }
    
    // Validate each user has required fields
    data.users.forEach((user: UserSummary, index: number) => {
      if (!user.userId || typeof user.userId !== 'string') {
        throw new Error(`Invalid user at index ${index}: missing or invalid userId`);
      }
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Request was aborted - return empty result with requested pagination params
      return {
        users: [],
        pagination: { 
          page: params?.page || 1, 
          limit: params?.limit || 20, 
          total: 0, 
          totalPages: 0 
        }
      };
    }
    console.error('Error fetching users:', error);
    throw error;
  }
}

export interface UserDetail {
  user: {
    userId: string
    name: string
    email: string
    username?: string
    avatarUrl?: string
    bio?: string
    status: string
    lastSeen?: string
    department?: string
    location?: string
    role?: string
  }
  stats: {
    totalMessages: number
    totalConversations: number
    averageMessagesPerConversation: number
    mostActiveDay: string | null
    firstActivity: string | null
    lastActivity: string | null
    messagesByDay?: Record<string, number>
  }
  conversations: Array<{
    conversationId: string
    title: string | null
    type: string
    lastMessageTimestamp: string
    messageCount: number
    participantCount: number
  }>
  activityTimeline: Array<{
    type: string
    conversationId: string
    conversationTitle?: string
    timestamp: string
    content?: string
  }>
}

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/users/${userId}`, {
      next: { revalidate: 60 }  // Cache for 1 minute
    })
    
    if (!res.ok) {
      if (res.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch user detail: ${res.status} ${res.statusText}`)
    }
    
    const data = await res.json()
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object')
    }
    
    if (!data.user || !data.user.userId) {
      throw new Error('Invalid API response: missing user data')
    }
    
    return data
  } catch (error) {
    console.error('Error fetching user detail:', error)
    throw error
  }
}

export async function getUserCommunicationData(
  userId1: string,
  userId2: string,
  params?: PaginationParams & { conversationId?: string; dateFrom?: string; dateTo?: string }
): Promise<UserCommunicationData | null> {
  // For backwards compatibility, redirect to the enhanced getCommunicationData function
  return getCommunicationData(userId1, userId2, params);
}

/**
 * Enhanced communication data fetching with user ID normalization
 * Sorts user IDs alphabetically for consistent caching
 * Supports all communication data features including conversation filtering
 */
export async function getCommunicationData(
  userId1: string,
  userId2: string,
  params?: PaginationParams & { conversationId?: string; dateFrom?: string; dateTo?: string }
): Promise<UserCommunicationData | null> {
  // Normalize user IDs for consistent caching
  const [normalizedId1, normalizedId2] = [userId1, userId2].sort();
  
  try {
    // Build query parameters only if explicitly provided
    const queryParams = new URLSearchParams();
    
    // Only add pagination params if explicitly provided
    if (params?.page !== undefined) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    
    // Add conversation filter if provided
    if (params?.conversationId) {
      queryParams.append('conversationId', params.conversationId);
    }
    
    // Add date filtering if provided
    if (params?.dateFrom) {
      queryParams.append('dateFrom', params.dateFrom);
    }
    if (params?.dateTo) {
      queryParams.append('dateTo', params.dateTo);
    }
    
    // Build URL with or without query params
    const baseUrl = `${getBaseUrl()}/api/users/communications/${normalizedId1}/${normalizedId2}`;
    const url = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl;
    
    const res = await fetch(url, {
      next: { revalidate: 300 }  // Cache for 5 minutes
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        return null; // Return null for not found users
      }
      if (res.status === 400) {
        throw new Error('Invalid user IDs provided');
      }
      throw new Error(`Failed to fetch communication data: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object');
    }
    
    if (!data.user1 || !data.user2) {
      throw new Error('Invalid API response: missing user data');
    }
    
    if (!Array.isArray(data.sharedConversations)) {
      throw new Error('Invalid API response: sharedConversations must be an array');
    }
    
    if (!data.communicationStats || typeof data.communicationStats !== 'object') {
      throw new Error('Invalid API response: missing communicationStats');
    }
    
    if (!Array.isArray(data.messageTimeline)) {
      throw new Error('Invalid API response: messageTimeline must be an array');
    }
    
    if (!data.pagination || typeof data.pagination !== 'object') {
      throw new Error('Invalid API response: missing pagination');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching user communication data:', error);
    throw error;
  }
}

export interface UserSearchOptions {
  signal?: AbortSignal;
  excludeUserId?: string;
}

export async function searchUsers(
  query: string,
  options?: UserSearchOptions
): Promise<{ results: User[]; total: number }> {
  try {
    const params = new URLSearchParams({ query });
    if (options?.excludeUserId) {
      params.append('excludeUserId', options.excludeUserId);
    }
    
    const res = await fetch(`${getBaseUrl()}/api/users/search?${params.toString()}`, {
      signal: options?.signal,
      next: { revalidate: 60 }  // Cache for 1 minute
    });
    
    if (!res.ok) {
      throw new Error(`Failed to search users: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object');
    }
    
    if (!Array.isArray(data.results)) {
      throw new Error('Invalid API response: results must be an array');
    }
    
    if (typeof data.total !== 'number') {
      throw new Error('Invalid API response: total must be a number');
    }
    
    return {
      results: data.results,
      total: data.total
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Request was aborted
      throw error;
    }
    console.error('Error searching users:', error);
    throw error;
  }
}

/**
 * Get users who have communicated with a specific user
 * @param userId - The user ID to find contacts for
 * @param options - Search and pagination options
 * @returns List of users with communication statistics
 */
export async function getUserContacts(
  userId: string,
  options: {
    query?: string;
    page?: number;
    limit?: number;
    signal?: AbortSignal;
  } = {}
): Promise<{
  results: Array<User & {
    communicationStats: {
      sharedConversationCount: number;
      totalMessageCount: number;
      lastInteraction: string;
      firstInteraction: string;
    };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  try {
    const baseUrl = getBaseUrl();
    const params = new URLSearchParams();
    
    if (options.query) {
      params.append('query', options.query);
    }
    if (options.page) {
      params.append('page', options.page.toString());
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }
    
    const url = `${baseUrl}/api/users/${userId}/contacts?${params}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: options.signal,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (response.status === 404) {
        throw new Error(errorData?.error || 'User not found');
      }
      throw new Error(errorData?.error || `Failed to fetch user contacts: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object');
    }
    
    if (!Array.isArray(data.results)) {
      throw new Error('Invalid API response: results must be an array');
    }
    
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Request was aborted
      throw error;
    }
    console.error('Error fetching user contacts:', error);
    throw error;
  }
}

/**
 * Fetch aggregated communication data for analytics
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @param dateRange - Date range for filtering
 * @param granularity - Data granularity (daily, weekly, monthly)
 * @returns Aggregated communication data
 */
export async function fetchAggregatedData(
  userId1: string,
  userId2: string,
  dateRange: { from: Date; to: Date },
  granularity: 'daily' | 'weekly' | 'monthly'
): Promise<AggregatedCommunicationData> {
  const params = new URLSearchParams({
    dateFrom: dateRange.from.toISOString().split('T')[0],
    dateTo: dateRange.to.toISOString().split('T')[0],
    granularity
  });

  const response = await fetch(
    `${getBaseUrl()}/api/users/communications/${userId1}/${userId2}/analytics?${params}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch aggregated data');
  }

  return response.json();
}