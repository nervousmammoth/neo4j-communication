'use client'

import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Users, MessageCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ConversationSummary } from '@/lib/neo4j'
import { formatLastActivity } from '@/lib/date-formatting'

export const conversationColumns: ColumnDef<ConversationSummary>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const title = row.getValue('title') as string
      return (
        <div className="font-medium truncate max-w-xs">
          {title || 'Untitled Conversation'}
        </div>
      )
    },
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('type') as string
      return (
        <div className="capitalize">
          {type}
        </div>
      )
    },
  },
  {
    accessorKey: 'priority',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Priority
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const priority = row.getValue('priority') as string
      return (
        <div
          className={cn(
            'capitalize font-medium',
            {
              'text-red-600': priority === 'high',
              'text-yellow-600': priority === 'medium',
              'text-gray-600': priority === 'low',
            }
          )}
        >
          {priority}
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityA = priorityOrder[rowA.getValue('priority') as keyof typeof priorityOrder] || 0
      const priorityB = priorityOrder[rowB.getValue('priority') as keyof typeof priorityOrder] || 0
      return priorityB - priorityA // High priority first
    },
  },
  {
    accessorKey: 'participantCount',
    header: 'Participants',
    cell: ({ row }) => {
      const count = row.getValue('participantCount') as number
      return (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{count} {count === 1 ? 'participant' : 'participants'}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'messageCount',
    header: 'Messages',
    cell: ({ row }) => {
      const count = row.getValue('messageCount') as number
      return (
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span>{count} {count === 1 ? 'message' : 'messages'}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'lastMessageTimestamp',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Last Activity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const timestamp = row.getValue('lastMessageTimestamp') as string
      
      return (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatLastActivity(timestamp)}
          </span>
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.getValue('lastMessageTimestamp') as string)
      const dateB = new Date(rowB.getValue('lastMessageTimestamp') as string)
      return dateB.getTime() - dateA.getTime() // Most recent first
    },
  },
]