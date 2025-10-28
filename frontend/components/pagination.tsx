'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  limit: number
  total: number
  totalPages: number
  showTotal?: boolean
  showPageSize?: boolean
  className?: string
}

export function Pagination({
  page,
  limit,
  total,
  totalPages,
  showTotal = true,
  showPageSize = false,
  className,
}: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Don't render if there's only one page or no items
  if (totalPages <= 1 || total === 0) {
    return null
  }

  const navigateToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    
    if (newPage === 1) {
      params.delete('page')
    } else {
      params.set('page', newPage.toString())
    }
    
    const queryString = params.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname
    router.push(url)
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
    const params = new URLSearchParams(searchParams)
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