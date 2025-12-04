import { NextRequest, NextResponse } from 'next/server'

interface ErrorReport {
  type?: string
  message?: string
  error?: string
  stack?: string
  componentStack?: string
  timestamp: string
  url: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ErrorReport = await request.json()

    // Support both 'message' and 'error' field names
    const errorMessage = body.message || body.error

    // Validate required fields
    if (!errorMessage || !body.timestamp || !body.url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Log the error
    console.error('[Client Error Report]', {
      type: body.type,
      message: errorMessage,
      stack: body.stack,
      componentStack: body.componentStack,
      timestamp: body.timestamp,
      url: body.url,
      receivedAt: new Date().toISOString(),
    })

    return NextResponse.json({ received: true }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 400 }
    )
  }
}
