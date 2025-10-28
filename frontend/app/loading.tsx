import { ConversationsSkeleton } from "@/components/conversations-skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground mt-2">
          Browse and analyze conversation data from the Neo4j database
        </p>
      </div>
      
      <ConversationsSkeleton />
    </div>
  );
}