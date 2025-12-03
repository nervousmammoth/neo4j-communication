# Issue 011: Add Error Boundary for User Detail Page

## Priority
**Low**

## Type
Enhancement

## Problem Statement

The `/users/[userId]` page lacks a dedicated `error.tsx` error boundary file. While errors are caught by the parent boundary, having a dedicated error boundary provides:

1. More specific error messages for user detail failures
2. Contextual retry functionality
3. Consistency with other pages that have dedicated error boundaries

## Affected Files

- Create: `frontend/app/(main)/users/[userId]/error.tsx`

## Current State

**Directory contents:**
- `page.tsx` - User detail page
- `loading.tsx` - Loading state
- `not-found.tsx` - 404 handling
- **Missing:** `error.tsx` - Error boundary

## Requirements

### Functional Requirements
1. Create error boundary component for user detail page
2. Display user-friendly error message
3. Provide retry functionality
4. Include link to return to users list

### Non-Functional Requirements
1. Follow existing error boundary patterns in the codebase
2. Consistent styling with other error components
3. Accessible error messaging

## Technical Approach

### 1. Create Error Boundary

Create `frontend/app/(main)/users/[userId]/error.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function UserDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('User detail page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="flex items-center gap-2 text-destructive mb-4">
        <AlertCircle className="h-8 w-8" />
        <h2 className="text-xl font-semibold">Failed to load user details</h2>
      </div>

      <p className="text-muted-foreground mb-6 text-center max-w-md">
        We couldn&apos;t load the user information. This might be a temporary issue.
      </p>

      <div className="flex gap-4">
        <Button onClick={reset} variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to users
          </Link>
        </Button>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-8 p-4 bg-muted rounded text-xs max-w-lg overflow-auto">
          {error.message}
        </pre>
      )}
    </div>
  )
}
```

### 2. Create Tests

Create `frontend/__tests__/app/(main)/users/[userId]/error.test.tsx`:
- Test error message displays
- Test retry button calls reset
- Test back link navigates to users list
- Test development mode shows error details

## Acceptance Criteria

- [ ] Error boundary file exists at correct path
- [ ] Error message is user-friendly
- [ ] Retry button triggers reset function
- [ ] Back to users link works
- [ ] Development mode shows error details
- [ ] Production mode hides technical details
- [ ] Tests achieve 100% coverage

## Test Plan

1. **Unit Tests:**
   - Render error boundary with mock error
   - Verify error message displays
   - Click retry button and verify reset called
   - Verify back link href is "/users"
   - Test NODE_ENV=development shows error details

2. **Manual Testing:**
   - Force an error on user detail page
   - Verify error boundary displays
   - Test retry functionality

## Branch Name
`feature/011-user-detail-error-boundary`

## Estimated Scope
- 1 new file (error boundary)
- 1 new test file
- ~60-80 lines of code
