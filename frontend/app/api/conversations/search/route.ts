import { NextRequest, NextResponse } from 'next/server';
import { searchConversations, testConnection } from '@/lib/neo4j';
import { validatePage, validateLimit } from '@/lib/validated-params';

// Valid values for filters
const VALID_TYPES = ['group', 'direct'] as const;
const VALID_PRIORITIES = ['high', 'medium', 'low'] as const;

// Type guards for filters
type ConversationType = typeof VALID_TYPES[number];
type PriorityType = typeof VALID_PRIORITIES[number];

function isValidType(value: string): value is ConversationType {
  return VALID_TYPES.includes(value as ConversationType);
}

function isValidPriority(value: string): value is PriorityType {
  return VALID_PRIORITIES.includes(value as PriorityType);
}

// ISO 8601 date pattern (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

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

    const { searchParams } = new URL(request.url);

    // Get and validate query parameter (required)
    const query = searchParams.get('query')?.trim();
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Validate query length (max 200 characters)
    if (query.length > 200) {
      return NextResponse.json(
        { error: 'Query parameter must not exceed 200 characters' },
        { status: 400 }
      );
    }

    // Get and validate optional filter parameters
    const type = searchParams.get('type');
    if (type && !isValidType(type)) {
      return NextResponse.json(
        { error: `Invalid type parameter. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const priority = searchParams.get('priority');
    if (priority && !isValidPriority(priority)) {
      return NextResponse.json(
        { error: `Invalid priority parameter. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate date parameters
    const dateFrom = searchParams.get('dateFrom');
    if (dateFrom) {
      if (!ISO_DATE_PATTERN.test(dateFrom) || isNaN(Date.parse(dateFrom))) {
        return NextResponse.json(
          { error: 'Invalid dateFrom parameter. Must be a valid ISO 8601 date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)' },
          { status: 400 }
        );
      }
    }

    const dateTo = searchParams.get('dateTo');
    if (dateTo) {
      if (!ISO_DATE_PATTERN.test(dateTo) || isNaN(Date.parse(dateTo))) {
        return NextResponse.json(
          { error: 'Invalid dateTo parameter. Must be a valid ISO 8601 date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)' },
          { status: 400 }
        );
      }
    }

    // Validate date range (dateTo must not be before dateFrom)
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      if (toDate < fromDate) {
        return NextResponse.json(
          { error: 'Invalid date range: dateTo must not be before dateFrom' },
          { status: 400 }
        );
      }
    }

    // Validate pagination parameters
    const page = validatePage(searchParams.get('page'), 'conversations-search-api');
    const limit = validateLimit(searchParams.get('limit'), 'conversations-search-api');

    // Build search options
    const searchOptions: Parameters<typeof searchConversations>[0] = {
      query,
      page,
      limit
    };

    // Add optional filters if provided
    if (type) {
      searchOptions.type = type as 'group' | 'direct';
    }
    if (priority) {
      searchOptions.priority = priority as 'high' | 'medium' | 'low';
    }
    if (dateFrom) {
      searchOptions.dateFrom = dateFrom;
    }
    if (dateTo) {
      searchOptions.dateTo = dateTo;
    }

    // Perform search
    const result = await searchConversations(searchOptions);

    // Return results
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error searching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to search conversations' },
      { status: 500 }
    );
  }
}
