import { NextRequest, NextResponse } from 'next/server';
import { getUserCommunicationData } from '@/lib/neo4j';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId1: string; userId2: string }> }
) {
  try {
    const { userId1, userId2 } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    // Input validation
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50));
    const conversationId = searchParams.get('conversationId') || undefined;
    
    // Date filtering parameters
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    
    // Validate date format if provided (ISO 8601 format)
    if (dateFrom && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(dateFrom)) {
      return NextResponse.json(
        { error: 'Invalid dateFrom format. Expected ISO 8601 format.' },
        { status: 400 }
      );
    }
    if (dateTo && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(dateTo)) {
      return NextResponse.json(
        { error: 'Invalid dateTo format. Expected ISO 8601 format.' },
        { status: 400 }
      );
    }
    
    // Validate user IDs are provided
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
    
    // Normalize user IDs for consistent caching
    // Always put the "smaller" ID first to ensure consistent URLs
    const [normalizedId1, normalizedId2] = [userId1, userId2].sort();
    
    // Get communication data
    const data = await getUserCommunicationData(
      normalizedId1,
      normalizedId2,
      { page, limit, conversationId, dateFrom, dateTo }
    );
    
    // Handle specific cases
    if (!data.user1 || !data.user2) {
      return NextResponse.json(
        { error: 'One or both users not found' },
        { status: 404 }
      );
    }
    
    // Return the data with original user order preserved
    // If the IDs were swapped during normalization, swap the users back
    const responseData = userId1 === normalizedId1 
      ? data 
      : {
          ...data,
          user1: data.user2,
          user2: data.user1,
          communicationStats: {
            ...data.communicationStats,
            user1Messages: data.communicationStats.user2Messages,
            user2Messages: data.communicationStats.user1Messages,
          },
          sharedConversations: data.sharedConversations.map(conv => ({
            ...conv,
            user1MessageCount: conv.user2MessageCount,
            user2MessageCount: conv.user1MessageCount,
          })),
        };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Communication API Error:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Users not found' },
          { status: 404 }
        );
      }
      
      // Log the full error for debugging
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch communication data' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering since this route uses searchParams
export const dynamic = 'force-dynamic';

// Enable caching for 5 minutes
export const revalidate = 300;