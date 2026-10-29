// @ts-check
// Shared by the command modules: every handler takes a CommandContext and returns a CommandOutput

/**
 * @import { Line } from '@/components/rafeyos/core/commands/lines'
 * @import { AppId } from '@/components/rafeyos/core/catalog/apps'
 * @import { Content } from '@/components/rafeyos/core/vfs/content'
 * @import { ShellFs } from '@/components/rafeyos/core/vfs/shellFs'
 */

/**
 * Output that is only shown on screen; run.js derives the plain stdout from its `pre` lines.
 * @param {Line[]} [display]
 * @param {Effect[]} [effects]
 * @returns {CommandOutput}
 */
export const result = (display = [], effects = []) => ({ display, effects })

/**
 * One error line on stderr and a failing exit code.
 * @param {string} message
 * @param {number} [code]
 * @returns {CommandOutput}
 */
export const failure = (message, code = 1) => ({ stderr: [message], code })

/**
 * The words that aren't flags, for commands that ignore their flags.
 * @param {readonly string[]} argv
 */
export const operands = (argv) => argv.filter((word) => !word.startsWith('-'))

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

/**
 * What a command is run with. `argv` holds its arguments after expansion, its name not included; `stdin` is null
 * when nothing is piped in; `tty` is true when its stdout goes straight to the screen.
 * @typedef {{
 *   argv: string[],
 *   name: string,
 *   stdin: string | null,
 *   tty: boolean,
 *   cwd: string,
 *   env: Readonly<Record<string, string>>,
 *   fs: ShellFs,
 *   content: Content,
 *   history: readonly string[],
 *   now: () => Date,
 * }} CommandContext
 */

/**
 * What a command gives back. Every command that prints returns `stdout`; `display` is an optional on-screen form of
 * it (coloured ls, dim hints), used only when the output goes straight to the screen. `cwd` and `env` change the
 * window's folder and variables.
 * @typedef {{
 *   stdout?: string,
 *   display?: Line[],
 *   stderr?: string[],
 *   code?: number,
 *   effects?: Effect[],
 *   cwd?: string,
 *   env?: Record<string, string>,
 * }} CommandOutput
 */

/** @typedef {(context: CommandContext) => CommandOutput} Handler */
