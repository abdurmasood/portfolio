import { useEffect } from 'react'
import { useShellDispatch, useShellState, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { useLatest } from '@/components/rafeyos/state/logic/useLatest'
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { OVERVIEW_MODES } from '@/components/rafeyos/wm/logic/overviewModel'
import { OVERVIEW_SEARCH_ID } from '@/components/rafeyos/shell/overview/Overview'

export const KEY_ACTIONS = Object.freeze({
  ARM_META: 'armMeta',
  ESCAPE: 'escape',
  OPEN_TERMINAL: 'openTerminal',
  FOCUS_SEARCH: 'focusSearch',
})

const isMetaKey = (event) => event.key === 'Meta' || event.key === 'OS'

// Option changes event.key on macOS (Ctrl+Option+T reports "†"), so the physical key counts too
const isTerminalChord = (event) =>
  event.ctrlKey && event.altKey && (event.key?.toLowerCase() === 't' || event.code === 'KeyT')

const isPrintable = (event) => event.key?.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

/** Typing in a field (other than the overview's own search) keeps its keys to itself. */
export const isTextField = (element) =>
  Boolean(element?.matches?.('input, textarea, [contenteditable="true"]')) && element.id !== OVERVIEW_SEARCH_ID

/**
 * What a keydown means to the shell. Pure.
 * @param {KeyboardEvent} event
 * @param {{ overviewOpen: boolean, target: Element|null }} context - target: the focused element
 * @returns {string|null} one of KEY_ACTIONS
 */
export const keyDownAction = (event, { overviewOpen, target }) => {
  if (event.key === 'Escape') return KEY_ACTIONS.ESCAPE
  if (isTextField(target)) return null
  if (isMetaKey(event)) return KEY_ACTIONS.ARM_META
  if (isTerminalChord(event)) return KEY_ACTIONS.OPEN_TERMINAL
  if (overviewOpen && isPrintable(event) && target?.id !== OVERVIEW_SEARCH_ID) return KEY_ACTIONS.FOCUS_SEARCH
  return null
}

/** Esc closes the innermost thing open: the overview, then a popup or menu, then a dialog. */
const escape = (shell, shellDispatch) => {
  if (shell.overview) shellDispatch({ type: 'closeOverview' })
  else if (shell.popup || shell.menu) shellDispatch({ type: 'closeTransients' })
  else if (shell.dialog) shellDispatch({ type: 'closeDialog' })
}

const toggleOverview = (shell, shellDispatch) =>
  shellDispatch(shell.overview ? { type: 'closeOverview' } : { type: 'openOverview', mode: OVERVIEW_MODES.WINDOWS })

const runKeyAction = (action, { event, shell, shellDispatch, windowManager }) => {
  if (action === KEY_ACTIONS.ESCAPE) escape(shell, shellDispatch)
  if (action === KEY_ACTIONS.FOCUS_SEARCH) document.getElementById(OVERVIEW_SEARCH_ID)?.focus({ preventScroll: true })
  if (action === KEY_ACTIONS.OPEN_TERMINAL) {
    event.preventDefault()
    if (shell.overview) shellDispatch({ type: 'closeOverview' })
    windowManager.openApp('terminal', { path: HOME })
  }
}

/** Adds the listeners and returns their removal. */
const listenAll = (listeners) => {
  listeners.forEach(([type, handler, capture]) => window.addEventListener(type, handler, capture))
  return () => listeners.forEach(([type, handler, capture]) => window.removeEventListener(type, handler, capture))
}

/**
 * The desktop's global keys: Meta (Super) pressed and released alone toggles the Activities
 * overview, Ctrl+Alt+T opens a Terminal in ~, Esc closes the overview or an open popup.
 * Listeners exist only while `active`, so nothing leaks to the home terminal after logout.
 */
export const useGlobalKeys = (active) => {
  const shellRef = useLatest(useShellState())
  const shellDispatch = useShellDispatch()
  const windowManager = useWindowManager()
  useEffect(() => {
    if (!active) return undefined
    // True from a Meta keydown until any other key or a click: only a lone tap toggles
    let metaAlone = false
    const onKeyDown = (event) => {
      const action = keyDownAction(event, { overviewOpen: Boolean(shellRef.current.overview), target: event.target })
      metaAlone = action === KEY_ACTIONS.ARM_META
      runKeyAction(action, { event, shell: shellRef.current, shellDispatch, windowManager })
    }
    const onKeyUp = (event) => {
      if (isMetaKey(event) && metaAlone) toggleOverview(shellRef.current, shellDispatch)
      metaAlone = false
    }
    const disarm = () => {
      metaAlone = false
    }
    return listenAll([
      ['keydown', onKeyDown, true],
      ['keyup', onKeyUp, true],
      ['pointerdown', disarm, true],
      ['blur', disarm, false],
    ])
  }, [active, shellRef, shellDispatch, windowManager])
}
