import { useEffect } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'textarea:not(:disabled)',
  'select:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export const focusableIn = (container) => [...container.querySelectorAll(FOCUSABLE)]

const focusLost = () => !document.activeElement || document.activeElement === document.body

/**
 * Puts focus back on what had it before this component mounted, when it unmounts.
 * @param {{ onlyIfLost?: boolean }} options - onlyIfLost: leave focus alone if something else took it
 */
export const useReturnFocus = ({ onlyIfLost = false } = {}) => {
  useEffect(() => {
    const previous = document.activeElement
    return () => {
      if (onlyIfLost && !focusLost()) return
      if (previous?.isConnected && previous !== document.body) previous.focus?.({ preventScroll: true })
    }
  }, [onlyIfLost])
}

/** Tab and Shift+Tab cycle inside the container; returns the listener's removal. */
const trapTab = (container) => {
  const onKeyDown = (event) => {
    if (event.key !== 'Tab') return
    const items = focusableIn(container)
    const active = document.activeElement
    const inside = container.contains(active)
    const first = items[0]
    const last = items[items.length - 1]
    if (!items.length) event.preventDefault()
    else if (event.shiftKey && (active === first || !inside)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || !inside)) {
      event.preventDefault()
      first.focus()
    }
  }
  document.addEventListener('keydown', onKeyDown, true)
  return () => document.removeEventListener('keydown', onKeyDown, true)
}

/** A modal dialog: focus moves in, Tab stays in, and focus returns to where it was on close. */
export const useFocusTrap = (ref) => {
  useReturnFocus()
  useEffect(() => {
    const container = ref.current
    focusableIn(container)[0]?.focus({ preventScroll: true })
    return trapTab(container)
  }, [ref])
}
