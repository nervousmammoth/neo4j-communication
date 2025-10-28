import { getUsersPaginated } from '@/lib/api-client'
import { PaginationWithPrefetch } from '@/components/pagination-prefetch'
import { UsersView } from '@/components/users-view'
import Link from 'next/link'
import { UsersPageWithErrorBoundary } from '@/components/error-boundaries/user-list-error-boundary'

interface PageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
  }>
}

export default async function UsersPage({ searchParams }: PageProps) {
  // Parse and validate pagination params
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10) || 20))

  try {
    const { users, pagination } = await getUsersPaginated({ page, limit })

    // Empty state for no users
    if (users.length === 0) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Header without toggle since there's no content to toggle */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Users</h1>
            </div>
            
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">No users found</h2>
              {pagination.page > pagination.totalPages && pagination.totalPages > 0 ? (
                <>
                  <p className="text-muted-foreground mb-4">Try going back to the first page.</p>
                  <Link 
                    href="/users" 
                    className="text-primary hover:underline"
                  >
                    Go to first page
                  </Link>
                </>
              ) : (
                <p className="text-muted-foreground">There are no users to display.</p>
              )}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <UsersPageWithErrorBoundary>
          <UsersView users={users} currentPage={page} />
          
          <PaginationWithPrefetch
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            showPageSize={true}
            showTotal={true}
            className="mt-8"
          />
        </UsersPageWithErrorBoundary>
      </div>
    )
  } catch (error) {
    console.error('Error loading users:', error)
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header without toggle since there's an error */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Users</h1>
          </div>
          
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2 text-red-600">Error loading users</h2>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      </div>
    )
  }
}