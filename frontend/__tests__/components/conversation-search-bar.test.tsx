import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConversationSearchBar } from '@/components/conversation-search-bar'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRouter, useSearchParams } from 'next/navigation'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn()
}))

// Mock useDebounce hook
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value) // Return value immediately for testing
}))

describe('ConversationSearchBar', () => {
  const mockPush = vi.fn()
  const mockSearchParams = new URLSearchParams()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn()
    } as any)
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as any)
  })

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<ConversationSearchBar />)

      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('type', 'search')
    })

    it('should render type filter dropdown', () => {
      render(<ConversationSearchBar />)

      const typeFilter = screen.getByText('Type: All')
      expect(typeFilter).toBeInTheDocument()
    })

    it('should render priority filter dropdown', () => {
      render(<ConversationSearchBar />)

      const priorityFilter = screen.getByText('Priority: All')
      expect(priorityFilter).toBeInTheDocument()
    })

    it('should not show clear button when no filters active', () => {
      render(<ConversationSearchBar />)

      expect(screen.queryByText('Clear all')).not.toBeInTheDocument()
    })

    it('should show clear button when query is present', () => {
      render(<ConversationSearchBar initialQuery="test" />)

      expect(screen.getByText('Clear all')).toBeInTheDocument()
    })

    it('should show clear button when type filter is active', () => {
      render(<ConversationSearchBar initialType="group" />)

      expect(screen.getByText('Clear all')).toBeInTheDocument()
    })

    it('should show clear button when priority filter is active', () => {
      render(<ConversationSearchBar initialPriority="high" />)

      expect(screen.getByText('Clear all')).toBeInTheDocument()
    })
  })

  describe('Initial Values', () => {
    it('should initialize with provided query', () => {
      render(<ConversationSearchBar initialQuery="meeting" />)

      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      expect(searchInput).toHaveValue('meeting')
    })

    it('should initialize with provided type filter', () => {
      render(<ConversationSearchBar initialType="group" />)

      // Type filter should be set (checked via presence of clear button)
      expect(screen.getByText('Clear all')).toBeInTheDocument()
    })

    it('should initialize with provided priority filter', () => {
      render(<ConversationSearchBar initialPriority="high" />)

      // Priority filter should be set (checked via presence of clear button)
      expect(screen.getByText('Clear all')).toBeInTheDocument()
    })

    it('should initialize with all filters combined', () => {
      render(
        <ConversationSearchBar
          initialQuery="urgent"
          initialType="direct"
          initialPriority="high"
        />
      )

      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      expect(searchInput).toHaveValue('urgent')
      expect(screen.getByText('Clear all')).toBeInTheDocument()
    })
  })

  describe('Search Input', () => {
    it('should update query value when typing', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar />)

      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      await user.type(searchInput, 'test query')

      expect(searchInput).toHaveValue('test query')
    })

    it('should show clear icon when query has value', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar />)

      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      await user.type(searchInput, 'test')

      const clearIcon = screen.getByLabelText('Clear search')
      expect(clearIcon).toBeInTheDocument()
    })

    it('should clear query when clicking clear icon', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar initialQuery="test" />)

      const clearIcon = screen.getByLabelText('Clear search')
      await user.click(clearIcon)

      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      expect(searchInput).toHaveValue('')
    })

    it('should navigate to conversations with query parameter', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar />)

      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      await user.type(searchInput, 'meeting')

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('query=meeting')
        )
      })
    })

    it('should reset to page 1 when search changes', async () => {
      const user = userEvent.setup()
      const searchParamsWithPage = new URLSearchParams('page=5')
      vi.mocked(useSearchParams).mockReturnValue(searchParamsWithPage as any)

      render(<ConversationSearchBar />)

      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('page=1')
        )
      })
    })
  })

  describe('Type Filter', () => {
    it('should update URL when type is changed to group', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar />)

      const triggers = screen.getAllByRole('combobox')
      const typeFilter = triggers[0] // First combobox is type filter
      await user.click(typeFilter)

      const groupOption = screen.getByRole('option', { name: 'Group' })
      await user.click(groupOption)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('type=group')
        )
      })
    })

    it('should update URL when type is changed to direct', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar />)

      const triggers = screen.getAllByRole('combobox')
      const typeFilter = triggers[0] // First combobox is type filter
      await user.click(typeFilter)

      const directOption = screen.getByRole('option', { name: 'Direct' })
      await user.click(directOption)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('type=direct')
        )
      })
    })

    it('should remove type from URL when set to all', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar initialType="group" />)

      const triggers = screen.getAllByRole('combobox')
      const typeFilter = triggers[0] // First combobox is type filter
      await user.click(typeFilter)

      const allOption = screen.getByRole('option', { name: 'All types' })
      await user.click(allOption)

      await waitFor(() => {
        const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1][0]
        expect(lastCall).not.toContain('type=')
      })
    })
  })

  describe('Priority Filter', () => {
    it('should update URL when priority is changed to high', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar />)

      const triggers = screen.getAllByRole('combobox')
      const priorityFilter = triggers[1] // Second combobox is priority filter
      await user.click(priorityFilter)

      const highOption = screen.getByRole('option', { name: 'High' })
      await user.click(highOption)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('priority=high')
        )
      })
    })

    it('should update URL when priority is changed to medium', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar />)

      const triggers = screen.getAllByRole('combobox')
      const priorityFilter = triggers[1] // Second combobox is priority filter
      await user.click(priorityFilter)

      const mediumOption = screen.getByRole('option', { name: 'Medium' })
      await user.click(mediumOption)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('priority=medium')
        )
      })
    })

    it('should update URL when priority is changed to low', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar />)

      const triggers = screen.getAllByRole('combobox')
      const priorityFilter = triggers[1] // Second combobox is priority filter
      await user.click(priorityFilter)

      const lowOption = screen.getByRole('option', { name: 'Low' })
      await user.click(lowOption)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('priority=low')
        )
      })
    })

    it('should remove priority from URL when set to all', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar initialPriority="high" />)

      const triggers = screen.getAllByRole('combobox')
      const priorityFilter = triggers[1] // Second combobox is priority filter
      await user.click(priorityFilter)

      const allOption = screen.getByRole('option', { name: 'All priorities' })
      await user.click(allOption)

      await waitFor(() => {
        const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1][0]
        expect(lastCall).not.toContain('priority=')
      })
    })
  })

  describe('Clear All Functionality', () => {
    it('should clear all filters and redirect to conversations', async () => {
      const user = userEvent.setup()
      render(
        <ConversationSearchBar
          initialQuery="test"
          initialType="group"
          initialPriority="high"
        />
      )

      const clearButton = screen.getByText('Clear all')
      await user.click(clearButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/conversations')
      })
    })

    it('should clear query state when clearing all', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar initialQuery="test" />)

      const clearButton = screen.getByText('Clear all')
      await user.click(clearButton)

      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      expect(searchInput).toHaveValue('')
    })
  })

  describe('Combined Filters', () => {
    it('should include all active filters in URL', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar />)

      // Add query
      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      await user.type(searchInput, 'meeting')

      // Add type filter
      const triggers = screen.getAllByRole('combobox')
      const typeFilter = triggers[0]
      await user.click(typeFilter)
      const groupOption = screen.getByRole('option', { name: 'Group' })
      await user.click(groupOption)

      // Add priority filter
      const updatedTriggers = screen.getAllByRole('combobox')
      const priorityFilter = updatedTriggers[1]
      await user.click(priorityFilter)
      const highOption = screen.getByRole('option', { name: 'High' })
      await user.click(highOption)

      await waitFor(() => {
        const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1][0]
        expect(lastCall).toContain('query=meeting')
        expect(lastCall).toContain('type=group')
        expect(lastCall).toContain('priority=high')
        expect(lastCall).toContain('page=1')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible search input', () => {
      render(<ConversationSearchBar />)

      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      expect(searchInput).toHaveAttribute('type', 'search')
    })

    it('should have accessible clear button with aria-label', async () => {
      const user = userEvent.setup()
      render(<ConversationSearchBar />)

      const searchInput = screen.getByPlaceholderText(/search conversations/i)
      await user.type(searchInput, 'test')

      const clearButton = screen.getByLabelText('Clear search')
      expect(clearButton).toBeInTheDocument()
    })
  })
})
