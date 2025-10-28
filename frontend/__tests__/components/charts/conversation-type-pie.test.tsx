import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationTypePie } from '@/components/charts/conversation-type-pie';
import type { SharedConversation } from '@/lib/neo4j';

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children, data }: any) => (
    <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Pie: ({ data, dataKey, nameKey, cx, cy, outerRadius, fill, label, children }: any) => (
    <div 
      data-testid="pie" 
      data-data={JSON.stringify(data)}
      data-datakey={dataKey}
      data-namekey={nameKey}
      data-label={typeof label === 'function' ? 'true' : label?.toString()}
    >
      {data?.map((entry: any, index: number) => (
        <div key={index} data-testid="cell" data-fill={entry.name === 'Direct' ? '#8884d8' : '#82ca9d'} />
      ))}
    </div>
  ),
  Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}));

describe('ConversationTypePie', () => {
  const createMockConversations = (directCount: number, groupCount: number): SharedConversation[] => {
    const conversations: SharedConversation[] = [];
    
    // Add direct conversations
    for (let i = 0; i < directCount; i++) {
      conversations.push({
        conversationId: `direct-${i}`,
        title: `Direct Chat ${i}`,
        type: 'direct',
        messageCount: 100 + i * 10,
        user1MessageCount: 50 + i * 5,
        user2MessageCount: 50 + i * 5,
        lastMessageTimestamp: '2024-01-01T12:00:00Z',
        participants: ['user1', 'user2']
      });
    }
    
    // Add group conversations
    for (let i = 0; i < groupCount; i++) {
      conversations.push({
        conversationId: `group-${i}`,
        title: `Group Chat ${i}`,
        type: 'group',
        messageCount: 200 + i * 20,
        user1MessageCount: 100 + i * 10,
        user2MessageCount: 100 + i * 10,
        lastMessageTimestamp: '2024-01-01T12:00:00Z',
        participants: ['user1', 'user2', `user${i + 3}`]
      });
    }
    
    return conversations;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the pie chart', () => {
    const conversations = createMockConversations(5, 3);
    
    render(<ConversationTypePie conversations={conversations} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should calculate correct percentages for conversation types', () => {
    const conversations = createMockConversations(6, 4); // 60% direct, 40% group
    
    render(<ConversationTypePie conversations={conversations} />);

    const pie = screen.getByTestId('pie');
    const data = JSON.parse(pie.getAttribute('data-data') || '[]');
    
    expect(data).toHaveLength(2);
    
    const directData = data.find((d: any) => d.name === 'Direct');
    const groupData = data.find((d: any) => d.name === 'Group');
    
    expect(directData).toEqual({
      name: 'Direct',
      value: 6,
      percentage: 60
    });
    
    expect(groupData).toEqual({
      name: 'Group',
      value: 4,
      percentage: 40
    });
  });

  it('should display custom labels with counts and percentages', () => {
    const conversations = createMockConversations(7, 3);
    
    render(<ConversationTypePie conversations={conversations} />);

    const pie = screen.getByTestId('pie');
    expect(pie.getAttribute('data-label')).toBe('true'); // Label function should be provided
  });

  it('should render legend', () => {
    const conversations = createMockConversations(5, 5);
    
    render(<ConversationTypePie conversations={conversations} />);

    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('should use appropriate colors for segments', () => {
    const conversations = createMockConversations(5, 5);
    
    render(<ConversationTypePie conversations={conversations} />);

    const cells = screen.getAllByTestId('cell');
    expect(cells).toHaveLength(2);
    
    // Check that cells have different colors
    expect(cells[0].getAttribute('data-fill')).toBe('#8884d8'); // Direct - purple
    expect(cells[1].getAttribute('data-fill')).toBe('#82ca9d'); // Group - green
  });

  it('should handle only direct conversations', () => {
    const conversations = createMockConversations(10, 0);
    
    render(<ConversationTypePie conversations={conversations} />);

    const pie = screen.getByTestId('pie');
    const data = JSON.parse(pie.getAttribute('data-data') || '[]');
    
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      name: 'Direct',
      value: 10,
      percentage: 100
    });
  });

  it('should handle only group conversations', () => {
    const conversations = createMockConversations(0, 8);
    
    render(<ConversationTypePie conversations={conversations} />);

    const pie = screen.getByTestId('pie');
    const data = JSON.parse(pie.getAttribute('data-data') || '[]');
    
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      name: 'Group',
      value: 8,
      percentage: 100
    });
  });

  it('should handle empty conversation list', () => {
    render(<ConversationTypePie conversations={[]} />);

    expect(screen.getByText('No conversation data available')).toBeInTheDocument();
  });

  it('should display tooltip', () => {
    const conversations = createMockConversations(5, 3);
    
    render(<ConversationTypePie conversations={conversations} />);

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('should display summary statistics', () => {
    const conversations = createMockConversations(5, 3);
    
    render(<ConversationTypePie conversations={conversations} />);

    // Should show total count somewhere
    expect(screen.getByTestId('total-conversations')).toBeInTheDocument();
    expect(screen.getByTestId('total-conversations')).toHaveTextContent('8');
    
    // Should show breakdown
    expect(screen.getByTestId('direct-count')).toBeInTheDocument();
    expect(screen.getByTestId('direct-count')).toHaveTextContent('5');
    
    expect(screen.getByTestId('group-count')).toBeInTheDocument();
    expect(screen.getByTestId('group-count')).toHaveTextContent('3');
  });

  it('should calculate message volume by type', () => {
    const conversations = createMockConversations(2, 2);
    
    render(<ConversationTypePie conversations={conversations} />);

    // Direct conversations: 2 * (100 + 110) = 420 messages
    // Group conversations: 2 * (200 + 220) = 840 messages
    
    expect(screen.getByTestId('direct-messages')).toHaveTextContent('210');
    expect(screen.getByTestId('group-messages')).toHaveTextContent('420');
  });

  it('should show average messages per conversation type', () => {
    const conversations = createMockConversations(3, 2);
    
    render(<ConversationTypePie conversations={conversations} />);

    // Direct avg: (100 + 110 + 120) / 3 = 110
    // Group avg: (200 + 220) / 2 = 210
    
    expect(screen.getByTestId('direct-avg-messages')).toHaveTextContent('110');
    expect(screen.getByTestId('group-avg-messages')).toHaveTextContent('210');
  });

  it('should format large numbers with commas', () => {
    // Create conversations with large message counts
    const conversations: SharedConversation[] = [
      {
        conversationId: 'c1',
        title: 'Big Chat',
        type: 'direct',
        messageCount: 1234567,
        user1MessageCount: 600000,
        user2MessageCount: 634567,
        lastMessageTimestamp: '2024-01-01T12:00:00Z',
        participants: ['user1', 'user2']
      }
    ];
    
    render(<ConversationTypePie conversations={conversations} />);

    expect(screen.getByTestId('direct-messages')).toHaveTextContent('1,234,567');
  });

  it('should be responsive', () => {
    const conversations = createMockConversations(5, 3);
    
    render(<ConversationTypePie conversations={conversations} />);

    const container = screen.getByTestId('responsive-container');
    expect(container).toBeInTheDocument();
  });
});