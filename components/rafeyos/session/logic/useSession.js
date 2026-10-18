import { useCallback, useEffect, useState } from 'react'
import { SESSION_EVENTS, SESSION_STATES, initialSessionState, next } from './sessionMachine'
import { forgetDesktop, isDesktopRemembered, rememberDesktop } from './sessionStore'

export const BOOT_MS = 1500
export const HOME_HREF = '/'

/** Plays the boot splash (skipped by reduced motion), then holds the desktop until the visitor leaves. */
const useBootTimer = (state, dispatch, reducedMotion) => {
  useEffect(() => {
    if (state !== SESSION_STATES.BOOT) return undefined
    if (reducedMotion()) {
      dispatch(SESSION_EVENTS.SKIP)
      return undefined
    }
    const timer = setTimeout(() => dispatch(SESSION_EVENTS.BOOT_DONE), BOOT_MS)
    return () => clearTimeout(timer)
  }, [state, dispatch, reducedMotion])
}

/**
 * @param {{ storage: Storage|null, navigate: Function, reducedMotion: () => boolean }} services
 * @returns {{ state: string, dispatch: (event: string) => void }}
 */
export const useSession = ({ storage, navigate, reducedMotion }) => {
  const [state, setState] = useState(() => initialSessionState(isDesktopRemembered(storage)))
  const dispatch = useCallback((event) => setState((current) => next(current, event)), [])
  useBootTimer(state, dispatch, reducedMotion)
  useEffect(() => {
    if (state === SESSION_STATES.DESKTOP) rememberDesktop(storage)
    // A restart boots again; a refresh mid-boot should too, so the skip flag goes until the desktop is back
    if (state === SESSION_STATES.BOOT) forgetDesktop(storage)
    if (state === SESSION_STATES.EXITED) {
      forgetDesktop(storage)
      navigate(HOME_HREF)
    }
  }, [state, storage, navigate])
  return { state, dispatch }
}
