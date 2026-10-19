// @ts-check
// Shared by the command modules: every handler returns { lines, effects, cwd? }

/**
 * @import { Line } from '@/components/rafeyos/core/commands/lines'
 * @import { AppId } from '@/components/rafeyos/core/catalog/apps'
 */

/**
 * @param {Line[]} [lines]
 * @param {Effect[]} [effects]
 * @returns {CommandResult}
 */
export const result = (lines = [], effects = []) => ({ lines, effects })

export const EFFECTS = Object.freeze({
  OPEN_APP: 'openApp',
  OPEN_PATH: 'openPath',
  OPEN_LINK: 'openLink',
  OPEN_EXTERNAL: 'openExternal',
  PLAY: 'play',
  CLEAR: 'clear',
  CLOSE_SELF: 'closeSelf',
  LOGOUT: 'logout',
})

/**
 * A side effect a command asks the terminal to run; exec() stays pure.
 * @typedef {{ type: typeof EFFECTS.OPEN_APP, app: AppId, path?: string }
 *   | { type: typeof EFFECTS.OPEN_PATH, path: string }
 *   | { type: typeof EFFECTS.OPEN_LINK, href: string }
 *   | { type: typeof EFFECTS.OPEN_EXTERNAL, href: string }
 *   | { type: typeof EFFECTS.PLAY | typeof EFFECTS.CLEAR | typeof EFFECTS.CLOSE_SELF | typeof EFFECTS.LOGOUT }
 * } Effect
 */

/** @typedef {{ lines: Line[], effects: Effect[], cwd?: string }} CommandResult */
