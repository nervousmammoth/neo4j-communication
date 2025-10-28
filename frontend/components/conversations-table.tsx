"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConversationSummary } from "@/lib/neo4j";
import { cn } from "@/lib/utils";
import { formatLastActivity } from "@/lib/date-formatting";

interface ConversationsTableProps {
  conversations: ConversationSummary[];
}

export function ConversationsTable({ conversations }: ConversationsTableProps) {
  const router = useRouter();


  const handleRowClick = (conversationId: string) => {
    router.push(`/conversations/${conversationId}`);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, conversationId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(conversationId);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTypeBadge = (type: string) => {
    const baseClasses = "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium";
    if (type === 'group') {
      return `${baseClasses} bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300`;
    }
    return `${baseClasses} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`;
  };

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="hidden sm:table-cell">Priority</TableHead>
            <TableHead className="text-right hidden md:table-cell">Participants</TableHead>
            <TableHead className="text-right">Messages</TableHead>
            <TableHead className="hidden lg:table-cell">Last Activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((conversation) => (
            <TableRow 
              key={conversation.conversationId}
              className="hover:bg-muted/50 cursor-pointer focus:outline-none focus:bg-muted/50"
              onClick={() => handleRowClick(conversation.conversationId)}
              onKeyDown={(e) => handleRowKeyDown(e, conversation.conversationId)}
              tabIndex={0}
              role="button"
              aria-label={`View conversation: ${conversation.title || 'Direct Message'}`}
            >
              <TableCell className="font-medium">
                {conversation.title || "Direct Message"}
              </TableCell>
              <TableCell>
                <span className={getTypeBadge(conversation.type)}>
                  {conversation.type}
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <span className={cn("font-medium capitalize", getPriorityColor(conversation.priority))}>
                  <span className="sr-only">Priority: </span>
                  {conversation.priority}
                </span>
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">
                {conversation.participantCount}
              </TableCell>
              <TableCell className="text-right">
                {conversation.messageCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-muted-foreground hidden lg:table-cell">
                {formatLastActivity(conversation.lastMessageTimestamp)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}