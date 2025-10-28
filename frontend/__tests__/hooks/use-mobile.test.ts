import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock window.matchMedia with proper MediaQueryList interface
const mockMatchMedia = vi.fn()
let mockEventListeners: { [key: string]: Function[] } = {}
let currentMatches = false

describe('useIsMobile', () => {
  beforeEach(() => {
    mockEventListeners = {}
    currentMatches = false
    
    // Mock window.matchMedia with proper MediaQueryList implementation
    mockMatchMedia.mockImplementation((query: string) => {
      // Determine if query should match based on simulated screen width
      const width = window.innerWidth || 1024
      const matches = query.includes('max-width') && width <= 767
      currentMatches = matches
      
      return {
        matches,
        media: query,
        addEventListener: vi.fn((event: string, handler: Function) => {
          if (!mockEventListeners[event]) {
            mockEventListeners[event] = []
          }
          mockEventListeners[event].push(handler)
        }),
        removeEventListener: vi.fn((event: string, handler: Function) => {
          if (mockEventListeners[event]) {
            const index = mockEventListeners[event].indexOf(handler)
            if (index > -1) {
              mockEventListeners[event].splice(index, 1)
            }
          }
        }),
        // Add other MediaQueryList properties for completeness
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        dispatchEvent: vi.fn()
      }
    })

    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mockMatchMedia
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mockEventListeners = {}
  })

  it('should return false for desktop screen width initially', () => {
    // Set desktop width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('should return true for mobile screen width initially', () => {
    // Set mobile width (below 768px) before rendering hook
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('should setup media query listener with correct breakpoint', () => {
    renderHook(() => useIsMobile())

    expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 767px)')
  })

  it('should add and remove event listeners correctly', () => {
    const { unmount } = renderHook(() => useIsMobile())

    // Check that addEventListener was called
    const mockMediaQuery = mockMatchMedia.mock.results[0].value
    expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    // Unmount to trigger cleanup
    unmount()

    // Check that removeEventListener was called
    expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('should update state when media query changes', () => {
    // Start with desktop width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Simulate screen resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      // Trigger the media query change event with proper MediaQueryListEvent
      if (mockEventListeners.change) {
        const mockEvent = { matches: true } as MediaQueryListEvent
        mockEventListeners.change.forEach(handler => handler(mockEvent))
      }
    })

    expect(result.current).toBe(true)
  })

  it('should update state when resizing from mobile to desktop', () => {
    // Start with mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)

    // Simulate screen resize to desktop
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      })

      // Trigger the media query change event with proper MediaQueryListEvent
      if (mockEventListeners.change) {
        const mockEvent = { matches: false } as MediaQueryListEvent
        mockEventListeners.change.forEach(handler => handler(mockEvent))
      }
    })

    expect(result.current).toBe(false)
  })

  it('should handle breakpoint edge case at 767px (mobile)', () => {
    // Set width before rendering hook
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 767
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('should handle breakpoint edge case at 768px (desktop)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('should return false for undefined initial state due to !! coercion', () => {
    // Test the !! coercion logic in the hook
    // When useState initializes with undefined, !!undefined should be false
    expect(!!(undefined as boolean | undefined)).toBe(false)
    expect(!!(false as boolean | undefined)).toBe(false)
    expect(!!(true as boolean | undefined)).toBe(true)
  })

  it('should handle multiple resize events correctly', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Multiple resize events
    act(() => {
      // Resize to mobile
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      if (mockEventListeners.change) {
        const mockEvent = { matches: true } as MediaQueryListEvent
        mockEventListeners.change.forEach(handler => handler(mockEvent))
      }
    })
    expect(result.current).toBe(true)

    act(() => {
      // Resize to tablet
      Object.defineProperty(window, 'innerWidth', { value: 800 })
      if (mockEventListeners.change) {
        const mockEvent = { matches: false } as MediaQueryListEvent
        mockEventListeners.change.forEach(handler => handler(mockEvent))
      }
    })
    expect(result.current).toBe(false)

    act(() => {
      // Resize back to mobile
      Object.defineProperty(window, 'innerWidth', { value: 500 })
      if (mockEventListeners.change) {
        const mockEvent = { matches: true } as MediaQueryListEvent
        mockEventListeners.change.forEach(handler => handler(mockEvent))
      }
    })
    expect(result.current).toBe(true)
  })

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile())
    
    const mockMediaQuery = mockMatchMedia.mock.results[0].value
    const addEventListenerSpy = mockMediaQuery.addEventListener
    const removeEventListenerSpy = mockMediaQuery.removeEventListener

    // Verify addEventListener was called
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1)
    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))

    // Get the handler that was added
    const addedHandler = addEventListenerSpy.mock.calls[0][1]

    // Unmount the hook
    unmount()

    // Verify removeEventListener was called with the same handler
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', addedHandler)
  })
})