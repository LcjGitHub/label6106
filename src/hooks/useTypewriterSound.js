import { useCallback, useRef, useEffect } from 'react'

/**
 * Web Audio API typewriter click — no external assets.
 * Muted by default; enable via setEnabled(true).
 */
export function useTypewriterSound(enabled) {
  const ctxRef = useRef(null)
  const enabledRef = useRef(enabled)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  const ensureContext = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return null
      ctxRef.current = new Ctx()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const playClick = useCallback(() => {
    if (!enabledRef.current) return
    const ctx = ensureContext()
    if (!ctx) return

    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'square'
    osc.frequency.setValueAtTime(1800 + Math.random() * 400, t)

    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(2200, t)
    filter.Q.setValueAtTime(8, t)

    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(t)
    osc.stop(t + 0.04)
  }, [ensureContext])

  const playBell = useCallback(() => {
    if (!enabledRef.current) return
    const ctx = ensureContext()
    if (!ctx) return

    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, t)
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.15)

    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(t)
    osc.stop(t + 0.22)
  }, [ensureContext])

  return { playClick, playBell }
}
