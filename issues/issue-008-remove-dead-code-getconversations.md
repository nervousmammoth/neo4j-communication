# Issue 008: Remove Dead Code - Unpaginated `getConversations()`

## Priority
**Medium**

## Type
Cleanup

## Problem Statement

The `lib/api-client.ts` file contains an unpaginated `getConversations()` function (lines 72-105) that is never used anywhere in the codebase. All pages use `getConversationsPaginated()` instead.

This dead code:
- Adds confusion about which function to use
- Increases maintenance burden
- Bloats the codebase unnecessarily

## User Story

**As a** developer maintaining the codebase
**I want** to remove unused functions and dead code
**So that** the codebase is cleaner, easier to understand, and simpler to maintain

## Affected Files

- `frontend/lib/api-client.ts` (lines 72-105)

## Current State

```typescript
// UNUSED - This function is never called
export async function getConversations(): Promise<ConversationSummary[]> {
  // ... 30+ lines of code
}

// USED - This is what pages actually call
export async function getConversationsPaginated(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedConversationsResponse> {
  // ...
}
```

## Requirements

### Functional Requirements
1. Remove the unused `getConversations()` function
2. Verify no code references the function before removal
3. Update any exports if necessary

### Non-Functional Requirements
1. No breaking changes
2. All tests continue to pass

## Technical Approach

### 1. Verify No Usage
Search the codebase for any usage of the unpaginated function:
```bash
grep -r "getConversations()" --include="*.ts" --include="*.tsx" | grep -v "Paginated"
```

### 2. Remove the Function
Delete lines 72-105 in `lib/api-client.ts` containing:
```typescript
export async function getConversations(): Promise<ConversationSummary[]> {
  // ... entire function
}
```

### 3. Update Tests
If any tests reference this function, remove or update them.

## Acceptance Criteria

- [ ] Unused `getConversations()` function is removed
- [ ] No import errors after removal
- [ ] All existing tests pass
- [ ] `getConversationsPaginated()` continues to work

## Test Plan

1. **Pre-removal Verification:**
   - Search codebase for any usage of `getConversations()`
   - Verify only test mocks reference it (if any)

2. **Post-removal Verification:**
   - Run `npm run build` to verify no import errors
   - Run `npm run test:run` to verify all tests pass
   - Verify conversations page still works

## Branch Name
`cleanup/008-remove-dead-code`

## Estimated Scope
- 1 file modified
- ~35 lines of code removed
- Possible test file updates
