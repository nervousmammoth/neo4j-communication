import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CommandPalette } from '@/components/command-palette'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  })),
  usePathname: vi.fn(() => '/'),
}))

// Mock Command components from shadcn/ui
vi.mock('@/components/ui/command', () => ({
  CommandDialog: ({ open, onOpenChange, children }: any) => (
    open ? (
      <div
        data-testid="command-dialog"
        onClick={() => onOpenChange?.(false)}
        onKeyDown={(e: any) => {
          if (e.key === 'Escape') onOpenChange?.(false)
        }}
      >
        {children}
      </div>
    ) : null
  ),
  CommandInput: ({ placeholder, ...props }: any) => (
    <input data-testid="command-input" placeholder={placeholder} {...props} />
  ),
  CommandList: ({ children }: any) => (
    <div data-testid="command-list">{children}</div>
  ),
  CommandEmpty: ({ children }: any) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ heading, children }: any) => (
    <div data-testid="command-group" data-heading={heading}>
      {heading && <div data-testid="command-group-heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect, ...props }: any) => (
    <button
      data-testid="command-item"
      onClick={onSelect}
      {...props}
    >
      {children}
    </button>
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MessageSquareMore: () => <svg data-testid="icon-message-square-more" />,
  MessageSquare: () => <svg data-testid="icon-message-square" />,
  Users: () => <svg data-testid="icon-users" />,
}))

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render dialog initially (closed state)', () => {
      render(<CommandPalette />)

      expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
    })

    it('should render when opened', async () => {
      render(<CommandPalette />)

      // Trigger Cmd+K
      fireEvent.keyDown(document, { key: 'k', metaKey: true })

      await waitFor(() => {
        expect(screen.getByTestId('command-dialog')).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Shortcut', () => {
    it('should open with Cmd+K on Mac', async () => {
      render(<CommandPalette />)

      fireEvent.keyDown(document, { key: 'k', metaKey: true })

      await waitFor(() => {
        expect(screen.getByTestId('command-dialog')).toBeInTheDocument()
      })
    })

    it('should open with Ctrl+K on Windows/Linux', async () => {
      render(<CommandPalette />)

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      await waitFor(() => {
        expect(screen.getByTestId('command-dialog')).toBeInTheDocument()
      })
    })

    it('should toggle dialog when pressing shortcut again', async () => {
      render(<CommandPalette />)

      // Open
      fireEvent.keyDown(document, { key: 'k', metaKey: true })

      await waitFor(() => {
        expect(screen.getByTestId('command-dialog')).toBeInTheDocument()
      })

      // Close (toggle)
      fireEvent.keyDown(document, { key: 'k', metaKey: true })

      await waitFor(() => {
        expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
      })
    })

    it('should not open with just K key (without modifier)', () => {
      render(<CommandPalette />)

      fireEvent.keyDown(document, { key: 'k' })

      expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
    })

    it('should prevent default behavior when opening', () => {
      render(<CommandPalette />)

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
        cancelable: true
      })

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      document.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Dialog Content', () => {
    beforeEach(async () => {
      render(<CommandPalette />)
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
      await waitFor(() => {
        expect(screen.getByTestId('command-dialog')).toBeInTheDocument()
      })
    })

    it('should display search input', () => {
      const input = screen.getByTestId('command-input')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('placeholder', 'Type a command or search...')
    })

    it('should display Navigation group', () => {
      const group = screen.getByTestId('command-group')
      expect(group).toHaveAttribute('data-heading', 'Navigation')

      const heading = screen.getByTestId('command-group-heading')
      expect(heading).toHaveTextContent('Navigation')
    })

    it('should display "Analyze User Communications" option', () => {
      expect(screen.getByText('Analyze User Communications')).toBeInTheDocument()
    })

    it('should display "Conversations" option', () => {
      expect(screen.getByText('Conversations')).toBeInTheDocument()
    })

    it('should display "Users" option', () => {
      expect(screen.getByText('Users')).toBeInTheDocument()
    })

    it('should display icons for each option', () => {
      expect(screen.getByTestId('icon-message-square-more')).toBeInTheDocument()
      expect(screen.getByTestId('icon-message-square')).toBeInTheDocument()
      expect(screen.getByTestId('icon-users')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    beforeEach(async () => {
      render(<CommandPalette />)
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
      await waitFor(() => {
        expect(screen.getByTestId('command-dialog')).toBeInTheDocument()
      })
    })

    it('should navigate to communications hub when selected', async () => {
      const communicationsOption = screen.getByText('Analyze User Communications')
      fireEvent.click(communicationsOption)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/users/communications')
      })
    })

    it('should navigate to conversations when selected', async () => {
      const conversationsOption = screen.getByText('Conversations')
      fireEvent.click(conversationsOption)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/conversations')
      })
    })

    it('should navigate to users when selected', async () => {
      const usersOption = screen.getByText('Users')
      fireEvent.click(usersOption)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/users')
      })
    })

    it('should close dialog after navigation', async () => {
      const communicationsOption = screen.getByText('Analyze User Communications')
      fireEvent.click(communicationsOption)

      await waitFor(() => {
        expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Closing Behavior', () => {
    beforeEach(async () => {
      render(<CommandPalette />)
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
      await waitFor(() => {
        expect(screen.getByTestId('command-dialog')).toBeInTheDocument()
      })
    })

    it('should close with Escape key', async () => {
      const dialog = screen.getByTestId('command-dialog')
      fireEvent.keyDown(dialog, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
      })
    })

    it('should close when clicking outside (overlay)', async () => {
      const dialog = screen.getByTestId('command-dialog')
      fireEvent.click(dialog)

      await waitFor(() => {
        expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Event Listener Cleanup', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      const { unmount } = render(<CommandPalette />)

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      render(<CommandPalette />)
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
      await waitFor(() => {
        expect(screen.getByTestId('command-dialog')).toBeInTheDocument()
      })
    })

    it('should have searchable input', () => {
      const input = screen.getByTestId('command-input')
      expect(input).toHaveAttribute('placeholder', 'Type a command or search...')
    })

    it('should group navigation items semantically', () => {
      const group = screen.getByTestId('command-group')
      expect(group).toHaveAttribute('data-heading', 'Navigation')
    })

    it('should have clickable command items', () => {
      const items = screen.getAllByTestId('command-item')
      expect(items.length).toBeGreaterThan(0)
      items.forEach(item => {
        expect(item.tagName).toBe('BUTTON')
      })
    })
  })
})
