import { useEffect } from 'react'

/** Esc runs `onEscape`; capture so a focused input that stops propagation can't swallow it. */
export const useEscapeKey = (onEscape) => {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onEscape()
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onEscape])
}
