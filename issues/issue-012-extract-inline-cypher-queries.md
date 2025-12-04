# Issue 012: Extract Inline Cypher Queries to Query Functions

## Priority
**Low**

## Type
Refactoring

## Problem Statement

Two API routes contain inline Cypher queries instead of using query functions from `lib/neo4j/queries/`. This violates the established architecture pattern and makes:

1. Queries harder to test independently
2. Code less reusable
3. Query logic scattered across the codebase

## User Story

**As a** developer maintaining the Neo4j integration
**I want** all Cypher queries organized in reusable query functions
**So that** queries are testable, maintainable, and follow consistent architectural patterns

## Affected Files

### Files with Inline Queries
1. `frontend/app/api/users/[userId]/route.ts` (lines 19-171)
   - Contains 150+ lines of complex Cypher query for user details with stats

2. `frontend/app/api/conversations/[id]/messages/route.ts` (lines 40-70)
   - Contains message fetching query with pagination

### Files to Create/Modify
1. `frontend/lib/neo4j/queries/users.ts` - Add `getUserDetailWithStats()`
2. `frontend/lib/neo4j/queries/conversations.ts` - Add `getConversationMessages()`

## Requirements

### Functional Requirements
1. Extract user detail query to `getUserDetailWithStats()` function
2. Extract conversation messages query to `getConversationMessages()` function
3. Update API routes to use the new query functions
4. Maintain exact same behavior and response format

### Non-Functional Requirements
1. No breaking changes to API responses
2. Query functions follow existing patterns
3. Independent testability of queries

## Technical Approach

### 1. Extract User Detail Query

Add to `frontend/lib/neo4j/queries/users.ts`:

```typescript
export interface UserDetailWithStats {
  user: User;
  stats: {
    totalConversations: number;
    totalMessages: number;
    averageResponseTime: number;
    // ... other stats
  };
  conversations: Array<{
    id: string;
    title: string;
    lastMessage: string;
    lastMessageAt: string;
    participantCount: number;
  }>;
  activityTimeline: Array<{
    date: string;
    messageCount: number;
    conversationCount: number;
  }>;
}

export async function getUserDetailWithStats(userId: string): Promise<UserDetailWithStats | null> {
  // Move the complex Cypher query here
  const query = `
    MATCH (u:User {userId: $userId})
    // ... rest of query from route.ts
  `;

  const result = await executeReadQuery<...>(query, { userId });
  // ... transform and return
}
```

### 2. Extract Conversation Messages Query

Add to `frontend/lib/neo4j/queries/conversations.ts`:

```typescript
export interface ConversationMessagesResult {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getConversationMessages(
  conversationId: string,
  page: number = 1,
  limit: number = 50
): Promise<ConversationMessagesResult> {
  // Move the Cypher query from route.ts here
  const query = `
    MATCH (c:Conversation {conversationId: $conversationId})
    // ... rest of query
  `;

  const result = await executeReadQuery<...>(query, { conversationId, skip, limit });
  // ... transform and return
}
```

### 3. Update API Routes

Update `frontend/app/api/users/[userId]/route.ts`:
```typescript
import { getUserDetailWithStats } from '@/lib/neo4j/queries/users';

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params;
  const result = await getUserDetailWithStats(userId);

  if (!result) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(result);
}
```

Update `frontend/app/api/conversations/[id]/messages/route.ts`:
```typescript
import { getConversationMessages } from '@/lib/neo4j/queries/conversations';

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const result = await getConversationMessages(id, page, limit);
  return NextResponse.json(result);
}
```

### 4. Add Tests for New Query Functions

Create tests in:
- `frontend/__tests__/lib/neo4j/queries/users.test.ts` - test `getUserDetailWithStats()`
- `frontend/__tests__/lib/neo4j/queries/conversations.test.ts` - test `getConversationMessages()`

## Acceptance Criteria

- [ ] `getUserDetailWithStats()` function created and exported
- [ ] `getConversationMessages()` function created and exported
- [ ] API routes updated to use new query functions
- [ ] API responses unchanged (backwards compatible)
- [ ] Query functions have independent test coverage
- [ ] All existing tests pass

## Test Plan

1. **Unit Tests for Query Functions:**
   - Mock Neo4j connection and test query functions
   - Test various input parameters
   - Test error handling

2. **Integration Tests:**
   - Verify API routes return same response format
   - Test pagination in messages endpoint
   - Test user not found scenario

3. **Regression Testing:**
   - Run full test suite
   - Manual verification of user detail page
   - Manual verification of conversation messages

## Branch Name
`refactor/012-extract-cypher-queries`

## Estimated Scope
- 2 files modified (API routes)
- 2 files modified (query files)
- 2 test files added/updated
- ~200-300 lines of code moved/refactored
