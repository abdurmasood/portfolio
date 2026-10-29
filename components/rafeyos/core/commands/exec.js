import { runLine } from './run'
import { contentCommands } from './builtins/content'
import { fsCommands } from './builtins/fs'
import { launchCommands } from './builtins/launch'
import { systemCommands } from './builtins/system'

export { EFFECTS } from './builtins/result'
export { ENV } from './run'

/** Every command the shell knows, by its exact (case-sensitive) name. */
export const COMMANDS = Object.freeze({
  ...contentCommands,
  ...fsCommands,
  ...launchCommands,
  ...systemCommands,
})

// What tab completes for the first word; startx is deliberately hidden
export const COMPLETION_COMMANDS = Object.freeze([
  'help', 'bio', 'projects', 'blog', 'skills', 'music', 'contact', 'open', 'xdg-open', 'ls', 'cd',
  'pwd', 'cat', 'clear', 'exit', 'nautilus', 'gnome-text-editor', 'whoami', 'uname', 'echo', 'sudo',
  'logout',
])

/**
 * Runs one command line. Files change through `context.fs`; every other side effect comes back as a descriptor for
 * the caller to run. The echoed prompt row is not included; the UI prints it before these lines.
 * @param {string} raw
 * @param {import('./run').ExecContext} context
 * @returns {import('./run').ExecResult}
 */
export const exec = (raw, context) => runLine(raw, context, COMMANDS)
