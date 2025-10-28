"use client";

import { useState, useMemo } from "react";
import { ConversationsTable } from "./conversations-table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { ConversationSummary } from "@/lib/neo4j";

interface ConversationsPageProps {
  conversations: ConversationSummary[];
}

export function ConversationsPage({ conversations }: ConversationsPageProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) {
      return conversations;
    }

    const lowerSearch = searchTerm.toLowerCase();
    return conversations.filter((conv) => {
      const title = conv.title || "Direct Message";
      return title.toLowerCase().includes(lowerSearch);
    });
  }, [conversations, searchTerm]);

  return (
    <>
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10"
            aria-label="Search conversations"
          />
        </div>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No conversations found matching &quot;{searchTerm}&quot;
          </p>
        </div>
      ) : (
        <ConversationsTable conversations={filteredConversations} />
      )}
    </>
  );
}