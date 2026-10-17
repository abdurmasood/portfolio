// Runs exec()'s effect descriptors. Pure apart from the injected handlers, so it's testable alone.
import { EFFECTS } from '../../terminal/exec'
import { dim } from '../../terminal/lines'
import { handlerFor, unavailableNote } from '../availability'
import { realPath } from '../../vfs/paths'

/**
 * @param {object[]} effects - from exec()
 * @param {{ vfs, windowManager, openExternal, closeSelf, logout }} handlers
 * @returns {{ notes: object[], clear: boolean }} dim lines to print after the output, and whether to clear first
 */
export const applyTerminalEffects = (effects, handlers) =>
  effects.reduce(
    (outcome, effect) => {
      if (effect.type === EFFECTS.CLEAR) return { ...outcome, clear: true }
      const note = runEffect(effect, handlers)
      return note ? { ...outcome, notes: [...outcome.notes, note] } : outcome
    },
    { notes: [], clear: false },
  )

const openPathNote = (path, { vfs, windowManager }) =>
  windowManager.openPath(path) ? null : dim(unavailableNote(handlerFor(vfs[realPath(vfs, path)])))

/** @returns {object|null} a dim note line when the effect can't run yet */
const runEffect = (effect, handlers) => {
  switch (effect.type) {
    case EFFECTS.OPEN_APP:
      return handlers.windowManager.openApp(effect.app, { path: effect.path }) ? null : dim(unavailableNote(effect.app))
    case EFFECTS.OPEN_PATH:
      return openPathNote(effect.path, handlers)
    case EFFECTS.OPEN_LINK:
    case EFFECTS.OPEN_EXTERNAL:
      handlers.openExternal(effect.href)
      return null
    case EFFECTS.PLAY:
      return dim(unavailableNote('music'))
    case EFFECTS.CLOSE_SELF:
      handlers.closeSelf()
      return null
    case EFFECTS.LOGOUT:
      handlers.logout()
      return null
    default:
      throw new Error(`Unknown terminal effect: ${effect.type}`)
  }
}
