import { NextRequest, NextResponse } from 'next/server';
import { getAggregatedCommunicationData } from '@/lib/neo4j';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId1: string; userId2: string }> }
) {
  try {
    const { userId1, userId2 } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    // Get query parameters
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const granularity = searchParams.get('granularity') || 'daily';
    
    // Validate user IDs
    if (!userId1 || !userId2) {
      return NextResponse.json(
        { error: 'Both user IDs are required' },
        { status: 400 }
      );
    }
    
    // Validate user ID format (alphanumeric, hyphens, underscores only)
    const userIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!userIdPattern.test(userId1)) {
      return NextResponse.json(
        { error: 'Invalid userId1 format. Only alphanumeric characters, hyphens, and underscores are allowed.' },
        { status: 400 }
      );
    }
    if (!userIdPattern.test(userId2)) {
      return NextResponse.json(
        { error: 'Invalid userId2 format. Only alphanumeric characters, hyphens, and underscores are allowed.' },
        { status: 400 }
      );
    }
    
    // Validate date format if provided (ISO 8601 format)
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    if (dateFrom) {
      if (!isoDatePattern.test(dateFrom)) {
        return NextResponse.json(
          { error: 'Invalid dateFrom format. Expected ISO 8601 format.' },
          { status: 400 }
        );
      }
      // Also check if the date is actually valid
      const date = new Date(dateFrom);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid dateFrom format. Date is not valid.' },
          { status: 400 }
        );
      }
    }
    if (dateTo) {
      if (!isoDatePattern.test(dateTo)) {
        return NextResponse.json(
          { error: 'Invalid dateTo format. Expected ISO 8601 format.' },
          { status: 400 }
        );
      }
      // Also check if the date is actually valid
      const date = new Date(dateTo);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid dateTo format. Date is not valid.' },
          { status: 400 }
        );
      }
    }
    
    // Validate granularity
    if (!['daily', 'weekly', 'monthly'].includes(granularity)) {
      return NextResponse.json(
        { error: 'Invalid granularity. Must be one of: daily, weekly, monthly' },
        { status: 400 }
      );
    }
    
    // Fetch aggregated data
    const aggregatedData = await getAggregatedCommunicationData(
      userId1,
      userId2,
      {
        dateFrom,
        dateTo,
        granularity: granularity as 'daily' | 'weekly' | 'monthly'
      }
    );
    
    // Return the aggregated data with caching headers
    return NextResponse.json(aggregatedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate',
      },
    });
    
  } catch (error) {
    console.error('Error fetching aggregated communication data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aggregated communication data' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering since this route uses searchParams
export const dynamic = 'force-dynamic';