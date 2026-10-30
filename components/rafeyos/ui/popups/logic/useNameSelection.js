import { useLayoutEffect, useRef } from 'react'

/**
 * A name field that opens focused with the name selected, as GNOME's are: a file's up to its extension, so typing
 * replaces "Untitled" but keeps ".txt"; a folder's whole name.
 * @param {{ wholeName?: boolean }} [options]
 * @returns {import('react').RefObject<HTMLInputElement>} for the input
 */
export const useNameSelection = ({ wholeName = false } = {}) => {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const input = ref.current
    const dot = wholeName ? -1 : input.value.lastIndexOf('.')
    input.focus()
    input.setSelectionRange(0, dot > 0 ? dot : input.value.length)
  }, [wholeName])
  return ref
}
