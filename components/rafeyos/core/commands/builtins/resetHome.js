// @ts-check
// reset-home (Claude's call 4): puts the visitor's home back as on a first visit, with their saved settings and
// history gone, once they answer y. On a terminal it asks, and the terminal runs the reset on the answer; in a pipe
// the first line of stdin is the answer and nothing is asked. /home/rafey and /tmp are never touched.
import { resetHome as resetHomeOp } from '@/components/rafeyos/core/vfs/fsOps'
import { errnoText, failureErrno } from '@/components/rafeyos/core/commands/errors'
import { EFFECTS, failure } from './result'

/**
 * @import { ShellFs } from '@/components/rafeyos/core/vfs/shellFs'
 * @import { SettingsView } from '@/components/rafeyos/core/settings/settingsView'
 * @import { CommandContext, CommandOutput } from './result'
 */

export const RESET_QUESTION = 'reset-home: erase /home/visitor, saved settings and history? [y/N]'

const YES = /^y(es)?$/i

/** Whether an answer confirms: y or yes in any case; anything else, Enter alone included, is no. @param {string} answer */
export const isYes = (answer) => YES.test(answer.trim())

/**
 * Wipes the visitor's files, trash and history, then their saved settings. When storage refuses the files, nothing
 * changes and the result is reset-home's error.
 * @param {{ fs: ShellFs, settings?: SettingsView }} deps
 * @returns {string | null} the error, or null once it's done
 */
export const resetVisitorHome = ({ fs, settings }) => {
  const wiped = fs.apply(resetHomeOp, null)
  if (!wiped.ok) return `reset-home: cannot reset: ${errnoText(failureErrno(wiped))}`
  settings?.reset()
  return null
}

/** @param {CommandContext} context @returns {CommandOutput} */
const resetHome = (context) => {
  if (context.stdin === null) {
    return { effects: [{ type: EFFECTS.ASK, question: RESET_QUESTION, onYes: [{ type: EFFECTS.RESET_HOME }] }] }
  }
  const [answer] = context.stdin.split('\n')
  if (!isYes(answer)) return {}
  const refused = resetVisitorHome(context)
  return refused ? failure(refused) : { effects: [{ type: EFFECTS.CLEAR_HISTORY }] }
}

export const resetHomeCommands = Object.freeze({ 'reset-home': resetHome })
