# Issue 004: Create Missing `/api/errors` Endpoint

## Priority
**High**

## Type
Bug Fix

## Problem Statement

The `UserListErrorBoundary` component attempts to POST error reports to `/api/errors` in production environments, but this endpoint doesn't exist. This causes error reporting to fail silently, making it harder to debug production issues.

**Current behavior:** Error boundary catches errors and attempts to report them, but the POST request fails with 404.

**Expected behavior:** Error reports should be successfully submitted and logged for debugging purposes.

## Affected Files

- `frontend/components/error-boundaries/user-list-error-boundary.tsx` (lines 55-68) - calls the missing endpoint

## Requirements

### Functional Requirements
1. Create POST endpoint at `/api/errors` that accepts error reports
2. Endpoint should accept JSON body with error details (message, stack, componentStack, timestamp, url)
3. Log errors appropriately based on environment
4. Return 200 OK response on successful receipt
5. Handle malformed requests gracefully with 400 response

### Non-Functional Requirements
1. Endpoint should be lightweight and fast
2. Should not expose sensitive information in responses
3. Should follow existing API route patterns in the codebase

## Technical Approach

### 1. Create API Route
Create `frontend/app/api/errors/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  timestamp: string
  url: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ErrorReport = await request.json()

    // Validate required fields
    if (!body.message || !body.timestamp || !body.url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Log the error (in production, this could go to a logging service)
    console.error('[Client Error Report]', {
      message: body.message,
      stack: body.stack,
      componentStack: body.componentStack,
      timestamp: body.timestamp,
      url: body.url,
      receivedAt: new Date().toISOString()
    })

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Error API] Failed to process error report:', error)
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 400 }
    )
  }
}
```

### 2. Create Tests
Create `frontend/__tests__/app/api/errors/route.test.ts` with tests for:
- Successful error report submission
- Missing required fields validation
- Malformed JSON handling
- Correct response structure

## Acceptance Criteria

- [ ] POST `/api/errors` endpoint exists and returns 200 for valid requests
- [ ] Endpoint validates required fields (message, timestamp, url)
- [ ] Endpoint returns 400 for invalid requests
- [ ] Error reports are logged with structured format
- [ ] Tests achieve 100% coverage for the new endpoint
- [ ] Existing error boundary integration works without changes

## Test Plan

1. **Unit Tests:**
   - Test valid error report submission
   - Test missing required fields (message, timestamp, url)
   - Test malformed JSON body
   - Test empty body

2. **Integration Test:**
   - Verify error boundary successfully posts to endpoint (manual verification)

## Branch Name
`feature/004-create-api-errors-endpoint`

## Estimated Scope
- 1 new file (API route)
- 1 new test file
- ~50-80 lines of code
