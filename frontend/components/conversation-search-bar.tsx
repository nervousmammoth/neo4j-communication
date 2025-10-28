'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface ConversationSearchBarProps {
  initialQuery?: string
  initialType?: 'group' | 'direct'
  initialPriority?: 'high' | 'medium' | 'low'
}

export function ConversationSearchBar({
  initialQuery = '',
  initialType,
  initialPriority
}: ConversationSearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [type, setType] = useState<string | undefined>(initialType)
  const [priority, setPriority] = useState<string | undefined>(initialPriority)

  // Debounce the search query
  const debouncedQuery = useDebounce(query, 300)

  // Stabilize searchParams dependency to prevent unnecessary re-renders
  const searchParamsString = searchParams.toString()

  // Update URL when search parameters change
  useEffect(() => {
    const params = new URLSearchParams(searchParamsString)

    // Update query parameter
    if (debouncedQuery) {
      params.set('query', debouncedQuery)
    } else {
      params.delete('query')
    }

    // Update filter parameters
    if (type) {
      params.set('type', type)
    } else {
      params.delete('type')
    }

    if (priority) {
      params.set('priority', priority)
    } else {
      params.delete('priority')
    }

    // Reset to first page when search changes
    if (debouncedQuery || type || priority) {
      params.set('page', '1')
    }

    // Navigate to the new URL
    router.push(`/conversations?${params.toString()}`)
  }, [debouncedQuery, type, priority, router, searchParamsString])

  const handleClear = () => {
    setQuery('')
    setType(undefined)
    setPriority(undefined)
    router.push('/conversations')
  }

  const hasActiveFilters = query || type || priority

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search conversations by title or participant..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={handleClear}
            className="whitespace-nowrap"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={type} onValueChange={(value) => setType(value === 'all' ? undefined : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="group">Group</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={(value) => setPriority(value === 'all' ? undefined : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Priority: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
