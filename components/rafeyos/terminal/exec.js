import { parse } from './parse'
import { error } from './lines'
import { contentCommands } from './commands/content'
import { fsCommands } from './commands/fs'
import { launchCommands } from './commands/launch'
import { systemCommands } from './commands/system'

export { EFFECTS } from './commands/result'

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
 * Runs one command line. Pure: side effects come back as descriptors for the caller to run.
 * The echoed prompt row is not included; the UI prints it before these lines.
 * @param {string} raw
 * @param {{ vfs: object, cwd: string, content: object }} context
 * @returns {{ lines: object[], effects: object[], cwd: string }}
 */
export const exec = (raw, { vfs, cwd, content }) => {
  const parsed = parse(raw)
  if (!parsed.name) return { lines: [], effects: [], cwd }
  const name = parsed.name.toLowerCase()
  const handler = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : null
  if (!handler) return { lines: [error(`Command not found: '${parsed.name}'`)], effects: [], cwd }
  const output = handler({ parsed, name, vfs, cwd, content })
  return { lines: output.lines, effects: output.effects, cwd: output.cwd ?? cwd }
}
