import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCommunicationData } from '@/lib/api-client';
import type { UserCommunicationData } from '@/lib/neo4j';

// Mock fetch globally
global.fetch = vi.fn();

describe('getCommunicationData API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockCommunicationData: UserCommunicationData = {
    user1: {
      userId: 'user-001',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      username: 'alice',
      status: 'active',
      avatarUrl: null,
      lastSeen: '2024-01-15T10:00:00Z',
    },
    user2: {
      userId: 'user-002',
      name: 'Bob Smith',
      email: 'bob@example.com',
      username: 'bob',
      status: 'active',
      avatarUrl: null,
      lastSeen: '2024-01-14T15:00:00Z',
    },
    sharedConversations: [
      {
        conversationId: 'conv-001',
        title: 'Team Discussion',
        type: 'group' as const,
        messageCount: 50,
        user1MessageCount: 25,
        user2MessageCount: 25,
        participants: ['user-001', 'user-002', 'user-003'],
        lastActivity: '2024-01-15T12:00:00Z',
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

  it('should fetch communication data successfully', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockCommunicationData,
    } as Response);

    const result = await getCommunicationData('user-001', 'user-002');

    expect(result).toEqual(mockCommunicationData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/communications/user-001/user-002'),
      expect.objectContaining({
        next: { revalidate: 300 },
      })
    );
  });

  it('should include pagination parameters in the URL', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockCommunicationData,
    } as Response);

    await getCommunicationData('user-001', 'user-002', { page: 2, limit: 20 });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/communications/user-001/user-002?page=2&limit=20'),
      expect.any(Object)
    );
  });

  it('should handle 404 responses by returning null', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const result = await getCommunicationData('nonexistent-001', 'nonexistent-002');

    expect(result).toBeNull();
  });

  it('should throw error for 400 bad request', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    } as Response);

    await expect(
      getCommunicationData('', 'user-002')
    ).rejects.toThrow('Invalid user IDs provided');
  });

  it('should throw error for 500 server error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(
      getCommunicationData('user-001', 'user-002')
    ).rejects.toThrow('Failed to fetch communication data: 500 Internal Server Error');
  });

  it('should validate response has required user data', async () => {
    const invalidData = { ...mockCommunicationData, user1: null };
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => invalidData,
    } as Response);

    await expect(
      getCommunicationData('user-001', 'user-002')
    ).rejects.toThrow('Invalid API response: missing user data');
  });

  it('should validate sharedConversations is an array', async () => {
    const invalidData = { ...mockCommunicationData, sharedConversations: null };
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => invalidData,
    } as Response);

    await expect(
      getCommunicationData('user-001', 'user-002')
    ).rejects.toThrow('Invalid API response: sharedConversations must be an array');
  });

  it('should validate communicationStats exists', async () => {
    const invalidData = { ...mockCommunicationData, communicationStats: null };
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => invalidData,
    } as Response);

    await expect(
      getCommunicationData('user-001', 'user-002')
    ).rejects.toThrow('Invalid API response: missing communicationStats');
  });

  it('should validate messageTimeline is an array', async () => {
    const invalidData = { ...mockCommunicationData, messageTimeline: 'not-an-array' };
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => invalidData,
    } as Response);

    await expect(
      getCommunicationData('user-001', 'user-002')
    ).rejects.toThrow('Invalid API response: messageTimeline must be an array');
  });

  it('should validate pagination exists', async () => {
    const invalidData = { ...mockCommunicationData, pagination: undefined };
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => invalidData,
    } as Response);

    await expect(
      getCommunicationData('user-001', 'user-002')
    ).rejects.toThrow('Invalid API response: missing pagination');
  });

  it('should handle non-object response', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => 'not-an-object',
    } as Response);

    await expect(
      getCommunicationData('user-001', 'user-002')
    ).rejects.toThrow('Invalid API response: expected object');
  });

  it('should handle null response', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => null,
    } as Response);

    await expect(
      getCommunicationData('user-001', 'user-002')
    ).rejects.toThrow('Invalid API response: expected object');
  });

  it('should handle empty pagination params', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockCommunicationData,
    } as Response);

    await getCommunicationData('user-001', 'user-002', {});

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/communications/user-001/user-002'),
      expect.any(Object)
    );
    // Should not include query params
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('?'),
      expect.any(Object)
    );
  });

  it('should handle partial pagination params', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockCommunicationData,
    } as Response);

    await getCommunicationData('user-001', 'user-002', { page: 3 });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/communications/user-001/user-002?page=3'),
      expect.any(Object)
    );
    // Should not include limit param
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('limit='),
      expect.any(Object)
    );
  });

  it('should cache responses for 5 minutes', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockCommunicationData,
    } as Response);

    await getCommunicationData('user-001', 'user-002');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        next: { revalidate: 300 }, // 5 minutes
      })
    );
  });

  it('should log errors to console', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

    await expect(
      getCommunicationData('user-001', 'user-002')
    ).rejects.toThrow('Network error');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching user communication data:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});