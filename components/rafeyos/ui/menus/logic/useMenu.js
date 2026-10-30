import { useCallback } from 'react'
import { useShellDispatch } from '@/components/rafeyos/state/logic/contexts'
import { rectOfElement } from '@/components/rafeyos/ui/logic/dom'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'

// Popovers from header buttons open just below the button, as in the mockup
const BELOW_GAP = 4

export const pointOfEvent = (event) => ({ x: event.clientX, y: event.clientY })

/** Below a button, shifted left by `shiftLeft` (the mockup pulls end-of-header menus inwards). */
export const belowElement = (element, shiftLeft = 0) => {
  const rect = rectOfElement(element)
  return { x: rect.x - shiftLeft, y: rect.y + rect.h + BELOW_GAP }
}

/**
 * Opens a context menu through the shell state (one menu at a time).
 * @returns {(items: object[], point: {x: number, y: number}, options?: { shell?: boolean, anchorBottom?: boolean, dockKey?: string }) => void}
 */
export const useMenu = () => {
  const shellDispatch = useShellDispatch()
  return useCallback(
    (items, point, options = {}) => shellDispatch({ ...options, type: SHELL_ACTIONS.OPEN_MENU, items, x: point.x, y: point.y }),
    [shellDispatch],
  )
}
