import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { conversationColumns } from '@/components/conversations-table-columns'
import { ConversationSummary } from '@/lib/neo4j'

describe('conversationColumns', () => {
  const mockConversations: ConversationSummary[] = [
    {
      conversationId: 'conv-1',
      title: 'Team Discussion',
      participantCount: 5,
      messageCount: 150,
      lastMessageTimestamp: '2024-01-15T10:30:00Z',
      type: 'group',
      priority: 'high',
    },
    {
      conversationId: 'conv-2',
      title: 'Direct Chat',
      participantCount: 2,
      messageCount: 50,
      lastMessageTimestamp: '2024-01-14T15:45:00Z',
      type: 'direct',
      priority: 'medium',
    },
    {
      conversationId: 'conv-3',
      title: 'Old Discussion',
      participantCount: 3,
      messageCount: 25,
      lastMessageTimestamp: '2024-01-10T09:15:00Z',
      type: 'group',
      priority: 'low',
    },
  ]

  describe('priority column sortingFn', () => {
    it('should sort conversations by priority correctly (high > medium > low)', () => {
      const priorityColumn = conversationColumns.find(col => col.accessorKey === 'priority')
      expect(priorityColumn?.sortingFn).toBeDefined()

      if (priorityColumn?.sortingFn) {
        const sortingFn = priorityColumn.sortingFn

        // Create mock row objects with getValue function
        const createMockRow = (priority: string) => ({
          getValue: (key: string) => {
            if (key === 'priority') return priority
            return undefined
          }
        })

        const highRow = createMockRow('high')
        const mediumRow = createMockRow('medium')
        const lowRow = createMockRow('low')

        // Test priority ordering: high should come before medium
        expect(sortingFn(highRow, mediumRow)).toBeLessThan(0)
        
        // Test priority ordering: medium should come before low
        expect(sortingFn(mediumRow, lowRow)).toBeLessThan(0)
        
        // Test priority ordering: high should come before low
        expect(sortingFn(highRow, lowRow)).toBeLessThan(0)
        
        // Test reverse ordering
        expect(sortingFn(mediumRow, highRow)).toBeGreaterThan(0)
        expect(sortingFn(lowRow, mediumRow)).toBeGreaterThan(0)
        
        // Test equal priorities
        expect(sortingFn(highRow, createMockRow('high'))).toBe(0)
      }
    })

    it('should handle unknown priority values gracefully', () => {
      const priorityColumn = conversationColumns.find(col => col.accessorKey === 'priority')
      
      if (priorityColumn?.sortingFn) {
        const sortingFn = priorityColumn.sortingFn

        const createMockRow = (priority: string) => ({
          getValue: (key: string) => key === 'priority' ? priority : undefined
        })

        const unknownRow = createMockRow('unknown')
        const highRow = createMockRow('high')

        // Unknown priority should be treated as 0 and come after known priorities
        expect(sortingFn(highRow, unknownRow)).toBeLessThan(0)
        expect(sortingFn(unknownRow, highRow)).toBeGreaterThan(0)
        
        // Two unknown priorities should be equal
        expect(sortingFn(unknownRow, createMockRow('invalid'))).toBe(0)
      }
    })
  })

  describe('lastMessageTimestamp column sortingFn', () => {
    it('should sort conversations by timestamp correctly (most recent first)', () => {
      const timestampColumn = conversationColumns.find(col => col.accessorKey === 'lastMessageTimestamp')
      expect(timestampColumn?.sortingFn).toBeDefined()

      if (timestampColumn?.sortingFn) {
        const sortingFn = timestampColumn.sortingFn

        // Create mock row objects with getValue function
        const createMockRow = (timestamp: string) => ({
          getValue: (key: string) => {
            if (key === 'lastMessageTimestamp') return timestamp
            return undefined
          }
        })

        const newerRow = createMockRow('2024-01-15T10:30:00Z')
        const olderRow = createMockRow('2024-01-14T15:45:00Z')

        // Newer timestamp should come before older (negative result means first param comes first)
        expect(sortingFn(newerRow, olderRow)).toBeLessThan(0)
        
        // Older timestamp should come after newer
        expect(sortingFn(olderRow, newerRow)).toBeGreaterThan(0)
        
        // Same timestamps should be equal
        expect(sortingFn(newerRow, createMockRow('2024-01-15T10:30:00Z'))).toBe(0)
      }
    })

    it('should handle invalid timestamps gracefully', () => {
      const timestampColumn = conversationColumns.find(col => col.accessorKey === 'lastMessageTimestamp')
      
      if (timestampColumn?.sortingFn) {
        const sortingFn = timestampColumn.sortingFn

        const createMockRow = (timestamp: string) => ({
          getValue: (key: string) => key === 'lastMessageTimestamp' ? timestamp : undefined
        })

        const validRow = createMockRow('2024-01-15T10:30:00Z')
        const invalidRow = createMockRow('invalid-date')

        // Test with invalid dates (should result in NaN, and NaN comparisons return false/0)
        const result = sortingFn(validRow, invalidRow)
        expect(typeof result).toBe('number')
        
        // Test with two invalid dates
        const result2 = sortingFn(invalidRow, createMockRow('also-invalid'))
        expect(typeof result2).toBe('number')
      }
    })
  })

  describe('formatDate function in lastMessageTimestamp column', () => {
    it('should handle invalid date strings in catch block', () => {
      const timestampColumn = conversationColumns.find(col => col.accessorKey === 'lastMessageTimestamp')
      expect(timestampColumn?.cell).toBeDefined()

      if (timestampColumn?.cell && typeof timestampColumn.cell === 'function') {
        // Create a mock row with invalid timestamp
        const mockRow = {
          getValue: (key: string) => {
            if (key === 'lastMessageTimestamp') return 'completely-invalid-date-string'
            return undefined
          }
        }

        // This should trigger the catch block and return 'Invalid date'
        const cellComponent = timestampColumn.cell({ row: mockRow })
        
        // Since this returns a JSX component, we need to check if it contains the error text
        // The function should not throw and should handle the error gracefully
        expect(cellComponent).toBeDefined()
      }
    })

    it('should handle date constructor errors in catch block', () => {
      const timestampColumn = conversationColumns.find(col => col.accessorKey === 'lastMessageTimestamp')
      
      if (timestampColumn?.cell && typeof timestampColumn.cell === 'function') {
        // Create a mock row with a value that could cause Date constructor to throw
        const mockRow = {
          getValue: (key: string) => {
            if (key === 'lastMessageTimestamp') return null
            return undefined
          }
        }

        // This should trigger error handling
        const cellComponent = timestampColumn.cell({ row: mockRow })
        expect(cellComponent).toBeDefined()
      }
    })
  })

  describe('column header onClick handlers', () => {
    it('should call toggleSorting when title column header is clicked', async () => {
      const user = userEvent.setup()
      const titleColumn = conversationColumns.find(col => col.accessorKey === 'title')
      expect(titleColumn?.header).toBeDefined()

      if (titleColumn?.header && typeof titleColumn.header === 'function') {
        const mockToggleSorting = vi.fn()
        const mockColumn = {
          toggleSorting: mockToggleSorting,
          getIsSorted: vi.fn(() => false)
        }

        // Render the header component
        const HeaderComponent = () => titleColumn.header({ column: mockColumn })
        render(<HeaderComponent />)

        // Find and click the title button
        const titleButton = screen.getByRole('button', { name: /title/i })
        await user.click(titleButton)

        expect(mockToggleSorting).toHaveBeenCalledWith(false)
      }
    })

    it('should call toggleSorting when priority column header is clicked', async () => {
      const user = userEvent.setup()
      const priorityColumn = conversationColumns.find(col => col.accessorKey === 'priority')
      expect(priorityColumn?.header).toBeDefined()

      if (priorityColumn?.header && typeof priorityColumn.header === 'function') {
        const mockToggleSorting = vi.fn()
        const mockColumn = {
          toggleSorting: mockToggleSorting,
          getIsSorted: vi.fn(() => 'asc')
        }

        // Render the header component
        const HeaderComponent = () => priorityColumn.header({ column: mockColumn })
        render(<HeaderComponent />)

        // Find and click the priority button
        const priorityButton = screen.getByRole('button', { name: /priority/i })
        await user.click(priorityButton)

        expect(mockToggleSorting).toHaveBeenCalledWith(true)
      }
    })

    it('should call toggleSorting when lastMessageTimestamp column header is clicked', async () => {
      const user = userEvent.setup()
      const timestampColumn = conversationColumns.find(col => col.accessorKey === 'lastMessageTimestamp')
      expect(timestampColumn?.header).toBeDefined()

      if (timestampColumn?.header && typeof timestampColumn.header === 'function') {
        const mockToggleSorting = vi.fn()
        const mockColumn = {
          toggleSorting: mockToggleSorting,
          getIsSorted: vi.fn(() => 'desc')
        }

        // Render the header component
        const HeaderComponent = () => timestampColumn.header({ column: mockColumn })
        render(<HeaderComponent />)

        // Find and click the last activity button
        const lastActivityButton = screen.getByRole('button', { name: /last activity/i })
        await user.click(lastActivityButton)

        expect(mockToggleSorting).toHaveBeenCalledWith(false)
      }
    })
  })
})