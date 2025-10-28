'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  flexRender,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { conversationColumns } from '@/components/conversations-table-columns'
import type { ConversationSummary } from '@/lib/neo4j'
import { cn } from '@/lib/utils'

interface ConversationsListProps {
  conversations: ConversationSummary[]
}

/**
 * Data table component for displaying conversations in list format.
 * 
 * Features:
 * - Built with TanStack React Table and shadcn/ui
 * - Sortable columns (title, priority, last activity)
 * - Keyboard navigation and accessibility support
 * - Mobile responsive with horizontal scroll
 * - Optimized performance with memoized handlers
 * 
 * @param conversations - Array of conversation data to display
 */
export function ConversationsList({ 
  conversations
}: ConversationsListProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable(useMemo(() => ({
    data: conversations,
    columns: conversationColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  }), [conversations, setSorting, sorting]))


  const handleRowClick = useCallback((conversationId: string) => {
    router.push(`/conversations/${conversationId}`)
  }, [router])

  const handleRowKeyDown = useCallback((event: React.KeyboardEvent, conversationId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleRowClick(conversationId)
    }
  }, [handleRowClick])

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="w-full">
        <div className="rounded-md border">
          <Table aria-label="Conversations">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead 
                      key={header.id}
                      className={cn(
                        header.column.getCanSort() && 'cursor-pointer select-none'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      aria-sort={
                        header.column.getIsSorted() === 'asc' 
                          ? 'ascending' 
                          : header.column.getIsSorted() === 'desc' 
                            ? 'descending' 
                            : 'none'
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell 
                  colSpan={conversationColumns.length} 
                  className="h-24 text-center"
                >
                  No conversations found.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-md border">
        <Table aria-label="Conversations" className="min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className={cn(
                      header.column.getCanSort() && 'cursor-pointer select-none'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    aria-sort={
                      header.column.getIsSorted() === 'asc' 
                        ? 'ascending' 
                        : header.column.getIsSorted() === 'desc' 
                          ? 'descending' 
                          : 'none'
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="cursor-pointer hover:bg-muted/50 focus:bg-muted/50 transition-colors"
                  onClick={() => handleRowClick(row.original.conversationId)}
                  onKeyDown={(e) => handleRowKeyDown(e, row.original.conversationId)}
                  tabIndex={0}
                  aria-label={`View conversation: ${row.original.title || 'Untitled Conversation'}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      className="py-3"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell 
                  colSpan={conversationColumns.length} 
                  className="h-24 text-center"
                >
                  No conversations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* Screen reader instruction - outside the table */}
        <div className="sr-only" aria-live="polite">
          Click row to view conversation details
        </div>
      </div>
    </div>
  )
}