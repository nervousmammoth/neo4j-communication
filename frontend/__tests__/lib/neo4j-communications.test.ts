import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import neo4j from 'neo4j-driver';

// Create mock functions
const mockRun = vi.fn();
const mockClose = vi.fn();
const mockDriverClose = vi.fn();
const mockSessionFn = vi.fn();

// Mock the neo4j-driver module
vi.mock('neo4j-driver', () => {
  return {
    default: {
      driver: vi.fn(() => ({
        session: mockSessionFn,
        close: mockDriverClose,
      })),
      auth: {
        basic: vi.fn((user, password) => ({ user, password })),
      },
      int: vi.fn((value) => value),
      isDateTime: vi.fn(() => false),
    },
  };
});

// Import after mocking
import { getUserSummaries, getUserCommunicationData, resetDriver } from '@/lib/neo4j';

describe('Neo4j Communication Functions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockRun.mockReset();
    mockClose.mockReset();
    mockDriverClose.mockReset();
    mockSessionFn.mockReset();
    
    // Setup default mock behavior
    mockClose.mockResolvedValue(undefined);
    mockDriverClose.mockResolvedValue(undefined);
    mockSessionFn.mockReturnValue({
      run: mockRun,
      close: mockClose,
    });
    
    // Reset the driver to ensure clean state
    await resetDriver();
  });

  afterEach(async () => {
    await resetDriver();
  });

  describe('getUserSummaries', () => {
    const mockUserRecords = [
      {
        get: (key: string) => {
          if (key === 'user') {
            return {
              userId: 'user-001',
              name: 'Alice Johnson',
              email: 'alice@example.com',
              avatar: 'https://example.com/avatar1.jpg',
              lastActiveTimestamp: '2024-01-15T10:00:00Z',
              conversationCount: 5,
              messageCount: 50,
            };
          }
        },
      },
      {
        get: (key: string) => {
          if (key === 'user') {
            return {
              userId: 'user-002',
              name: 'Bob Smith',
              email: 'bob@example.com',
              avatar: null,
              lastActiveTimestamp: '2024-01-14T15:00:00Z',
              conversationCount: 3,
              messageCount: 30,
            };
          }
        },
      },
    ];

    it('should return a map of user summaries', async () => {
      mockRun.mockResolvedValue({
        records: mockUserRecords,
        summary: {} as any,
      });

      const result = await getUserSummaries(['user-001', 'user-002']);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      
      const user1 = result.get('user-001');
      expect(user1).toEqual({
        userId: 'user-001',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        avatar: 'https://example.com/avatar1.jpg',
        lastActiveTimestamp: '2024-01-15T10:00:00Z',
        conversationCount: 5,
        messageCount: 50,
      });

      const user2 = result.get('user-002');
      expect(user2).toEqual({
        userId: 'user-002',
        name: 'Bob Smith',
        email: 'bob@example.com',
        avatar: null,
        lastActiveTimestamp: '2024-01-14T15:00:00Z',
        conversationCount: 3,
        messageCount: 30,
      });
    });

    it('should return empty map for empty user IDs array', async () => {
      const result = await getUserSummaries([]);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('should return empty map for null/undefined user IDs', async () => {
      const result = await getUserSummaries(null as any);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('should handle Neo4j DateTime objects', async () => {
      const mockDateTime = {
        year: 2024,
        month: 1,
        day: 15,
        hour: 10,
        minute: 30,
        second: 45,
        toString: () => '2024-01-15T10:30:45Z',
      };

      // Mock neo4j.isDateTime
      vi.spyOn(neo4j, 'isDateTime').mockReturnValue(true);

      mockRun.mockResolvedValue({
        records: [
          {
            get: () => ({
              userId: 'user-001',
              name: 'Alice',
              email: 'alice@example.com',
              avatar: null,
              lastActiveTimestamp: mockDateTime,
              conversationCount: 0,
              messageCount: 0,
            }),
          },
        ],
        summary: {} as any,
      } as any);

      const result = await getUserSummaries(['user-001']);
      const user = result.get('user-001');
      
      expect(user?.lastActiveTimestamp).toBe('2024-01-15T10:30:45Z');
    });

    it('should handle missing lastActiveTimestamp', async () => {
      mockRun.mockResolvedValue({
        records: [
          {
            get: () => ({
              userId: 'user-001',
              name: 'Alice',
              email: 'alice@example.com',
              avatar: null,
              lastActiveTimestamp: null,
              conversationCount: 0,
              messageCount: 0,
            }),
          },
        ],
        summary: {} as any,
      } as any);

      const result = await getUserSummaries(['user-001']);
      const user = result.get('user-001');
      
      expect(user?.lastActiveTimestamp).toBe('');
    });
  });

  describe('getUserCommunicationData', () => {
    const mockUserMap = new Map([
      ['user-001', {
        userId: 'user-001',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        avatar: null,
        conversationCount: 5,
        messageCount: 50,
        lastActiveTimestamp: '2024-01-15T10:00:00Z',
      }],
      ['user-002', {
        userId: 'user-002',
        name: 'Bob Smith',
        email: 'bob@example.com',
        avatar: null,
        conversationCount: 3,
        messageCount: 30,
        lastActiveTimestamp: '2024-01-14T15:00:00Z',
      }],
    ]);

    beforeEach(() => {
      // Mock getUserSummaries to return our test data
      vi.spyOn(neo4j, 'isDateTime').mockReturnValue(false);
    });

    it('should return communication data for users with shared conversations', async () => {
      // First call: getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Second call: shared conversations query
      mockRun.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const data: any = {
                conversationId: 'conv-001',
                title: 'Team Chat',
                type: 'group',
                lastMessageTimestamp: '2024-01-15T12:00:00Z',
                totalMessages: 100,
                user1Messages: 60,
                user2Messages: 40,
                participants: [],
              };
              return data[key];
            },
          },
        ],
        summary: {} as any,
      } as any);

      // Third call: stats query
      mockRun.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const data: any = {
                totalConversations: 1,
                totalMessages: 100,
                user1Messages: 60,
                user2Messages: 40,
                firstInteraction: '2024-01-01T10:00:00Z',
                lastInteraction: '2024-01-15T12:00:00Z',
              };
              return data[key];
            },
          },
        ],
        summary: {} as any,
      } as any);

      // Fourth call: count query
      mockRun.mockResolvedValueOnce({
        records: [
          {
            get: () => 100,
          },
        ],
        summary: {} as any,
      } as any);

      // Fifth call: timeline query
      mockRun.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const data: any = {
                messageId: 'msg-001',
                content: 'Hello!',
                senderId: 'user-001',
                timestamp: '2024-01-15T12:00:00Z',
                conversationId: 'conv-001',
                conversationTitle: 'Team Chat',
              };
              return data[key];
            },
          },
        ],
        summary: {} as any,
      } as any);

      const result = await getUserCommunicationData('user-001', 'user-002');

      expect(result.user1?.userId).toBe('user-001');
      expect(result.user2?.userId).toBe('user-002');
      expect(result.sharedConversations).toHaveLength(1);
      expect(result.sharedConversations[0]).toMatchObject({
        conversationId: 'conv-001',
        title: 'Team Chat',
        type: 'group',
        messageCount: 100,
        user1MessageCount: 60,
        user2MessageCount: 40,
      });
      expect(result.communicationStats).toMatchObject({
        totalSharedConversations: 1,
        totalMessages: 100,
        user1Messages: 60,
        user2Messages: 40,
      });
      expect(result.messageTimeline).toHaveLength(1);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 50,
        total: 100,
        totalPages: 2,
      });
    });

    it('should return empty data when users do not exist', async () => {
      // Mock getUserSummaries to return empty map
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      const result = await getUserCommunicationData('nonexistent-001', 'nonexistent-002');

      expect(result.user1).toBeNull();
      expect(result.user2).toBeNull();
      expect(result.sharedConversations).toEqual([]);
      expect(result.communicationStats.totalMessages).toBe(0);
      expect(result.messageTimeline).toEqual([]);
      expect(mockRun).toHaveBeenCalledTimes(1); // Only getUserSummaries
    });

    it('should handle pagination parameters correctly', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock other queries with minimal data
      mockRun.mockResolvedValue({
        records: [],
        summary: {} as any,
      } as any);

      await getUserCommunicationData('user-001', 'user-002', { page: 3, limit: 20 });

      // Check that the timeline query was called with correct pagination
      const calls = mockRun.mock.calls;
      const timelineCall = calls[calls.length - 1]; // Last call should be timeline query
      
      expect(timelineCall[1]).toMatchObject({
        skip: neo4j.int(40), // (page 3 - 1) * limit 20
        limit: neo4j.int(20),
      });
    });

    it('should enforce pagination limits', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock other queries
      mockRun.mockResolvedValue({
        records: [],
        summary: {} as any,
      } as any);

      const result = await getUserCommunicationData('user-001', 'user-002', { 
        page: -5, 
        limit: 200 
      });

      expect(result.pagination.page).toBe(1); // Minimum page
      expect(result.pagination.limit).toBe(100); // Maximum limit
    });

    it('should handle conversations with no messages', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock conversations with 0 messages
      mockRun.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const data: any = {
                conversationId: 'conv-001',
                title: 'Empty Chat',
                type: 'direct',
                lastMessageTimestamp: null,
                totalMessages: 0,
                user1Messages: 0,
                user2Messages: 0,
                participants: [],
              };
              return data[key];
            },
          },
        ],
        summary: {} as any,
      } as any);

      // Mock stats with null interactions
      mockRun.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const data: any = {
                totalConversations: 1,
                totalMessages: 0,
                user1Messages: 0,
                user2Messages: 0,
                firstInteraction: null,
                lastInteraction: null,
              };
              return data[key];
            },
          },
        ],
        summary: {} as any,
      } as any);

      // Mock count and timeline
      mockRun.mockResolvedValue({
        records: [],
        summary: {} as any,
      } as any);

      const result = await getUserCommunicationData('user-001', 'user-002');

      expect(result.sharedConversations[0].messageCount).toBe(0);
      expect(result.communicationStats.firstInteraction).toBeNull();
      expect(result.communicationStats.lastInteraction).toBeNull();
    });

    it('should handle untitled conversations', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock conversation with null title
      mockRun.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const data: any = {
                conversationId: 'conv-001',
                title: null,
                type: 'group',
                lastMessageTimestamp: '2024-01-15T12:00:00Z',
                totalMessages: 10,
                user1Messages: 5,
                user2Messages: 5,
                participants: [],
              };
              return data[key];
            },
          },
        ],
        summary: {} as any,
      } as any);

      // Mock remaining queries
      mockRun.mockResolvedValue({
        records: [],
        summary: {} as any,
      } as any);

      const result = await getUserCommunicationData('user-001', 'user-002');

      expect(result.sharedConversations[0].title).toBe('Untitled Conversation');
    });

    it('should correctly determine conversation type', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock conversations with different types
      mockRun.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const data: any = {
                conversationId: 'conv-001',
                title: 'Direct',
                type: 'direct',
                lastMessageTimestamp: '2024-01-15T12:00:00Z',
                totalMessages: 10,
                user1Messages: 5,
                user2Messages: 5,
                participants: [],
              };
              return data[key];
            },
          },
          {
            get: (key: string) => {
              const data: any = {
                conversationId: 'conv-002',
                title: 'Group',
                type: 'channel',  // Non-direct type
                lastMessageTimestamp: '2024-01-14T12:00:00Z',
                totalMessages: 20,
                user1Messages: 10,
                user2Messages: 10,
                participants: [],
              };
              return data[key];
            },
          },
        ],
        summary: {} as any,
      } as any);

      // Mock remaining queries
      mockRun.mockResolvedValue({
        records: [],
        summary: {} as any,
      } as any);

      const result = await getUserCommunicationData('user-001', 'user-002');

      expect(result.sharedConversations[0].type).toBe('direct');
      expect(result.sharedConversations[1].type).toBe('group');
    });

    it('should handle dateFrom filter only', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock conversations query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      // Mock stats query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);

      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);

      // Mock timeline query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      await getUserCommunicationData('user-001', 'user-002', {
        dateFrom: '2024-01-01T00:00:00Z'
      });

      // Check that date filter was included in queries
      const calls = mockRun.mock.calls;
      
      // Stats query parameters (index 2)
      expect(calls[2][1]).toHaveProperty('dateFrom', '2024-01-01T00:00:00Z');
      
      // Count query parameters (index 3)
      expect(calls[3][1]).toHaveProperty('dateFrom', '2024-01-01T00:00:00Z');
      
      // Timeline query parameters (index 4)
      expect(calls[4][1]).toHaveProperty('dateFrom', '2024-01-01T00:00:00Z');
    });

    it('should handle dateTo filter only', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock conversations query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      // Mock stats query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);

      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);

      // Mock timeline query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      await getUserCommunicationData('user-001', 'user-002', {
        dateTo: '2024-12-31T23:59:59Z'
      });

      // Check that date filter was included in queries
      const calls = mockRun.mock.calls;
      
      // Stats query parameters (index 2)
      expect(calls[2][1]).toHaveProperty('dateTo', '2024-12-31T23:59:59Z');
      
      // Count query parameters (index 3)
      expect(calls[3][1]).toHaveProperty('dateTo', '2024-12-31T23:59:59Z');
      
      // Timeline query parameters (index 4)
      expect(calls[4][1]).toHaveProperty('dateTo', '2024-12-31T23:59:59Z');
    });

    it('should handle both dateFrom and dateTo filters', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock conversations query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      // Mock stats query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);

      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);

      // Mock timeline query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      await getUserCommunicationData('user-001', 'user-002', {
        dateFrom: '2024-01-01T00:00:00Z',
        dateTo: '2024-12-31T23:59:59Z'
      });

      // Check that both date filters were included in queries
      const calls = mockRun.mock.calls;
      
      // Stats query parameters (index 2)
      expect(calls[2][1]).toHaveProperty('dateFrom', '2024-01-01T00:00:00Z');
      expect(calls[2][1]).toHaveProperty('dateTo', '2024-12-31T23:59:59Z');
      
      // Count query parameters (index 3)
      expect(calls[3][1]).toHaveProperty('dateFrom', '2024-01-01T00:00:00Z');
      expect(calls[3][1]).toHaveProperty('dateTo', '2024-12-31T23:59:59Z');
      
      // Timeline query parameters (index 4)
      expect(calls[4][1]).toHaveProperty('dateFrom', '2024-01-01T00:00:00Z');
      expect(calls[4][1]).toHaveProperty('dateTo', '2024-12-31T23:59:59Z');
    });

    it('should handle conversationId filter alone', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock conversations query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      // Mock stats query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);

      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);

      // Mock timeline query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      await getUserCommunicationData('user-001', 'user-002', {
        conversationId: 'conv-123'
      });

      // Check that conversationId filter was included in queries
      const calls = mockRun.mock.calls;
      
      // Count query parameters (index 3)
      expect(calls[3][1]).toHaveProperty('conversationId', 'conv-123');
      
      // Timeline query parameters (index 4)
      expect(calls[4][1]).toHaveProperty('conversationId', 'conv-123');
    });

    it('should handle conversationId with date filters', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock conversations query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      // Mock stats query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);

      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);

      // Mock timeline query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      await getUserCommunicationData('user-001', 'user-002', {
        conversationId: 'conv-456',
        dateFrom: '2024-06-01T00:00:00Z',
        dateTo: '2024-06-30T23:59:59Z'
      });

      // Check that all filters were included in queries
      const calls = mockRun.mock.calls;
      
      // Stats query parameters (index 2)
      expect(calls[2][1]).toHaveProperty('dateFrom', '2024-06-01T00:00:00Z');
      expect(calls[2][1]).toHaveProperty('dateTo', '2024-06-30T23:59:59Z');
      
      // Count query parameters (index 3)
      expect(calls[3][1]).toHaveProperty('conversationId', 'conv-456');
      expect(calls[3][1]).toHaveProperty('dateFrom', '2024-06-01T00:00:00Z');
      expect(calls[3][1]).toHaveProperty('dateTo', '2024-06-30T23:59:59Z');
      
      // Timeline query parameters (index 4)
      expect(calls[4][1]).toHaveProperty('conversationId', 'conv-456');
      expect(calls[4][1]).toHaveProperty('dateFrom', '2024-06-01T00:00:00Z');
      expect(calls[4][1]).toHaveProperty('dateTo', '2024-06-30T23:59:59Z');
    });

    it('should include date filters in SQL WHERE clauses', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock other queries - need to provide valid responses for all queries
      // Mock conversations query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);
      
      // Mock stats query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);
      
      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 0,
        }],
        summary: {} as any,
      } as any);
      
      // Mock timeline query
      mockRun.mockResolvedValueOnce({
        records: [],
        summary: {} as any,
      } as any);

      await getUserCommunicationData('user-001', 'user-002', {
        dateFrom: '2024-03-01',
        dateTo: '2024-03-31'
      });

      const calls = mockRun.mock.calls;
      
      // The queries should contain date filtering
      // Stats query is at index 2 (after getUserSummaries and conversations)
      const statsQuery = calls[2][0];
      expect(statsQuery).toContain('WHERE m.senderId IN [$userId1, $userId2] AND m.timestamp >= $dateFrom AND m.timestamp <= $dateTo');
      
      // Count query is at index 3
      const countQuery = calls[3][0];
      expect(countQuery).toContain('WHERE m.senderId IN [$userId1, $userId2] AND m.timestamp >= $dateFrom AND m.timestamp <= $dateTo');
      
      // Timeline query is at index 4
      const timelineQuery = calls[4][0];
      expect(timelineQuery).toContain('WHERE m.senderId IN [$userId1, $userId2] AND m.timestamp >= $dateFrom AND m.timestamp <= $dateTo');
    });

    it('should handle all optional parameters together', async () => {
      // Mock getUserSummaries
      mockRun.mockResolvedValueOnce({
        records: Array.from(mockUserMap.values()).map(user => ({
          get: () => ({ ...user }),
        })),
        summary: {} as any,
      } as any);

      // Mock conversations query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => {
            const data: any = {
              conversationId: 'conv-789',
              title: 'Test Conversation',
              type: 'group',
              lastMessageTimestamp: '2024-07-15T12:00:00Z',
              totalMessages: 25,
              user1Messages: 15,
              user2Messages: 10,
              participants: [],
            };
            return data[key];
          },
        }],
        summary: {} as any,
      } as any);

      // Mock stats query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => {
            const data: any = {
              totalConversations: 1,
              totalMessages: 25,
              user1Messages: 15,
              user2Messages: 10,
              firstInteraction: '2024-07-01T08:00:00Z',
              lastInteraction: '2024-07-15T12:00:00Z',
            };
            return data[key];
          },
        }],
        summary: {} as any,
      } as any);

      // Mock count query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: () => 10,
        }],
        summary: {} as any,
      } as any);

      // Mock timeline query
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => {
            const data: any = {
              messageId: 'msg-789',
              content: 'Filtered message',
              senderId: 'user-001',
              timestamp: '2024-07-10T10:00:00Z',
              conversationId: 'conv-789',
              conversationTitle: 'Test Conversation',
            };
            return data[key];
          },
        }],
        summary: {} as any,
      } as any);

      const result = await getUserCommunicationData('user-001', 'user-002', {
        page: 2,
        limit: 5,
        conversationId: 'conv-789',
        dateFrom: '2024-07-01',
        dateTo: '2024-07-31'
      });

      // Verify results
      expect(result.sharedConversations).toHaveLength(1);
      expect(result.messageTimeline).toHaveLength(1);
      expect(result.messageTimeline[0].content).toBe('Filtered message');
      expect(result.pagination).toMatchObject({
        page: 2,
        limit: 5,
        total: 10,
        totalPages: 2
      });

      // Verify all parameters were passed
      const calls = mockRun.mock.calls;
      const timelineParams = calls[4][1];
      expect(timelineParams).toMatchObject({
        conversationId: 'conv-789',
        dateFrom: '2024-07-01',
        dateTo: '2024-07-31',
        skip: neo4j.int(5), // (page 2 - 1) * limit 5
        limit: neo4j.int(5)
      });
    });
  });
});