import type { 
  SharedConversation, 
  TimelineMessage, 
  CommunicationStats
} from '@/lib/neo4j';

export function exportToCSV(data: {
  conversations: SharedConversation[];
  messages: TimelineMessage[];
  stats: CommunicationStats;
}): string {
  const headers = [
    'Type',
    'Conversation',
    'Sender',
    'Content',
    'Timestamp',
  ];
  
  // Create summary section
  const summaryRows = [
    ['Summary', '', '', '', ''],
    ['Total Conversations', String(data.stats.totalSharedConversations), '', '', ''],
    ['Total Messages', String(data.stats.totalMessages), '', '', ''],
    ['User 1 Messages', String(data.stats.user1Messages), '', '', ''],
    ['User 2 Messages', String(data.stats.user2Messages), '', '', ''],
    ['First Interaction', data.stats.firstInteraction || 'N/A', '', '', ''],
    ['Last Interaction', data.stats.lastInteraction || 'N/A', '', '', ''],
    ['', '', '', '', ''],
  ];
  
  // Create message rows
  const messageRows = data.messages.map(msg => [
    'Message',
    msg.conversationTitle,
    msg.senderId,
    `"${msg.content.replace(/"/g, '""')}"`, // Escape quotes in content
    msg.timestamp,
  ]);
  
  // Combine all rows
  const allRows = [
    headers,
    ...summaryRows,
    ...messageRows
  ];
  
  // Convert to CSV string
  return allRows.map(row => row.join(',')).join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  } finally {
    // Ensure we always clean up the object URL, even if an error occurs
    URL.revokeObjectURL(url);
  }
}