import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTypewriter } from '../useTypewriter'

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should initialize with empty displayed text and done=false', () => {
    const { result } = renderHook(() => useTypewriter('Hello World', { speed: 10 }))
    expect(result.current.displayed).toBe('')
    expect(result.current.done).toBe(false)
    expect(result.current.visibleCount).toBe(0)
    expect(result.current.total).toBe(11)
  })

  it('should display text character by character over time', () => {
    const { result } = renderHook(() => useTypewriter('Hello', { speed: 10 }))

    expect(result.current.displayed).toBe('')

    act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current.visibleCount).toBe(1)
    expect(result.current.displayed).toBe('H')

    act(() => {
      vi.advanceTimersByTime(40)
    })
    expect(result.current.visibleCount).toBe(5)
    expect(result.current.displayed).toBe('Hello')
    expect(result.current.done).toBe(true)
  })

  it('should call onComplete when typing is done', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useTypewriter('Hi', { speed: 10, onComplete })
    )

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.done).toBe(true)
    expect(onComplete).toHaveBeenCalled()
  })

  it('should call onTick on each character', () => {
    const onTick = vi.fn()
    const { result } = renderHook(() => useTypewriter('Hi', { speed: 10, onTick }))

    act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(onTick).toHaveBeenCalledTimes(1)
    expect(onTick).toHaveBeenCalledWith(1)

    act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(onTick).toHaveBeenCalled()
    expect(result.current.done).toBe(true)
  })

  it('should skip animation immediately when skip() is called', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useTypewriter('Hello World', { speed: 10, onComplete })
    )

    expect(result.current.done).toBe(false)
    expect(result.current.visibleCount).toBe(0)

    act(() => {
      result.current.skip()
    })

    expect(result.current.done).toBe(true)
    expect(result.current.visibleCount).toBe(11)
    expect(result.current.displayed).toBe('Hello World')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('should reset when reset() is called', () => {
    const { result } = renderHook(() => useTypewriter('Hello', { speed: 10 }))

    act(() => {
      vi.advanceTimersByTime(30)
    })
    expect(result.current.visibleCount).toBe(3)
    expect(result.current.done).toBe(false)

    act(() => {
      result.current.reset()
    })

    expect(result.current.visibleCount).toBe(0)
    expect(result.current.done).toBe(false)
    expect(result.current.displayed).toBe('')
  })

  it('should set done=true when active is false', () => {
    const { result } = renderHook(() =>
      useTypewriter('Hello', { speed: 10, active: false })
    )

    expect(result.current.done).toBe(true)
  })

  it('should set done=true when text is empty', () => {
    const { result } = renderHook(() => useTypewriter('', { speed: 10 }))

    expect(result.current.done).toBe(true)
  })

  it('should handle text with control characters correctly', () => {
    const { result } = renderHook(() =>
      useTypewriter('Hello\r\nWorld', { speed: 10 })
    )

    expect(result.current.total).toBe(10)

    act(() => {
      vi.advanceTimersByTime(60)
    })
    expect(result.current.visibleCount).toBe(6)
    expect(result.current.displayed).toBe('Hello\r\nW')
  })

  it('should clean up interval on unmount', () => {
    const { unmount } = renderHook(() => useTypewriter('Hello', { speed: 10 }))

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('should restart typing when text changes', () => {
    let text = 'Hello'
    const { result, rerender } = renderHook(() => useTypewriter(text, { speed: 10 }))

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.done).toBe(true)
    expect(result.current.displayed).toBe('Hello')

    text = 'World'
    rerender()

    expect(result.current.done).toBe(false)
    expect(result.current.visibleCount).toBe(0)

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.done).toBe(true)
    expect(result.current.displayed).toBe('World')
  })
})
