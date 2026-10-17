import { useLayoutEffect, useRef } from 'react'

/** Keeps a ref pointed at the latest committed value, for callbacks that must stay stable. */
export const useLatest = (value) => {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  }, [value])
  return ref
}
