# Issue 005: Fix User ID Normalization in `fetchAggregatedData()`

## Priority
**High**

## Type
Bug Fix

## Problem Statement

The `fetchAggregatedData()` function in `lib/api-client.ts` doesn't normalize user IDs alphabetically before making API calls. This is inconsistent with `getCommunicationData()` which does normalize IDs, and can cause:

1. **Duplicate API calls** - Same user pair with different ID ordering creates different cache entries
2. **Cache misses** - Related queries may not benefit from cached data
3. **Inconsistent behavior** - Different functions handling the same data differently

## User Story

**As a** developer
**I want** consistent user ID normalization across all API client functions
**So that** caching works efficiently and duplicate API calls are prevented

## Affected Files

- `frontend/lib/api-client.ts` (lines 761-781)

## Current Behavior

```typescript
// getCommunicationData normalizes (line 539):
const [normalizedId1, normalizedId2] = [userId1, userId2].sort();

// But fetchAggregatedData does NOT (lines 773-774):
const response = await fetch(
  `${getBaseUrl()}/api/users/communications/${userId1}/${userId2}/analytics?${params}`
);
```

## Requirements

### Functional Requirements
1. Normalize user IDs alphabetically before constructing API URL
2. Maintain backward compatibility - function signature unchanged
3. Follow the same pattern as `getCommunicationData()`

### Non-Functional Requirements
1. No performance regression
2. Maintain existing error handling

## Technical Approach

### 1. Update `fetchAggregatedData()` Function

```typescript
export async function fetchAggregatedData(
  userId1: string,
  userId2: string,
  options: AggregatedDataOptions = {}
): Promise<AggregatedCommunicationData> {
  // Normalize IDs alphabetically for consistent caching
  const [normalizedId1, normalizedId2] = [userId1, userId2].sort();

  const params = new URLSearchParams();
  // ... rest of implementation using normalizedId1 and normalizedId2
}
```

### 2. Update Tests
Add test cases in `frontend/__tests__/lib/api-client.test.ts`:
- Verify IDs are normalized in the fetch URL
- Verify both orderings produce the same URL

## Acceptance Criteria

- [ ] `fetchAggregatedData()` normalizes user IDs before API call
- [ ] Function uses same normalization pattern as `getCommunicationData()`
- [ ] Existing tests continue to pass
- [ ] New tests verify normalization behavior
- [ ] No breaking changes to function signature

## Test Plan

1. **Unit Tests:**
   - Call `fetchAggregatedData('user-b', 'user-a')` and verify URL uses `user-a/user-b`
   - Call `fetchAggregatedData('user-a', 'user-b')` and verify URL uses `user-a/user-b`
   - Verify both calls would hit the same endpoint

2. **Verification:**
   - Check that mocked fetch receives normalized URL regardless of input order

## Branch Name
`fix/005-user-id-normalization`

## Estimated Scope
- 1 file modified
- ~5 lines of code changed
- Test updates
