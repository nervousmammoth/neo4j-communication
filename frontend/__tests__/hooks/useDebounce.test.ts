import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    expect(result.current).toBe('initial')

    // Update the value
    rerender({ value: 'updated', delay: 500 })
    
    // Value should not change immediately
    expect(result.current).toBe('initial')

    // Fast-forward time by less than delay
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('initial')

    // Fast-forward time to complete the delay
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('updated')
  })

  it('should cancel pending update on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    // Update the value
    rerender({ value: 'updated', delay: 500 })
    expect(result.current).toBe('initial')

    // Unmount before delay completes
    unmount()

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500)
    })
    
    // Value update should have been cancelled
    // (we can't directly test this since component is unmounted,
    // but we're testing that no errors occur)
  })

  it('should handle rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    // Rapid updates
    rerender({ value: 'update1', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    
    rerender({ value: 'update2', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    
    rerender({ value: 'update3', delay: 500 })
    
    // Still should be initial value
    expect(result.current).toBe('initial')

    // Complete the delay from last update
    act(() => {
      vi.advanceTimersByTime(500)
    })
    
    // Should have the last value
    expect(result.current).toBe('update3')
  })

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 0 }
      }
    )

    rerender({ value: 'updated', delay: 0 })
    
    act(() => {
      vi.advanceTimersByTime(0)
    })
    
    expect(result.current).toBe('updated')
  })

  it('should handle different data types', () => {
    // Number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 42, delay: 500 }
      }
    )
    expect(numberResult.current).toBe(42)
    
    numberRerender({ value: 100, delay: 500 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(numberResult.current).toBe(100)

    // Object
    const initialObj = { name: 'John' }
    const { result: objResult, rerender: objRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialObj, delay: 500 }
      }
    )
    expect(objResult.current).toBe(initialObj)
    
    const updatedObj = { name: 'Jane' }
    objRerender({ value: updatedObj, delay: 500 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(objResult.current).toBe(updatedObj)

    // Array
    const initialArr = [1, 2, 3]
    const { result: arrResult, rerender: arrRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialArr, delay: 500 }
      }
    )
    expect(arrResult.current).toBe(initialArr)
    
    const updatedArr = [4, 5, 6]
    arrRerender({ value: updatedArr, delay: 500 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(arrResult.current).toBe(updatedArr)

    // Null
    const { result: nullResult, rerender: nullRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: null as string | null, delay: 500 }
      }
    )
    expect(nullResult.current).toBe(null)
    
    nullRerender({ value: 'not null', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(nullResult.current).toBe('not null')

    // Undefined
    const { result: undefinedResult } = renderHook(
      () => useDebounce(undefined as string | undefined, 500)
    )
    expect(undefinedResult.current).toBe(undefined)
  })

  it('should handle delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    // Update value with original delay
    rerender({ value: 'updated', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('initial')

    // Change delay and value
    rerender({ value: 'updated2', delay: 200 })
    
    // Complete the new shorter delay
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('updated2')
  })

  it('should not update if value changes back before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    // Change value
    rerender({ value: 'updated', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Change back to original
    rerender({ value: 'initial', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should still be initial (no actual change)
    expect(result.current).toBe('initial')
  })
})