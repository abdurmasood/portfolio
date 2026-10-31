// @ts-check
// Runs exec()'s effect descriptors. Pure apart from the injected handlers, so it's testable alone.
import { EFFECTS } from '@/components/rafeyos/core/commands/exec'
import { windowOfPid } from '@/components/rafeyos/core/commands/builtins/process'
import { dim } from '@/components/rafeyos/core/commands/lines'
import { handlerFor, isAudio, isWebLink, unavailableNote } from '@/components/rafeyos/core/catalog/apps'
import { realPath } from '@/components/rafeyos/core/vfs/paths'

/**
 * @import { Effect } from '@/components/rafeyos/core/commands/builtins/result'
 * @import { Line } from '@/components/rafeyos/core/commands/lines'
 * @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs'
 * @import { WindowManager } from '@/components/rafeyos/state/logic/contexts'
 */

/**
 * openLink shows the Open Link dialog for a web-link file; `open linkedin` opens its url; play starts the track without opening a window; clearHistory empties the
 * window's own history after `history -c`; ask puts a command's [y/N] question on the prompt.
 * @typedef {{
 *   vfs: Vfs,
 *   windowManager: Pick<WindowManager, 'openApp' | 'openPath' | 'close' | 'forceClose'>,
 *   openExternal: (href: string) => void,
 *   openLink: () => void,
 *   play: () => void,
 *   closeSelf: () => void,
 *   logout: () => void,
 *   clearHistory: () => void,
 *   ask: (question: Extract<Effect, { type: 'ask' }>) => void,
 * }} EffectHandlers
 */

/** @typedef {{ notes: Line[], clear: boolean }} EffectOutcome */

/**
 * @param {readonly Effect[]} effects - from exec()
 * @param {EffectHandlers} handlers
 * @returns {EffectOutcome} dim lines to print after the output, and whether to clear first
 */
export const applyTerminalEffects = (effects, handlers) =>
  effects.reduce(
    /** @type {(outcome: EffectOutcome, effect: Effect) => EffectOutcome} */
    (outcome, effect) => {
      if (effect.type === EFFECTS.CLEAR) return { ...outcome, clear: true }
      const note = runEffect(effect, handlers)
      return note ? { ...outcome, notes: [...outcome.notes, note] } : outcome
    },
    { notes: [], clear: false },
  )

/**
 * @param {string} path
 * @param {EffectHandlers} handlers
 * @returns {Line | null}
 */
const openPathNote = (path, handlers) => {
  const { vfs, windowManager, openLink } = handlers
  if (isWebLink(vfs, path)) {
    openLink()
    return null
  }
  if (isAudio(vfs, path)) handlers.play()
  return windowManager.openPath(path, { vfs }) ? null : dim(unavailableNote(handlerFor(vfs[realPath(vfs, path)])))
}

/**
 * @param {Effect} effect
 * @param {EffectHandlers} handlers
 * @returns {Line | null} a dim note line when the effect can't run yet
 */
const runEffect = (effect, handlers) => {
  switch (effect.type) {
    case EFFECTS.OPEN_APP:
      return handlers.windowManager.openApp(effect.app, { path: effect.path }) ? null : dim(unavailableNote(effect.app))
    case EFFECTS.OPEN_PATH:
      return openPathNote(effect.path, handlers)
    case EFFECTS.OPEN_LINK:
      handlers.openExternal(effect.href)
      return null
    case EFFECTS.OPEN_EXTERNAL:
      handlers.openExternal(effect.href)
      return null
    case EFFECTS.PLAY:
      handlers.play()
      return null
    case EFFECTS.CLOSE_SELF:
      handlers.closeSelf()
      return null
    case EFFECTS.LOGOUT:
      handlers.logout()
      return null
    case EFFECTS.CLEAR_HISTORY:
      handlers.clearHistory()
      return null
    case EFFECTS.ASK:
      handlers.ask(effect)
      return null
    // The terminal's own PID closes it like exit, but kill prints no `logout`
    case EFFECTS.KILL:
      if (effect.force) handlers.windowManager.forceClose(windowOfPid(effect.pid))
      else handlers.windowManager.close(windowOfPid(effect.pid))
      return null
    default:
      throw new Error(`Unknown terminal effect: ${effect.type}`)
  }
}
