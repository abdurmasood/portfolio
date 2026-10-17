// Everything rafeyOS needs from the outside world, injected so tests can pass fakes
import { sessionStorageOrNull } from './browserStorage'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

const matches = (win, query, fallback) => win?.matchMedia?.(query).matches ?? fallback

/**
 * @param {{ router: { push: (href: string) => void }, win?: Window }} deps
 * @returns {{ navigate, storage, now, openExternal, reducedMotion, prefersDark }}
 */
export const createServices = ({ router, win = globalThis.window }) =>
  Object.freeze({
    navigate: (href) => router.push(href),
    storage: sessionStorageOrNull(win),
    now: () => new Date(),
    openExternal: (href) => win?.open(href, '_blank', 'noopener,noreferrer'),
    reducedMotion: () => matches(win, REDUCED_MOTION_QUERY, false),
    prefersDark: () => matches(win, DARK_SCHEME_QUERY, true),
  })
