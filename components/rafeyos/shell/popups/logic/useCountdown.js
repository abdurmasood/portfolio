import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const TICK_MS = 1000

/**
 * Counts down once a second and calls onDone at zero.
 * @returns {number} seconds left
 */
export const useCountdown = (seconds, onDone) => {
  const [left, setLeft] = useState(seconds)
  const onDoneRef = useRef(onDone)
  useLayoutEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])
  useEffect(() => {
    const timer = setInterval(() => setLeft((current) => current - 1), TICK_MS)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (left === 0) onDoneRef.current()
  }, [left])
  return Math.max(0, left)
}
