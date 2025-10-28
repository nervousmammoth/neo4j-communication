/**
 * Health Check Endpoint
 *
 * Used by Docker health checks and monitoring systems to verify
 * the application is running and responsive.
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'neo4j-communication-frontend',
    },
    { status: 200 }
  )
}
