# Issue 009: Add Response Validation to `fetchAggregatedData()`

## Priority
**Medium**

## Type
Enhancement

## Problem Statement

The `fetchAggregatedData()` function in `lib/api-client.ts` lacks response structure validation, unlike other API client functions. This inconsistency means:

1. Runtime errors if API response structure changes
2. Harder to debug malformed responses
3. No type safety at runtime

## Affected Files

- `frontend/lib/api-client.ts` (lines 761-781)

## Current Behavior (No Validation)

```typescript
export async function fetchAggregatedData(...): Promise<AggregatedCommunicationData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch aggregated data');  // Generic error
  }
  return response.json();  // No validation!
}
```

## Comparison with Other Functions

`getCommunicationData()` has extensive validation (lines 586-610):
```typescript
if (!data || typeof data !== 'object') {
  throw new Error('Invalid API response: expected object');
}
if (!data.user1 || !data.user2) {
  throw new Error('Invalid API response: missing user data');
}
// ... more validation
```

## Requirements

### Functional Requirements
1. Validate response is an object
2. Validate presence of required fields (frequency, responseTime, heatmap, etc.)
3. Provide descriptive error messages for invalid responses
4. Maintain type safety

### Non-Functional Requirements
1. Follow existing validation patterns in the codebase
2. No performance impact for valid responses

## Technical Approach

### 1. Add Validation Function

```typescript
function validateAggregatedData(data: unknown): AggregatedCommunicationData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid API response: expected object');
  }

  const obj = data as Record<string, unknown>;

  // Validate required sections exist
  if (!obj.frequency || typeof obj.frequency !== 'object') {
    throw new Error('Invalid API response: missing or invalid frequency data');
  }

  if (!obj.responseTime || typeof obj.responseTime !== 'object') {
    throw new Error('Invalid API response: missing or invalid responseTime data');
  }

  if (!obj.heatmap || typeof obj.heatmap !== 'object') {
    throw new Error('Invalid API response: missing or invalid heatmap data');
  }

  if (!obj.talkListenRatio || typeof obj.talkListenRatio !== 'object') {
    throw new Error('Invalid API response: missing or invalid talkListenRatio data');
  }

  if (!obj.conversationTypes || typeof obj.conversationTypes !== 'object') {
    throw new Error('Invalid API response: missing or invalid conversationTypes data');
  }

  return data as AggregatedCommunicationData;
}
```

### 2. Update `fetchAggregatedData()`

```typescript
export async function fetchAggregatedData(...): Promise<AggregatedCommunicationData> {
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch aggregated data: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return validateAggregatedData(data);
}
```

### 3. Update Tests
Add test cases for validation:
- Valid response passes validation
- Missing fields throw descriptive errors
- Non-object response throws error

## Acceptance Criteria

- [ ] Response structure is validated before returning
- [ ] Missing required fields produce descriptive errors
- [ ] Error messages identify which field is missing/invalid
- [ ] Valid responses continue to work
- [ ] Tests cover all validation paths

## Test Plan

1. **Unit Tests:**
   - Mock valid response and verify it passes
   - Mock response missing `frequency` and verify error
   - Mock response missing `responseTime` and verify error
   - Mock response missing `heatmap` and verify error
   - Mock null response and verify error
   - Mock non-object response and verify error

## Branch Name
`feature/009-add-response-validation`

## Estimated Scope
- 1 file modified
- ~40-60 lines of code added
- Test updates
