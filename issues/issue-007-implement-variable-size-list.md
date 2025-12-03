# Issue 007: Implement VariableSizeList for Message Timeline

## Priority
**Medium**

## Type
Enhancement

## Problem Statement

The message timeline component uses a fixed item height of 160px for virtual scrolling. This causes long messages to be clipped, as acknowledged in the code comment:

```typescript
// NOTE: Long messages may clip. Consider VariableSizeList if issues occur.
itemSize={160}
```

## Affected Files

- `frontend/components/message-timeline.tsx` (lines 183-190)

## Requirements

### Functional Requirements
1. Replace `FixedSizeList` with `VariableSizeList` from react-window
2. Calculate item height dynamically based on message content length
3. Handle different message types (text, reactions, attachments)
4. Reset cached sizes when data changes

### Non-Functional Requirements
1. Maintain smooth scrolling performance
2. No visual regressions for normal-length messages
3. Proper handling of window resize

## Technical Approach

### 1. Update Message Timeline Component

```typescript
import { VariableSizeList as List } from 'react-window';
import { useRef, useCallback, useEffect } from 'react';

// Height calculation function
const getItemSize = useCallback((index: number) => {
  const message = messages[index];
  const baseHeight = 80; // Avatar, name, timestamp
  const contentLength = message.content?.length || 0;

  // Estimate lines needed (approx 80 chars per line)
  const estimatedLines = Math.ceil(contentLength / 80);
  const contentHeight = Math.max(1, estimatedLines) * 24; // 24px per line

  // Add padding for reactions, attachments
  const reactionsHeight = message.reactions?.length ? 32 : 0;

  return baseHeight + contentHeight + reactionsHeight + 16; // 16px padding
}, [messages]);

// List ref for resetting sizes
const listRef = useRef<List>(null);

// Reset sizes when messages change
useEffect(() => {
  if (listRef.current) {
    listRef.current.resetAfterIndex(0);
  }
}, [messages]);

// In render:
<List
  ref={listRef}
  height={height}
  width={width}
  itemCount={messages.length}
  itemSize={getItemSize}
  overscanCount={5}
>
  {MessageRow}
</List>
```

### 2. Update Tests
Update `frontend/__tests__/components/message-timeline.test.tsx`:
- Test that long messages render fully without clipping
- Test that size calculation handles edge cases
- Test that list resets when messages change

## Acceptance Criteria

- [ ] Long messages display fully without clipping
- [ ] Short messages don't have excessive whitespace
- [ ] Scrolling remains smooth with variable heights
- [ ] List updates correctly when messages change
- [ ] All existing tests pass
- [ ] New tests cover height calculation logic

## Test Plan

1. **Unit Tests:**
   - Test `getItemSize()` returns appropriate heights for various content lengths
   - Test empty message handling
   - Test messages with reactions
   - Test list ref reset on data change

2. **Visual Testing:**
   - Verify short messages (~50 chars) display correctly
   - Verify medium messages (~200 chars) display correctly
   - Verify long messages (~500+ chars) display fully
   - Verify smooth scrolling through mixed-length messages

## Branch Name
`feature/007-variable-size-list`

## Estimated Scope
- 1 file modified significantly
- 1 test file updated
- ~50-80 lines of code changed
