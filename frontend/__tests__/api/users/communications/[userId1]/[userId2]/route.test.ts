import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/users/communications/[userId1]/[userId2]/route';
import { getUserCommunicationData } from '@/lib/neo4j';

// Mock the neo4j module
vi.mock('@/lib/neo4j', () => ({
  getUserCommunicationData: vi.fn(),
}));

describe('/api/users/communications/[userId1]/[userId2]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserSummary = (userId: string) => ({
    userId,
    name: `User ${userId}`,
    email: `${userId}@example.com`,
    avatar: null,
    conversationCount: 10,
    messageCount: 100,
    lastActiveTimestamp: '2024-01-15T10:00:00Z',
  });

  const mockCommunicationData = {
    user1: mockUserSummary('user-001'),
    user2: mockUserSummary('user-002'),
    sharedConversations: [
      {
        conversationId: 'conv-001',
        title: 'Team Discussion',
        type: 'group' as const,
        messageCount: 50,
        user1MessageCount: 25,
        user2MessageCount: 25,
        lastMessageTimestamp: '2024-01-15T12:00:00Z',
        participants: [mockUserSummary('user-001'), mockUserSummary('user-002')],
      },
    ],
    communicationStats: {
      totalSharedConversations: 1,
      totalMessages: 50,
      user1Messages: 25,
      user2Messages: 25,
      firstInteraction: '2024-01-01T10:00:00Z',
      lastInteraction: '2024-01-15T12:00:00Z',
    },
    messageTimeline: [
      {
        messageId: 'msg-001',
        content: 'Hello!',
        senderId: 'user-001',
        timestamp: '2024-01-15T12:00:00Z',
        conversationId: 'conv-001',
        conversationTitle: 'Team Discussion',
      },
    ],
    pagination: {
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    },
  };

  it('should return communication data for valid user pairs', async () => {
    vi.mocked(getUserCommunicationData).mockResolvedValue(mockCommunicationData);

    const request = new NextRequest('http://localhost/api/users/communications/user-001/user-002');
    const params = { userId1: 'user-001', userId2: 'user-002' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockCommunicationData);
    expect(getUserCommunicationData).toHaveBeenCalledWith('user-001', 'user-002', { page: 1, limit: 50 });
  });

  it('should normalize user IDs for consistent caching', async () => {
    vi.mocked(getUserCommunicationData).mockResolvedValue(mockCommunicationData);

    // Test with reversed order
    const request = new NextRequest('http://localhost/api/users/communications/user-002/user-001');
    const params = { userId1: 'user-002', userId2: 'user-001' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should call with normalized order (alphabetically sorted)
    expect(getUserCommunicationData).toHaveBeenCalledWith('user-001', 'user-002', { page: 1, limit: 50 });
    
    // Response should swap users back to match original request order
    expect(data.user1.userId).toBe('user-002');
    expect(data.user2.userId).toBe('user-001');
    expect(data.communicationStats.user1Messages).toBe(25); // Swapped from user2Messages
    expect(data.communicationStats.user2Messages).toBe(25); // Swapped from user1Messages
  });

  it('should handle pagination parameters', async () => {
    vi.mocked(getUserCommunicationData).mockResolvedValue(mockCommunicationData);

    const request = new NextRequest('http://localhost/api/users/communications/user-001/user-002?page=2&limit=20');
    const params = { userId1: 'user-001', userId2: 'user-002' };

    const response = await GET(request, { params });
    
    expect(response.status).toBe(200);
    expect(getUserCommunicationData).toHaveBeenCalledWith('user-001', 'user-002', { page: 2, limit: 20 });
  });

  it('should enforce pagination limits', async () => {
    vi.mocked(getUserCommunicationData).mockResolvedValue(mockCommunicationData);

    const request = new NextRequest('http://localhost/api/users/communications/user-001/user-002?page=-1&limit=200');
    const params = { userId1: 'user-001', userId2: 'user-002' };

    const response = await GET(request, { params });
    
    expect(response.status).toBe(200);
    // Should enforce minimum page of 1 and maximum limit of 100
    expect(getUserCommunicationData).toHaveBeenCalledWith('user-001', 'user-002', { page: 1, limit: 100 });
  });

  it('should return 400 for missing user IDs', async () => {
    const request = new NextRequest('http://localhost/api/users/communications/user-001/');
    const params = { userId1: 'user-001', userId2: '' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Both user IDs are required');
    expect(getUserCommunicationData).not.toHaveBeenCalled();
  });

  it('should return 404 when users are not found', async () => {
    vi.mocked(getUserCommunicationData).mockResolvedValue({
      ...mockCommunicationData,
      user1: null,
      user2: null,
    });

    const request = new NextRequest('http://localhost/api/users/communications/nonexistent-001/nonexistent-002');
    const params = { userId1: 'nonexistent-001', userId2: 'nonexistent-002' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('One or both users not found');
  });

  it('should return empty data for users with no shared conversations', async () => {
    const emptyData = {
      ...mockCommunicationData,
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
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      },
    };

    vi.mocked(getUserCommunicationData).mockResolvedValue(emptyData);

    const request = new NextRequest('http://localhost/api/users/communications/user-001/user-003');
    const params = { userId1: 'user-001', userId2: 'user-003' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sharedConversations).toEqual([]);
    expect(data.communicationStats.totalMessages).toBe(0);
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(getUserCommunicationData).mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost/api/users/communications/user-001/user-002');
    const params = { userId1: 'user-001', userId2: 'user-002' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch communication data');
  });

  it('should handle "not found" errors with 404 status', async () => {
    vi.mocked(getUserCommunicationData).mockRejectedValue(new Error('User not found in database'));

    const request = new NextRequest('http://localhost/api/users/communications/user-001/user-002');
    const params = { userId1: 'user-001', userId2: 'user-002' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Users not found');
  });

  it('should handle invalid page/limit parameters gracefully', async () => {
    vi.mocked(getUserCommunicationData).mockResolvedValue(mockCommunicationData);

    const request = new NextRequest('http://localhost/api/users/communications/user-001/user-002?page=abc&limit=xyz');
    const params = { userId1: 'user-001', userId2: 'user-002' };

    const response = await GET(request, { params });
    
    expect(response.status).toBe(200);
    // Should use default values for invalid parameters
    expect(getUserCommunicationData).toHaveBeenCalledWith('user-001', 'user-002', { page: 1, limit: 50 });
  });

  it('should preserve message timeline order after user swap', async () => {
    const detailedData = {
      ...mockCommunicationData,
      messageTimeline: [
        {
          messageId: 'msg-001',
          content: 'Hello from user-001!',
          senderId: 'user-001',
          timestamp: '2024-01-15T12:00:00Z',
          conversationId: 'conv-001',
          conversationTitle: 'Team Discussion',
        },
        {
          messageId: 'msg-002',
          content: 'Hello from user-002!',
          senderId: 'user-002',
          timestamp: '2024-01-15T11:00:00Z',
          conversationId: 'conv-001',
          conversationTitle: 'Team Discussion',
        },
      ],
    };

    vi.mocked(getUserCommunicationData).mockResolvedValue(detailedData);

    const request = new NextRequest('http://localhost/api/users/communications/user-002/user-001');
    const params = { userId1: 'user-002', userId2: 'user-001' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    // Message timeline should remain unchanged
    expect(data.messageTimeline).toEqual(detailedData.messageTimeline);
  });

  it('should correctly swap conversation message counts when users are swapped', async () => {
    const dataWithMultipleConversations = {
      ...mockCommunicationData,
      sharedConversations: [
        {
          conversationId: 'conv-001',
          title: 'Team Discussion',
          type: 'group' as const,
          messageCount: 100,
          user1MessageCount: 60,
          user2MessageCount: 40,
          lastMessageTimestamp: '2024-01-15T12:00:00Z',
          participants: [],
        },
        {
          conversationId: 'conv-002',
          title: 'Direct Chat',
          type: 'direct' as const,
          messageCount: 50,
          user1MessageCount: 30,
          user2MessageCount: 20,
          lastMessageTimestamp: '2024-01-14T10:00:00Z',
          participants: [],
        },
      ],
    };

    vi.mocked(getUserCommunicationData).mockResolvedValue(dataWithMultipleConversations);

    const request = new NextRequest('http://localhost/api/users/communications/user-002/user-001');
    const params = { userId1: 'user-002', userId2: 'user-001' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    
    // Check that message counts are properly swapped for each conversation
    expect(data.sharedConversations[0].user1MessageCount).toBe(40); // Was user2MessageCount
    expect(data.sharedConversations[0].user2MessageCount).toBe(60); // Was user1MessageCount
    expect(data.sharedConversations[1].user1MessageCount).toBe(20); // Was user2MessageCount
    expect(data.sharedConversations[1].user2MessageCount).toBe(30); // Was user1MessageCount
  });

  it('should validate user ID format and reject invalid characters', async () => {
    const request1 = new NextRequest('http://localhost/api/users/communications/user@001/user-002');
    const params1 = { userId1: 'user@001', userId2: 'user-002' };

    const response1 = await GET(request1, { params: params1 });
    const data1 = await response1.json();

    expect(response1.status).toBe(400);
    expect(data1.error).toBe('Invalid userId1 format. Only alphanumeric characters, hyphens, and underscores are allowed.');
    expect(getUserCommunicationData).not.toHaveBeenCalled();

    vi.clearAllMocks();

    const request2 = new NextRequest('http://localhost/api/users/communications/user-001/user#002');
    const params2 = { userId1: 'user-001', userId2: 'user#002' };

    const response2 = await GET(request2, { params: params2 });
    const data2 = await response2.json();

    expect(response2.status).toBe(400);
    expect(data2.error).toBe('Invalid userId2 format. Only alphanumeric characters, hyphens, and underscores are allowed.');
    expect(getUserCommunicationData).not.toHaveBeenCalled();
  });

  it('should accept valid user ID formats', async () => {
    vi.mocked(getUserCommunicationData).mockResolvedValue(mockCommunicationData);

    const validUserIds = [
      ['user123', 'user456'],
      ['user-001', 'user-002'],
      ['user_001', 'user_002'],
      ['User123', 'User456'],
      ['123456', '789012'],
      ['a1b2c3', 'd4e5f6'],
    ];

    for (const [userId1, userId2] of validUserIds) {
      vi.clearAllMocks();
      const request = new NextRequest(`http://localhost/api/users/communications/${userId1}/${userId2}`);
      const params = { userId1, userId2 };

      const response = await GET(request, { params });
      
      expect(response.status).toBe(200);
      expect(getUserCommunicationData).toHaveBeenCalled();
    }
  });

  it('should handle date filtering parameters', async () => {
    vi.mocked(getUserCommunicationData).mockResolvedValue(mockCommunicationData);

    const request = new NextRequest('http://localhost/api/users/communications/user-001/user-002?dateFrom=2024-01-01&dateTo=2024-01-31');
    const params = { userId1: 'user-001', userId2: 'user-002' };

    const response = await GET(request, { params });
    
    expect(response.status).toBe(200);
    expect(getUserCommunicationData).toHaveBeenCalledWith('user-001', 'user-002', { 
      page: 1, 
      limit: 50,
      conversationId: undefined,
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31'
    });
  });

  it('should validate date format and reject invalid dates', async () => {
    const request1 = new NextRequest('http://localhost/api/users/communications/user-001/user-002?dateFrom=invalid-date');
    const params = { userId1: 'user-001', userId2: 'user-002' };

    const response1 = await GET(request1, { params });
    const data1 = await response1.json();

    expect(response1.status).toBe(400);
    expect(data1.error).toBe('Invalid dateFrom format. Expected ISO 8601 format.');

    const request2 = new NextRequest('http://localhost/api/users/communications/user-001/user-002?dateTo=2024/01/31');
    const response2 = await GET(request2, { params });
    const data2 = await response2.json();

    expect(response2.status).toBe(400);
    expect(data2.error).toBe('Invalid dateTo format. Expected ISO 8601 format.');
  });

  it('should accept valid ISO 8601 date formats', async () => {
    vi.mocked(getUserCommunicationData).mockResolvedValue(mockCommunicationData);

    const validDates = [
      ['2024-01-01', '2024-01-31'],
      ['2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z'],
      ['2024-01-01T10:30:00.000Z', '2024-01-31T15:45:30.123Z'],
    ];

    for (const [dateFrom, dateTo] of validDates) {
      vi.clearAllMocks();
      const request = new NextRequest(`http://localhost/api/users/communications/user-001/user-002?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      const params = { userId1: 'user-001', userId2: 'user-002' };

      const response = await GET(request, { params });
      
      expect(response.status).toBe(200);
      expect(getUserCommunicationData).toHaveBeenCalledWith('user-001', 'user-002', {
        page: 1,
        limit: 50,
        conversationId: undefined,
        dateFrom,
        dateTo
      });
    }
  });

  it('should handle conversation filter with date filters', async () => {
    vi.mocked(getUserCommunicationData).mockResolvedValue(mockCommunicationData);

    const request = new NextRequest('http://localhost/api/users/communications/user-001/user-002?conversationId=conv-123&dateFrom=2024-01-01&dateTo=2024-01-31');
    const params = { userId1: 'user-001', userId2: 'user-002' };

    const response = await GET(request, { params });
    
    expect(response.status).toBe(200);
    expect(getUserCommunicationData).toHaveBeenCalledWith('user-001', 'user-002', { 
      page: 1, 
      limit: 50,
      conversationId: 'conv-123',
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31'
    });
  });
});