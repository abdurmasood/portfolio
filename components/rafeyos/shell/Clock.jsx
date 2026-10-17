import { useEffect, useState } from 'react'
import { useServices } from '../state/contexts'
import { formatClock } from './clockFormat'

// Same cadence as the mockup; the minute flips within 5s
export const CLOCK_TICK_MS = 5000

/** Owns its interval so the tick re-renders only this span. */
export const Clock = () => {
  const { now } = useServices()
  const [label, setLabel] = useState(() => formatClock(now()))
  useEffect(() => {
    const timer = setInterval(() => setLabel(formatClock(now())), CLOCK_TICK_MS)
    return () => clearInterval(timer)
  }, [now])
  return <span className="clock">{label}</span>
}
