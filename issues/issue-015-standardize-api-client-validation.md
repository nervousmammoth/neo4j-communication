# Issue 015: Standardize API Client Response Validation

## Priority
**Low**

## Type
Refactoring

## Problem Statement

Response validation patterns are inconsistent across API client functions in `lib/api-client.ts`:

- `getConversationsPaginated()` has 8 validation checks (lines 211-235)
- `getCommunicationData()` has extensive validation (lines 586-610)
- `getUserDetail()` only checks for object and userId (lines 504-510)
- `fetchAggregatedData()` has zero validation (line 781)

This inconsistency makes:
1. Debugging harder when API contracts break
2. Error messages vary in helpfulness
3. Code harder to maintain

## Affected Files

- `frontend/lib/api-client.ts` (multiple functions)

## Requirements

### Functional Requirements
1. Create reusable validation helper functions
2. Apply consistent validation pattern across all API client functions
3. Standardize error messages format
4. Ensure all functions validate their expected response structure

### Non-Functional Requirements
1. No breaking changes to function signatures
2. Minimal performance impact
3. Maintainable validation code

## Technical Approach

### 1. Create Validation Utilities

Add to `frontend/lib/api-client.ts` or create `frontend/lib/api-validation.ts`:

```typescript
// Generic validation helpers
function assertObject(data: unknown, context: string): asserts data is Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Invalid API response for ${context}: expected object`);
  }
}

function assertArray(data: unknown, context: string): asserts data is unknown[] {
  if (!Array.isArray(data)) {
    throw new Error(`Invalid API response for ${context}: expected array`);
  }
}

function assertField<T>(
  obj: Record<string, unknown>,
  field: string,
  context: string,
  validator?: (value: unknown) => value is T
): T {
  const value = obj[field];
  if (value === undefined || value === null) {
    throw new Error(`Invalid API response for ${context}: missing field '${field}'`);
  }
  if (validator && !validator(value)) {
    throw new Error(`Invalid API response for ${context}: invalid field '${field}'`);
  }
  return value as T;
}

function assertPagination(
  obj: Record<string, unknown>,
  context: string
): { page: number; limit: number; total: number; totalPages: number } {
  assertField(obj, 'pagination', context);
  const pagination = obj.pagination as Record<string, unknown>;
  return {
    page: assertField(pagination, 'page', `${context}.pagination`) as number,
    limit: assertField(pagination, 'limit', `${context}.pagination`) as number,
    total: assertField(pagination, 'total', `${context}.pagination`) as number,
    totalPages: assertField(pagination, 'totalPages', `${context}.pagination`) as number,
  };
}
```

### 2. Create Type-Specific Validators

```typescript
function validateUserDetail(data: unknown): UserDetailResponse {
  assertObject(data, 'getUserDetail');
  const obj = data as Record<string, unknown>;

  assertField(obj, 'user', 'getUserDetail');
  assertField(obj, 'stats', 'getUserDetail');
  assertField(obj, 'conversations', 'getUserDetail');
  assertField(obj, 'activityTimeline', 'getUserDetail');

  const user = obj.user as Record<string, unknown>;
  assertField(user, 'userId', 'getUserDetail.user');
  assertField(user, 'name', 'getUserDetail.user');

  return data as UserDetailResponse;
}

function validateConversationsPaginated(data: unknown): PaginatedConversationsResponse {
  assertObject(data, 'getConversationsPaginated');
  const obj = data as Record<string, unknown>;

  assertField(obj, 'conversations', 'getConversationsPaginated');
  assertArray(obj.conversations, 'getConversationsPaginated.conversations');
  assertPagination(obj, 'getConversationsPaginated');

  return data as PaginatedConversationsResponse;
}

// ... similar validators for other response types
```

### 3. Apply to All Functions

Update each API client function to use validators:

```typescript
export async function getUserDetail(userId: string): Promise<UserDetailResponse> {
  const response = await fetch(`${getBaseUrl()}/api/users/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  const data = await response.json();
  return validateUserDetail(data);
}
```

### 4. Functions to Update

| Function | Current Validation | Target |
|----------|-------------------|--------|
| `getConversations` | Partial | Full |
| `getConversationDetail` | Minimal | Full |
| `getConversationMessages` | Partial | Full |
| `getConversationsPaginated` | Good | Standardize |
| `searchConversations` | Partial | Full |
| `getUsersPaginated` | Partial | Full |
| `getUserDetail` | Minimal | Full |
| `getUserCommunicationData` | Good | Standardize |
| `getCommunicationData` | Good | Standardize |
| `searchUsers` | Partial | Full |
| `getUserContacts` | Partial | Full |
| `fetchAggregatedData` | None | Full |

## Acceptance Criteria

- [ ] Validation helper functions created
- [ ] All API client functions use consistent validation
- [ ] Error messages follow standardized format
- [ ] Tests cover validation behavior for all functions
- [ ] No breaking changes to function signatures
- [ ] All existing tests pass

## Test Plan

1. **Unit Tests for Validators:**
   - Test each validator with valid data
   - Test each validator with missing fields
   - Test each validator with wrong types
   - Verify error messages are descriptive

2. **Integration Tests:**
   - Verify all API client functions still work
   - Test error scenarios return proper messages

3. **Regression Tests:**
   - Run full test suite
   - Verify no breaking changes

## Branch Name
`refactor/015-standardize-validation`

## Estimated Scope
- 1 file significantly modified (api-client.ts)
- Possibly 1 new file (api-validation.ts)
- Test updates
- ~150-200 lines of validation code
- ~100-150 lines of test code
