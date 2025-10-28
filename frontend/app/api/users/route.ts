import { NextRequest, NextResponse } from 'next/server';
import { getUsers, testConnection } from '@/lib/neo4j';
import { createHash } from 'crypto';
import { validateApiPaginationParams } from '@/lib/validated-params';

export async function GET(request: NextRequest) {
  try {
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }

    // Validate and sanitize pagination parameters with type safety
    const { page, limit } = validateApiPaginationParams(request, 'users-api');

    // Use the optimized getUsers function with validated parameters
    const result = await getUsers({ 
      page, 
      limit 
    });

    // Generate ETag from the response data if enabled
    if (process.env.ETAGS_ENABLED === 'true') {
      const dataHash = createHash('md5').update(JSON.stringify(result)).digest('hex');
      
      // Check if client has current data (If-None-Match header)
      const clientETag = request.headers.get('if-none-match');
      if (clientETag === dataHash) {
        // Return 304 Not Modified if data hasn't changed
        return new Response(null, { 
          status: 304,
          headers: { 'ETag': dataHash }
        });
      }

      // Return data with ETag header
      return NextResponse.json(result, {
        headers: { 'ETag': dataHash }
      });
    }

    // Return data without ETag
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}