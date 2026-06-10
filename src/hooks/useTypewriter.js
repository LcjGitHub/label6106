import { useState, useEffect, useRef, useCallback } from 'react'
import { visibleLength, sliceTeletypeText } from '../utils/teletype'

const DEFAULT_SPEED = 28

export function useTypewriter(text, { speed = DEFAULT_SPEED, active = true, onTick, onComplete } = {}) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef(null)
  const total = visibleLength(text)

  const reset = useCallback(() => {
    clearInterval(timerRef.current)
    setVisibleCount(0)
    setDone(false)
  }, [])

  useEffect(() => {
    reset()
    if (!active || !text) {
      setDone(true)
      return
    }

    timerRef.current = setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + 1
        if (next >= total) {
          clearInterval(timerRef.current)
          setDone(true)
          onComplete?.()
          return total
        }
        onTick?.(next)
        return next
      })
    }, speed)

    return () => clearInterval(timerRef.current)
  }, [text, speed, active, total, onTick, onComplete, reset])

  const displayed = sliceTeletypeText(text, visibleCount)
  const skip = useCallback(() => {
    clearInterval(timerRef.current)
    setVisibleCount(total)
    setDone(true)
    onComplete?.()
  }, [total, onComplete])

  return { displayed, visibleCount, total, done, skip, reset }
}
