/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedCallback, useDebounce } from '../useDebounce'

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays callback execution by specified delay', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 100))

    act(() => {
      result.current('test')
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(99)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(callback).toHaveBeenCalledWith('test')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('resets timer when called multiple times', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 100))

    act(() => {
      result.current('first')
    })

    act(() => {
      vi.advanceTimersByTime(50)
    })

    act(() => {
      result.current('second')
    })

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(callback).toHaveBeenCalledWith('second')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('passes all arguments to the callback', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 100))

    act(() => {
      result.current('arg1', 123, { key: 'value' })
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(callback).toHaveBeenCalledWith('arg1', 123, { key: 'value' })
  })

  it('cleans up timeout on unmount', () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 100))

    act(() => {
      result.current('test')
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('uses latest callback reference', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const { result, rerender } = renderHook(
      ({ cb }) => useDebouncedCallback(cb, 100),
      { initialProps: { cb: callback1 } }
    )

    act(() => {
      result.current('test')
    })

    // Change the callback
    rerender({ cb: callback2 })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Should call the new callback, not the old one
    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledWith('test')
  })

  it('maintains stable function reference with same delay', () => {
    const callback = vi.fn()
    const { result, rerender } = renderHook(
      ({ delay }) => useDebouncedCallback(callback, delay),
      { initialProps: { delay: 100 } }
    )

    const firstRef = result.current

    rerender({ delay: 100 })

    expect(result.current).toBe(firstRef)
  })

  it('creates new function reference when delay changes', () => {
    const callback = vi.fn()
    const { result, rerender } = renderHook(
      ({ delay }) => useDebouncedCallback(callback, delay),
      { initialProps: { delay: 100 } }
    )

    const firstRef = result.current

    rerender({ delay: 200 })

    expect(result.current).not.toBe(firstRef)
  })
})

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 100))

    expect(result.current).toBe('initial')
  })

  it('delays value update by specified delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(99)
    })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('updated')
  })

  it('resets timer when value changes multiple times', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'first' })

    act(() => {
      vi.advanceTimersByTime(50)
    })

    rerender({ value: 'second' })

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe('second')
  })

  it('works with different value types', () => {
    // Number
    const { result: numberResult, rerender: rerenderNumber } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    )

    rerenderNumber({ value: 42 })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(numberResult.current).toBe(42)

    // Object
    const { result: objectResult, rerender: rerenderObject } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: { a: 1 } } }
    )

    rerenderObject({ value: { b: 2 } })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(objectResult.current).toEqual({ b: 2 })

    // Array
    const { result: arrayResult, rerender: rerenderArray } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: [1, 2] } }
    )

    rerenderArray({ value: [3, 4] })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(arrayResult.current).toEqual([3, 4])
  })

  it('cleans up timer on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })
    expect(result.current).toBe('initial')

    unmount()

    // Timer should be cleaned up, no errors should occur
    act(() => {
      vi.advanceTimersByTime(100)
    })
  })

  it('handles delay of 0', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 0),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(result.current).toBe('updated')
  })

  it('handles changing delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 100 } }
    )

    // Change value with 100ms delay
    rerender({ value: 'updated', delay: 100 })

    act(() => {
      vi.advanceTimersByTime(50)
    })

    // Change delay to 50ms
    rerender({ value: 'updated', delay: 50 })

    // The timer should restart with new delay
    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(result.current).toBe('updated')
  })
})
