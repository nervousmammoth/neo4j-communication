import { getConversationsPaginated, searchConversations } from '@/lib/api-client'
import { PaginationWithPrefetch } from '@/components/pagination-prefetch'
import { ConversationsView } from '@/components/conversations-view'
import { ConversationSearchBar } from '@/components/conversation-search-bar'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    query?: string
    type?: string
    priority?: string
  }>
}

export default async function ConversationsPage({ searchParams }: PageProps) {
  // Parse and validate pagination params
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10) || 20))
  const query = params.query?.trim()
  const type = params.type as 'group' | 'direct' | undefined
  const priority = params.priority as 'high' | 'medium' | 'low' | undefined

  try {
    // Determine if we're searching or listing
    const isSearching = Boolean(query)
    let conversations
    let total = 0
    let totalPages = 0

    if (isSearching && query) {
      // Search mode
      const searchResults = await searchConversations({
        query,
        type,
        priority,
        page,
        limit
      })
      conversations = searchResults.results
      total = searchResults.total
      totalPages = Math.ceil(total / limit)
    } else {
      // Regular listing mode
      const paginatedData = await getConversationsPaginated({ page, limit })
      conversations = paginatedData.conversations
      total = paginatedData.pagination.total
      totalPages = paginatedData.pagination.totalPages
    }

    // Empty state for no conversations
    if (conversations.length === 0) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <ConversationSearchBar
              initialQuery={query}
              initialType={type}
              initialPriority={priority}
            />

            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">
                {isSearching ? 'No conversations match your search' : 'No conversations found'}
              </h2>
              {isSearching ? (
                <>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search terms or filters
                  </p>
                  <Link
                    href="/conversations"
                    className="text-primary hover:underline"
                  >
                    Clear search and view all conversations
                  </Link>
                </>
              ) : (
                <p className="text-muted-foreground">There are no conversations to display.</p>
              )}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <ConversationSearchBar
            initialQuery={query}
            initialType={type}
            initialPriority={priority}
          />

          {isSearching && (
            <div className="text-sm text-muted-foreground">
              Found {total} {total === 1 ? 'conversation' : 'conversations'} matching &quot;{query}&quot;
            </div>
          )}

          <ConversationsView conversations={conversations} currentPage={page} />

          <PaginationWithPrefetch
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            showPageSize={true}
            showTotal={true}
            className="mt-8"
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading conversations:', error)
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header without toggle since there's an error */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Conversations</h1>
          </div>
          
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2 text-red-600">Error loading conversations</h2>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      </div>
    )
  }
}