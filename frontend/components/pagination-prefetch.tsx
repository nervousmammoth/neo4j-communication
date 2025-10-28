'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useConversations } from '@/hooks/useConversations'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getConversationsPaginated } from '@/lib/api-client'
import { useCallback, useRef, useEffect } from 'react'

interface PaginationWithPrefetchProps {
  page: number
  limit: number
  total: number
  totalPages: number
  showTotal?: boolean
  showPageSize?: boolean
  className?: string
}

export function PaginationWithPrefetch({
  page,
  limit,
  total,
  totalPages,
  showTotal = true,
  showPageSize = false,
  className,
}: PaginationWithPrefetchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  
  // Use the conversations hook for automatic prefetching
  useConversations(page, limit)

  // Track prefetch timers to prevent rapid calls
  const prefetchTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Clean up timers on unmount to prevent memory leaks
  useEffect(() => {
    const timers = prefetchTimersRef.current
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
    }
  }, [])

  const navigateToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (newPage === 1) {
      params.delete('page')
    } else {
      params.set('page', newPage.toString())
    }
    
    const queryString = params.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname
    router.push(url)
  }

  const debouncedPrefetch = useCallback((targetPage: number) => {
    const timers = prefetchTimersRef.current
    const key = `page-${targetPage}`
    
    // Clear existing timer for this page
    const existingTimer = timers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      // Prefetch the route
      const params = new URLSearchParams(searchParams.toString())
      if (targetPage === 1) {
        params.delete('page')
      } else {
        params.set('page', targetPage.toString())
      }
      const queryString = params.toString()
      const url = queryString ? `${pathname}?${queryString}` : pathname
      router.prefetch(url)

      // Prefetch the data using TanStack Query
      queryClient.prefetchQuery({
        queryKey: ['conversations', { page: targetPage, limit }],
        queryFn: ({ signal }) => getConversationsPaginated({ page: targetPage, limit }, signal),
        staleTime: 5 * 60 * 1000,
      })

      // Remove timer from map
      timers.delete(key)
    }, 150) // 150ms debounce

    // Update timers map
    timers.set(key, timer)
  }, [pathname, searchParams, router, queryClient, limit])

  // Don't render if there's only one page or no items
  if (totalPages <= 1 || total === 0) {
    return null
  }

  const handlePrefetch = (targetPage: number, isDisabled: boolean = false, isCurrent: boolean = false) => {
    if (isDisabled || isCurrent || targetPage < 1 || targetPage > totalPages) {
      return
    }
    debouncedPrefetch(targetPage)
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7
    const halfVisible = Math.floor(maxVisible / 2)

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (page <= halfVisible) {
        // Near the beginning
        for (let i = 2; i <= maxVisible - 2; i++) {
          pages.push(i)
        }
        pages.push('...')
      } else if (page >= totalPages - halfVisible) {
        // Near the end
        pages.push('...')
        for (let i = totalPages - maxVisible + 3; i < totalPages; i++) {
          pages.push(i)
        }
      } else {
        // In the middle
        pages.push('...')
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  const handlePageSizeChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', newLimit)
    params.delete('page') // Reset to first page when changing page size
    const queryString = params.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname
    router.push(url)
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-4', className)}
    >
      <div className="flex items-center gap-2">
        {showTotal && (
          <span className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'conversation' : 'conversations'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(page - 1)}
          onMouseEnter={() => handlePrefetch(page - 1, page === 1)}
          disabled={page === 1}
          aria-label="Go to previous page"
          aria-disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNum, index) => {
            if (pageNum === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2">
                  ...
                </span>
              )
            }

            const pageNumber = pageNum as number
            const isCurrent = pageNumber === page

            return (
              <Button
                key={pageNumber}
                variant={isCurrent ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigateToPage(pageNumber)}
                onMouseEnter={() => handlePrefetch(pageNumber, false, isCurrent)}
                aria-label={`Go to page ${pageNumber}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'min-w-[40px]',
                  isCurrent && 'pointer-events-none'
                )}
              >
                {pageNumber}
              </Button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(page + 1)}
          onMouseEnter={() => handlePrefetch(page + 1, page === totalPages)}
          disabled={page === totalPages}
          aria-label="Go to next page"
          aria-disabled={page === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        {showPageSize && (
          <Select value={limit.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-[100px]" aria-label="Items per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </nav>
  )
}