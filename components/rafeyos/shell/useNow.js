import { useEffect, useState } from 'react'
import { useServices } from '../state/contexts'

// Same cadence as the mockup; the minute flips within 5s
export const CLOCK_TICK_MS = 5000

/** The injected clock's time, refreshed every tick; the interval lives with the caller's lifetime. */
export const useNow = () => {
  const { now } = useServices()
  const [date, setDate] = useState(now)
  useEffect(() => {
    const timer = setInterval(() => setDate(now()), CLOCK_TICK_MS)
    return () => clearInterval(timer)
  }, [now])
  return date
}
