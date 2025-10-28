import { NextRequest, NextResponse } from 'next/server';
import { searchUsers, testConnection } from '@/lib/neo4j';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const excludeUserId = searchParams.get('excludeUserId') || undefined;
    
    // Handle pagination with validation
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10') || 10));

    // If no query provided, return empty results
    if (!query.trim()) {
      return NextResponse.json({
        results: [],
        total: 0,
        query: '',
        executionTime: Date.now() - startTime
      });
    }

    // Perform the search
    const searchResult = await searchUsers({
      query: query.trim(),
      excludeUserId,
      page,
      limit
    });

    return NextResponse.json({
      results: searchResult.results,
      total: searchResult.total,
      query: query.trim(),
      executionTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering since this route uses searchParams
export const dynamic = 'force-dynamic';

// Enable caching for 1 minute
export const revalidate = 60;