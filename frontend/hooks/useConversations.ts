import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getConversationsPaginated } from '@/lib/api-client'

export function useConversations(page: number, limit: number = 20) {
  const queryClient = useQueryClient()
  
  // Main query with stale-while-revalidate
  const query = useQuery({
    queryKey: ['conversations', { page, limit }],
    queryFn: ({ signal }) => getConversationsPaginated({ page, limit }, signal),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
  })
  
  // Prefetch adjacent pages
  useEffect(() => {
    // Only prefetch if we have data and pagination info
    if (!query.data?.pagination) return
    
    const { totalPages } = query.data.pagination
    
    // Prefetch previous page (if not on first page)
    if (page > 1) {
      queryClient.prefetchQuery({
        queryKey: ['conversations', { page: page - 1, limit }],
        queryFn: ({ signal }) => getConversationsPaginated({ page: page - 1, limit }, signal),
        staleTime: 5 * 60 * 1000,
      })
    }
    
    // Prefetch next page (if not on last page)
    if (page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['conversations', { page: page + 1, limit }],
        queryFn: ({ signal }) => getConversationsPaginated({ page: page + 1, limit }, signal),
        staleTime: 5 * 60 * 1000,
      })
    }
  }, [page, limit, queryClient, query.data?.pagination])
  
  return query
}