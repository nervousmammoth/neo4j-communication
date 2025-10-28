import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useViewPreference } from '@/hooks/useViewPreference'

// Mock Next.js navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockPathname = '/conversations'
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}))

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true
})

describe('useViewPreference', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
    mockSearchParams = new URLSearchParams()
  })

  describe('Initial State', () => {
    it('returns "card" as default view when no preference is set', () => {
      const { result } = renderHook(() => useViewPreference())
      
      expect(result.current.view).toBe('card')
    })

    it('reads view from URL query parameter on initialization', () => {
      mockSearchParams.set('view', 'list')
      
      const { result } = renderHook(() => useViewPreference())
      
      expect(result.current.view).toBe('list')
    })

    it('reads view from localStorage when no URL parameter is present', () => {
      mockLocalStorage.setItem('conversations-view', 'list')
      
      const { result } = renderHook(() => useViewPreference())
      
      expect(result.current.view).toBe('list')
    })

    it('prioritizes URL parameter over localStorage', () => {
      mockLocalStorage.setItem('conversations-view', 'list')
      mockSearchParams.set('view', 'card')
      
      const { result } = renderHook(() => useViewPreference())
      
      expect(result.current.view).toBe('card')
    })

    it('falls back to "card" for invalid URL parameter', () => {
      mockSearchParams.set('view', 'invalid')
      
      const { result } = renderHook(() => useViewPreference())
      
      expect(result.current.view).toBe('card')
    })

    it('falls back to "card" for invalid localStorage value', () => {
      mockLocalStorage.setItem('conversations-view', 'invalid')
      
      const { result } = renderHook(() => useViewPreference())
      
      expect(result.current.view).toBe('card')
    })
  })

  describe('View Changes', () => {
    it('updates view state when setView is called', () => {
      const { result } = renderHook(() => useViewPreference())
      
      act(() => {
        result.current.setView('list')
      })
      
      expect(result.current.view).toBe('list')
    })

    it('saves view preference to localStorage', () => {
      const { result } = renderHook(() => useViewPreference())
      
      act(() => {
        result.current.setView('list')
      })
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('conversations-view', 'list')
    })

    it('updates URL with view parameter', () => {
      const { result } = renderHook(() => useViewPreference())
      
      act(() => {
        result.current.setView('list')
      })
      
      expect(mockPush).toHaveBeenCalledWith('/conversations?view=list')
    })

    it('preserves existing URL parameters when updating view', () => {
      mockSearchParams.set('page', '2')
      mockSearchParams.set('search', 'test')
      
      const { result } = renderHook(() => useViewPreference())
      
      act(() => {
        result.current.setView('list')
      })
      
      expect(mockPush).toHaveBeenCalledWith('/conversations?page=2&search=test&view=list')
    })

    it('removes view parameter from URL when setting to default "card" view', () => {
      mockSearchParams.set('view', 'list')
      mockSearchParams.set('page', '2')
      
      const { result } = renderHook(() => useViewPreference())
      
      act(() => {
        result.current.setView('card')
      })
      
      expect(mockPush).toHaveBeenCalledWith('/conversations?page=2')
    })

    it('navigates to base URL when setting to "card" view with no other params', () => {
      mockSearchParams.set('view', 'list')
      
      const { result } = renderHook(() => useViewPreference())
      
      act(() => {
        result.current.setView('card')
      })
      
      expect(mockPush).toHaveBeenCalledWith('/conversations')
    })

    it('does not navigate when view is the same as current', () => {
      const { result } = renderHook(() => useViewPreference())
      
      act(() => {
        result.current.setView('card') // Same as default
      })
      
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('URL Synchronization', () => {
    it('updates view when URL parameter changes', () => {
      const { result, rerender } = renderHook(() => useViewPreference())
      
      // Initial state
      expect(result.current.view).toBe('card')
      
      // Simulate URL change by creating a new URLSearchParams instance
      mockSearchParams = new URLSearchParams('view=list')
      rerender()
      
      expect(result.current.view).toBe('list')
    })

    it('handles view parameter removal from URL', () => {
      mockSearchParams = new URLSearchParams('view=list')
      const { result, rerender } = renderHook(() => useViewPreference())
      
      // Initial state from URL
      expect(result.current.view).toBe('list')
      
      // Remove view parameter by creating new URLSearchParams without it
      mockSearchParams = new URLSearchParams()
      rerender()
      
      // Should fall back to localStorage or default
      expect(result.current.view).toBe('card')
    })
  })

  describe('localStorage Integration', () => {
    it('persists view changes across hook instances', () => {
      // First hook instance
      const { result: result1 } = renderHook(() => useViewPreference())
      
      act(() => {
        result1.current.setView('list')
      })
      
      // Second hook instance (simulating component remount)
      const { result: result2 } = renderHook(() => useViewPreference())
      
      expect(result2.current.view).toBe('list')
    })

    it('handles localStorage unavailability gracefully', () => {
      // Mock localStorage to throw an error
      const originalSetItem = mockLocalStorage.setItem
      mockLocalStorage.setItem = vi.fn(() => {
        throw new Error('localStorage not available')
      })
      
      const { result } = renderHook(() => useViewPreference())
      
      // Should not crash when localStorage fails
      expect(() => {
        act(() => {
          result.current.setView('list')
        })
      }).not.toThrow()
      
      // Restore original localStorage
      mockLocalStorage.setItem = originalSetItem
    })

    it('handles localStorage read errors gracefully', () => {
      // Mock localStorage to throw an error on read
      const originalGetItem = mockLocalStorage.getItem
      mockLocalStorage.getItem = vi.fn(() => {
        throw new Error('localStorage read error')
      })
      
      // Should fall back to default without crashing
      const { result } = renderHook(() => useViewPreference())
      expect(result.current.view).toBe('card')
      
      // Restore original localStorage
      mockLocalStorage.getItem = originalGetItem
    })
  })

  describe('Edge Cases', () => {
    it('handles null and undefined view values', () => {
      const { result } = renderHook(() => useViewPreference())
      
      act(() => {
        // @ts-expect-error Testing runtime behavior
        result.current.setView(null)
      })
      
      expect(result.current.view).toBe('card') // Should not change
    })

    it('handles empty string view value', () => {
      const { result } = renderHook(() => useViewPreference())
      
      act(() => {
        // @ts-expect-error Testing runtime behavior
        result.current.setView('')
      })
      
      expect(result.current.view).toBe('card') // Should not change
    })

    it('normalizes case-insensitive view values', () => {
      const { result } = renderHook(() => useViewPreference())
      
      act(() => {
        // @ts-expect-error Testing runtime behavior
        result.current.setView('LIST')
      })
      
      expect(result.current.view).toBe('list')
    })

    it('trims whitespace from view values', () => {
      const { result } = renderHook(() => useViewPreference())
      
      act(() => {
        // @ts-expect-error Testing runtime behavior
        result.current.setView(' list ')
      })
      
      expect(result.current.view).toBe('list')
    })
  })

  describe('Browser Navigation', () => {
    it('handles browser back/forward navigation', () => {
      const { result } = renderHook(() => useViewPreference())
      
      // Set to list view
      act(() => {
        result.current.setView('list')
      })
      expect(result.current.view).toBe('list')
      
      // Simulate browser back button (URL changes back) and clear localStorage
      mockSearchParams = new URLSearchParams()
      mockLocalStorage.clear() // Clear localStorage to simulate fresh state
      const { result: result2 } = renderHook(() => useViewPreference())
      
      // Should reflect URL state (default since no URL param and no localStorage)
      expect(result2.current.view).toBe('card')
    })

    it('maintains view state during page refresh', () => {
      // Simulate view stored in localStorage from previous session
      mockLocalStorage.setItem('conversations-view', 'list')
      
      // New hook instance (simulating page refresh)
      const { result } = renderHook(() => useViewPreference())
      
      expect(result.current.view).toBe('list')
    })
  })

  describe('Type Safety', () => {
    it('only accepts valid view values', () => {
      const { result } = renderHook(() => useViewPreference())
      
      // TypeScript should enforce this, but test runtime behavior
      act(() => {
        result.current.setView('list')
      })
      expect(result.current.view).toBe('list')
      
      act(() => {
        result.current.setView('card')
      })
      expect(result.current.view).toBe('card')
    })

    it('provides proper TypeScript types', () => {
      const { result } = renderHook(() => useViewPreference())
      
      // These checks verify the TypeScript interface
      expect(typeof result.current.view).toBe('string')
      expect(typeof result.current.setView).toBe('function')
      
      // View should be one of the expected values
      expect(['list', 'card']).toContain(result.current.view)
    })
  })
})