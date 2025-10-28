'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Table, Grid3x3 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ViewToggleProps {
  view: 'list' | 'card'
  onViewChange: (view: 'list' | 'card') => void
  className?: string
}

/**
 * Toggle component for switching between list and card views.
 * 
 * Features:
 * - Accessible with ARIA labels and keyboard navigation
 * - Visual icons (Table for list, Grid for card)
 * - Follows shadcn/ui design patterns
 * 
 * @param view - Current active view
 * @param onViewChange - Callback when view changes
 * @param className - Optional CSS classes
 */
export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
  const handleValueChange = (value: string | undefined) => {
    // Only call onViewChange if we have a valid value and it's different from current
    if (value && value !== view && (value === 'list' || value === 'card')) {
      onViewChange(value as 'list' | 'card')
    }
  }

  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={handleValueChange}
      aria-label="Switch between list and card view"
      className={cn(className)}
    >
      <ToggleGroupItem
        value="list"
        aria-label="List view"
        className="data-[state=on]:bg-accent"
      >
        <Table className="h-4 w-4" />
        <span className="sr-only">List view</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="card"
        aria-label="Card view"
        className="data-[state=on]:bg-accent"
      >
        <Grid3x3 className="h-4 w-4" />
        <span className="sr-only">Card view</span>
      </ToggleGroupItem>
    </ToggleGroup>
  )
}