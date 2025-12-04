# Issue 013: Fix Skipped Export Dropdown Test

## Priority
**Low**

## Type
Test Fix

## Problem Statement

The export dropdown component has a skipped test at line 151:

```typescript
it.skip('should close dropdown when clicking outside', async () => {
```

Skipped tests indicate incomplete test coverage and can mask regressions if the underlying functionality breaks.

## User Story

**As a** developer maintaining the test suite
**I want** all tests to be active and passing (or properly documented if untestable)
**So that** test coverage is complete and regressions are caught automatically

## Affected Files

- `frontend/__tests__/components/export-dropdown.test.tsx` (line 151)

## Requirements

### Functional Requirements
1. Investigate why the test was skipped
2. Either fix the test implementation or document why it cannot be tested
3. Remove the skip if fixed, or convert to a documented limitation

### Non-Functional Requirements
1. Test should reliably pass if unskipped
2. Clear documentation if test cannot be implemented

## Technical Approach

### 1. Investigate the Issue

Common reasons for skipping click-outside tests in JSDOM:
- JSDOM doesn't fully support `document.elementFromPoint`
- Event bubbling behaves differently than real browsers
- Focus management issues
- Radix UI Popover may use different closing mechanisms

### 2. Potential Solutions

**Option A: Use userEvent properly**
```typescript
it('should close dropdown when clicking outside', async () => {
  const user = userEvent.setup();
  render(<ExportDropdown {...props} />);

  // Open dropdown
  await user.click(screen.getByRole('button', { name: /export/i }));
  expect(screen.getByRole('menu')).toBeInTheDocument();

  // Click outside - use body or a wrapper element
  await user.click(document.body);

  // Verify closed
  await waitFor(() => {
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
```

**Option B: Use Radix's dismiss mechanism**
```typescript
it('should close dropdown when pressing Escape', async () => {
  const user = userEvent.setup();
  render(<ExportDropdown {...props} />);

  await user.click(screen.getByRole('button', { name: /export/i }));
  await user.keyboard('{Escape}');

  await waitFor(() => {
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
```

**Option C: Document limitation and remove test**
If click-outside cannot be reliably tested in JSDOM, document this and remove the skipped test:
```typescript
// Note: Click-outside behavior is handled by Radix UI Popover
// and cannot be reliably tested in JSDOM. Manual testing required.
```

### 3. Implementation Steps

1. Read the current test implementation
2. Identify the specific failure
3. Try fixes from Options A and B
4. If unsuccessful, implement Option C with documentation

## Acceptance Criteria

- [ ] Skipped test is either fixed and passes, or removed with documentation
- [ ] No `.skip()` remains in the test file
- [ ] If removed, comment explains why and how to manually test
- [ ] All other tests continue to pass

## Test Plan

1. **Fix Verification:**
   - Unskip test and run it
   - Verify it passes reliably (run multiple times)
   - Ensure no flakiness

2. **Alternative Verification (if removed):**
   - Document manual test steps
   - Verify Escape key test exists and passes
   - Ensure other dropdown tests cover critical paths

## Branch Name
`fix/013-export-dropdown-test`

## Estimated Scope
- 1 file modified
- ~10-30 lines of code changed
