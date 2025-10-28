import { NextRequest, NextResponse } from 'next/server';
import { getUserContacts } from '@/lib/neo4j';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    // Validate userId
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    
    // Fetch user contacts
    const { results, total } = await getUserContacts({
      userId,
      query,
      page,
      limit
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      results,
      total,
      page,
      limit,
      totalPages
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });
    
  } catch (error) {
    console.error('Error fetching user contacts:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      if (error.message === 'User not found') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    }
    
    // Generic error response
    return NextResponse.json(
      { error: 'Failed to fetch user contacts' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering since this route uses searchParams
export const dynamic = 'force-dynamic';