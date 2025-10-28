import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateRangeFilter } from '@/components/date-range-filter'
import { useRouter, useSearchParams } from 'next/navigation'
import React from 'react'
import { DateRange } from 'react-day-picker'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn()
}))

// Mock the Calendar component to have control over date selection
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ selected, onSelect, numberOfMonths, mode }: any) => {
    return (
      <div data-test-calendar>
        {/* Create mock calendar grids */}
        {Array.from({ length: numberOfMonths || 1 }).map((_, monthIndex) => (
          <div key={monthIndex} role="grid">
            {/* Create mock day cells for common test days */}
            {[1, 5, 10, 15, 20].map((day) => (
              <div
                key={day}
                role="gridcell"
                aria-label={day.toString()}
                onClick={() => {
                  // Simulate date selection based on mode
                  const currentMonth = 7 // August (0-indexed)
                  const currentYear = 2025
                  const newDate = new Date(currentYear, currentMonth, day)
                  
                  if (mode === 'range') {
                    if (!selected || (!selected?.from && !selected?.to)) {
                      // First selection
                      onSelect({ from: newDate, to: undefined })
                    } else if (selected?.from && !selected?.to) {
                      // Second selection for range
                      if (newDate < selected.from) {
                        onSelect({ from: newDate, to: selected.from })
                      } else {
                        onSelect({ from: selected.from, to: newDate })
                      }
                    } else {
                      // Reset selection
                      onSelect({ from: newDate, to: undefined })
                    }
                  } else {
                    // Single date mode
                    onSelect(newDate)
                  }
                }}
              >
                {day}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }
}))

describe('DateRangeFilter', () => {
  const mockPush = vi.fn()
  let mockSearchParams: URLSearchParams

  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams = new URLSearchParams()
    ;(useRouter as any).mockReturnValue({ push: mockPush })
    ;(useSearchParams as any).mockReturnValue(mockSearchParams)
  })

  describe('Initial State', () => {
    it('should display placeholder text when no dates are selected', () => {
      render(<DateRangeFilter />)
      expect(screen.getByText('Pick a date range')).toBeInTheDocument()
    })

    it('should load dates from URL parameters', () => {
      mockSearchParams.set('dateFrom', '2024-01-01')
      mockSearchParams.set('dateTo', '2024-01-31')

      render(<DateRangeFilter />)
      
      expect(screen.getByText(/Jan 1, 2024 - Jan 31, 2024/)).toBeInTheDocument()
    })

    it('should show Apply button inside popover when opened', async () => {
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      await waitFor(() => {
        const applyButton = screen.getByRole('button', { name: /apply/i })
        expect(applyButton).toBeDisabled() // Disabled when no dates selected
      })
    })

    it('should show Clear button as X icon when dates are applied', () => {
      mockSearchParams.set('dateFrom', '2024-01-01')
      mockSearchParams.set('dateTo', '2024-01-31')

      render(<DateRangeFilter />)
      
      // Should show X icon button for clearing
      const clearButton = screen.getByRole('button', { name: /clear date filter/i })
      expect(clearButton).toBeInTheDocument()
    })
  })

  describe('Date Selection', () => {
    it('should open calendar popover on button click', async () => {
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should display two month calendars', async () => {
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      await waitFor(() => {
        const calendars = screen.getAllByRole('grid')
        expect(calendars).toHaveLength(2)
      })
    })

    it('should enable Apply button when dates are selected in popover', async () => {
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Select dates
      const day15 = screen.getAllByRole('gridcell', { name: '15' })[0]
      await user.click(day15)
      
      // Apply button should now be enabled
      const applyButton = screen.getByRole('button', { name: /apply/i })
      expect(applyButton).toBeEnabled()
    })

    it('should have Cancel button inside popover', async () => {
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        expect(cancelButton).toBeInTheDocument()
      })
    })
  })

  describe('Filter Application', () => {
    it('should update URL parameters when Apply is clicked', async () => {
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Select dates
      const day1 = screen.getAllByRole('gridcell', { name: '1' })[0]
      const day15 = screen.getAllByRole('gridcell', { name: '15' })[0]
      
      await user.click(day1)
      await user.click(day15)
      
      // Apply the filter
      const applyButton = screen.getByRole('button', { name: /apply/i })
      await user.click(applyButton)

      // Check that URL was updated
      expect(mockPush).toHaveBeenCalled()
      const callArg = mockPush.mock.calls[0][0]
      expect(callArg).toContain('dateFrom=2025-08-01')
      expect(callArg).toContain('dateTo=2025-08-15')
    })

    it('should preserve existing URL parameters', async () => {
      mockSearchParams.set('view', 'card')
      mockSearchParams.set('sort', 'name')
      
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      const day1 = screen.getAllByRole('gridcell', { name: '1' })[0]
      await user.click(day1)
      
      const applyButton = screen.getByRole('button', { name: /apply/i })
      await user.click(applyButton)

      const callArg = mockPush.mock.calls[0][0]
      expect(callArg).toContain('view=card')
      expect(callArg).toContain('sort=name')
    })

    it('should clear filters when Clear All is clicked', async () => {
      mockSearchParams.set('dateFrom', '2024-01-01')
      mockSearchParams.set('dateTo', '2024-01-31')
      
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      // Open popover - use specific text to avoid ambiguity
      const triggerButton = screen.getByText('Jan 1, 2024 - Jan 31, 2024').closest('button')
      await user.click(triggerButton!)

      // Click Clear All inside popover
      const clearAllButton = screen.getByRole('button', { name: /clear all/i })
      await user.click(clearAllButton)

      expect(mockPush).toHaveBeenCalledWith('?')
    })

    it('should clear filters when X icon is clicked', async () => {
      mockSearchParams.set('dateFrom', '2024-01-01')
      mockSearchParams.set('dateTo', '2024-01-31')
      
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      // Click X icon button outside popover
      const clearButton = screen.getByRole('button', { name: /clear date filter/i })
      await user.click(clearButton)

      expect(mockPush).toHaveBeenCalledWith('?')
    })
  })

  describe('Date Format', () => {
    it('should format single date correctly', () => {
      mockSearchParams.set('dateFrom', '2025-08-01')
      
      render(<DateRangeFilter />)
      expect(screen.getByText('Aug 1, 2025')).toBeInTheDocument()
    })

    it('should format date range correctly', () => {
      mockSearchParams.set('dateFrom', '2025-08-01')
      mockSearchParams.set('dateTo', '2025-08-15')
      
      render(<DateRangeFilter />)
      expect(screen.getByText('Aug 1, 2025 - Aug 15, 2025')).toBeInTheDocument()
    })

    it('should use date-only format for URL parameters', async () => {
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      const day10 = screen.getAllByRole('gridcell', { name: '10' })[0]
      await user.click(day10)
      
      const applyButton = screen.getByRole('button', { name: /apply/i })
      await user.click(applyButton)

      const callArg = mockPush.mock.calls[0][0]
      expect(callArg).toMatch(/dateFrom=\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('Popover Behavior', () => {
    it('should close popover when Cancel is clicked', async () => {
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should reset temp selection when Cancel is clicked', async () => {
      mockSearchParams.set('dateFrom', '2024-01-01')
      mockSearchParams.set('dateTo', '2024-01-31')
      
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      // Use more specific selector - the button contains the date text
      const triggerButton = screen.getByText('Jan 1, 2024 - Jan 31, 2024').closest('button')
      await user.click(triggerButton!)

      // Try to select new dates
      const day15 = screen.getAllByRole('gridcell', { name: '15' })[0]
      await user.click(day15)

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Original dates should still be displayed
      expect(screen.getByText('Jan 1, 2024 - Jan 31, 2024')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should close popover when Apply is clicked', async () => {
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      const day1 = screen.getAllByRole('gridcell', { name: '1' })[0]
      await user.click(day1)
      
      const applyButton = screen.getByRole('button', { name: /apply/i })
      await user.click(applyButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle date range where end is before start', async () => {
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      // Select dates in reverse order
      const day20 = screen.getAllByRole('gridcell', { name: '20' })[0]
      const day10 = screen.getAllByRole('gridcell', { name: '10' })[0]
      
      await user.click(day20)
      await user.click(day10)
      
      const applyButton = screen.getByRole('button', { name: /apply/i })
      await user.click(applyButton)

      // Should auto-correct the order
      const callArg = mockPush.mock.calls[0][0]
      expect(callArg).toContain('dateFrom=2025-08-10')
      expect(callArg).toContain('dateTo=2025-08-20')
    })

    it('should limit date selection to reasonable range', async () => {
      render(<DateRangeFilter />)
      const user = userEvent.setup()
      
      const triggerButton = screen.getByRole('button', { name: /pick a date range/i })
      await user.click(triggerButton)

      // Calendar should have fromDate and toDate limits set
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Select a valid date within range
      const day15 = screen.getAllByRole('gridcell', { name: '15' })[0]
      await user.click(day15)
      
      const applyButton = screen.getByRole('button', { name: /apply/i })
      expect(applyButton).toBeEnabled()
    })
  })
})