// @ts-check
// Runs one command line the way bash does. The line is tokenized and built into a list first, so a syntax error
// stops all of it. Then each pipeline runs in turn as `&&`, `||` and `;` allow, and each simple command expands its
// words just before it runs, so it sees what the command before it changed. Output is kept in order: a pipeline's
// errors, then what its last command printed. The filesystem changes through `fs`; everything else a command wants
// (opening windows, clearing the screen) comes back as effects for the terminal to run.
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { writeFile } from '@/components/rafeyos/core/vfs/fsOps'
import { normalize, resolve } from '@/components/rafeyos/core/vfs/paths'
import { EFFECTS } from './builtins/result'
import { errnoText, failureErrno } from './errors'
import { expandWord } from './expand'
import { error, pre, LINE_TYPES } from './lines'
import { buildSyntax } from './syntax'
import { tokenize } from './tokenize'

/**
 * @import { Content } from '@/components/rafeyos/core/vfs/content'
 * @import { ShellFs } from '@/components/rafeyos/core/vfs/shellFs'
 * @import { SettingsView } from '@/components/rafeyos/core/settings/settingsView'
 * @import { CommandOutput, Effect, Handler, Processes } from './builtins/result'
 * @import { ShellErrno } from './errors'
 * @import { ExpandContext } from './expand'
 * @import { Line } from './lines'
 * @import { Pipeline, Redirect, SimpleCommand } from './syntax'
 * @import { Word } from './tokenize'
 */

/**
 * @typedef {Readonly<Record<string, Handler>>} Registry command name -> handler; names are case-sensitive
 * @typedef {Readonly<Record<string, string>>} Variables
 * @typedef {{
 *   fs: ShellFs,
 *   cwd: string,
 *   env?: Variables,
 *   lastCode?: number,
 *   content: Content,
 *   history?: readonly string[],
 *   now?: () => Date,
 *   startedAt?: Date,
 *   settings?: SettingsView,
 *   processes?: Processes,
 *   commands?: Registry,
 * }} ExecContext `env` is the window's own variables (PWD, OLDPWD); `lastCode` is $? before the line; `startedAt`
 *   is when the window's shell started (uptime counts from it), the line's start when not given; `history` is the
 *   window's own lines, given only when the history file couldn't record this one; `commands` is the terminal's own
 *   registry, for exec() only (every command the shell knows when not given); `settings` is the visitor's saved
 *   appearance, for gsettings; `processes` is the terminal's windows as processes when the line started, for ps and kill
 * @typedef {{ lines: Line[], effects: Effect[], cwd: string, env: Record<string, string>, code: number }} ExecResult
 * @typedef {{
 *   fs: ShellFs,
 *   content: Content,
 *   history: readonly string[],
 *   now: () => Date,
 *   startedAt: Date,
 *   settings?: SettingsView,
 *   processes?: Processes,
 *   registry: Registry,
 *   cwd: string,
 *   env: Variables,
 *   code: number,
 * }} Shell where the line has got to: its folder, the window's variables and the last exit code
 * @typedef {{
 *   stdout: string,
 *   screen: Line[],
 *   stderr: string[],
 *   code: number,
 *   effects: Effect[],
 *   cwd?: string,
 *   env?: Record<string, string>,
 *   aborts?: boolean,
 * }} Ran one command's outcome; `stdout` is what flows on to a pipe, `screen` what it shows when last; `aborts` when
 *   a bad substitution stops the rest of the line
 */

/** The fixed environment; the window adds PWD and OLDPWD. */
export const ENV = Object.freeze({
  HOME,
  USER: 'visitor',
  LOGNAME: 'visitor',
  SHELL: '/bin/bash',
  PATH: '/usr/local/bin:/usr/bin:/bin',
  HOSTNAME: 'rafey.ai',
  TERM: 'xterm-256color',
  LANG: 'en_US.UTF-8',
})

const SUCCESS = 0
const FAILURE = 1
// Bash's own exit statuses
const SYNTAX_ERROR = 2
const NOT_FOUND = 127

/** @param {Shell} shell @returns {Variables} */
const variablesOf = (shell) => ({ ...ENV, ...shell.env, PWD: shell.cwd })

/** @param {Shell} shell @returns {ExpandContext} */
const expansionOf = (shell) => ({ env: variablesOf(shell), cwd: shell.cwd, vfs: shell.fs.vfs(), lastCode: shell.code })

/** A word as it was typed, for bash's messages about it. @param {Word} word */
const typedText = (word) => word.parts.map((part) => part.text).join('')

/**
 * Bash's error for a word that cannot expand: it fails the command and, outside a pipeline, the rest of the line.
 * @param {string} message the word's `bad`
 * @returns {Ran}
 */
const badSubstitution = (message) => ({ ...refused([message], FAILURE), aborts: true })

/** @param {string} text */
const withNewline = (text) => (text.endsWith('\n') ? text : `${text}\n`)

/**
 * @param {string[]} stderr
 * @param {number} code
 * @returns {Ran}
 */
const refused = (stderr, code) => ({ stdout: '', screen: [], stderr, code, effects: [] })

/**
 * The plain stdout of an on-screen-only output: its `pre` lines' text.
 * @param {readonly Line[]} display
 */
const plainText = (display) =>
  display.flatMap((line) => (line.type === LINE_TYPES.PRE && 'text' in line ? [withNewline(String(line.text))] : [])).join('')

/**
 * What a command shows when it is last on the line: its display, or its stdout less the final newline.
 * @param {Line[] | undefined} display
 * @param {string} stdout
 * @returns {Line[]}
 */
const screenOf = (display, stdout) => {
  if (display) return display
  return stdout ? [pre(stdout.endsWith('\n') ? stdout.slice(0, -1) : stdout)] : []
}

/**
 * Opens one redirect's file: `>` empties or creates it, `>>` creates a missing one (bash opens it with O_CREAT) and
 * otherwise only checks it can be written.
 * @param {Redirect['op']} op
 * @param {string} path
 * @param {Shell} shell
 */
const openFile = (op, path, shell) => {
  if (op === '>') return shell.fs.apply(writeFile, { path, truncateOnly: true })
  const checked = shell.fs.check(writeFile, { path, append: true })
  if (!checked.ok || resolve(shell.fs.vfs(), path, { followLast: true }).ok) return checked
  return shell.fs.apply(writeFile, { path, append: true })
}

/**
 * Opens each redirect in order, before the command runs. The command's stdout goes to the last one. Full storage
 * refusing the open is `full` rather than a failure when there is a command: bash's open succeeds on a full disk,
 * so the command runs and its write, if it has output, is what fails.
 * @param {readonly Redirect[]} redirects
 * @param {boolean} named whether there is a command to run
 * @param {Shell} shell
 * @returns {{ ok: true, sink: string | null, full: boolean } | { ok: false, message: string } | { ok: false, bad: string }}
 */
const openRedirects = (redirects, named, shell) => {
  /** @type {string | null} */
  let sink = null
  let full = false
  for (const redirect of redirects) {
    if (redirect.target.bad) return { ok: false, bad: redirect.target.bad }
    const targets = expandWord(redirect.target, expansionOf(shell))
    if (targets.length !== 1) return { ok: false, message: `bash: ${typedText(redirect.target)}: ambiguous redirect` }
    const [target] = targets
    const path = normalize(target, shell.cwd)
    const opened = openFile(redirect.op, path, shell)
    const errno = opened.ok ? null : failureErrno(opened)
    if (errno === 'ENOSPC' && named) full = true
    else if (errno) return { ok: false, message: `bash: ${target}: ${errnoText(errno)}` }
    sink = path
  }
  return { ok: true, sink, full }
}

/**
 * The command's output lost to a failed write: bash's `write error`, code 1.
 * @param {Ran} ran
 * @param {string} name
 * @param {ShellErrno} errno
 * @returns {Ran}
 */
const writeError = (ran, name, errno) => ({
  ...ran,
  stdout: '',
  stderr: [...ran.stderr, `bash: ${name}: write error: ${errnoText(errno)}`],
  code: FAILURE,
})

/**
 * Writes a command's stdout to the file its redirect opened. A failed write is the command's write error (`c-full`).
 * @param {string} path
 * @param {Ran} ran
 * @param {string} name
 * @param {Shell} shell
 * @returns {Ran}
 */
const writeOut = (path, ran, name, shell) => {
  if (!ran.stdout) return { ...ran, stdout: '' }
  const written = shell.fs.apply(writeFile, { path, text: ran.stdout, append: true })
  return written.ok ? { ...ran, stdout: '' } : writeError(ran, name, failureErrno(written))
}

/**
 * The handler's output as a Ran.
 * @param {CommandOutput} output
 * @param {boolean} tty
 * @returns {Ran}
 */
const ranFrom = (output, tty) => {
  const stdout = output.stdout ?? plainText(output.display ?? [])
  return {
    stdout,
    screen: tty ? screenOf(output.display, stdout) : [],
    stderr: output.stderr ?? [],
    code: output.code ?? SUCCESS,
    effects: output.effects ?? [],
    cwd: output.cwd,
    env: output.env,
  }
}

/**
 * Expands one simple command, opens its redirects and runs it.
 * @param {SimpleCommand} command
 * @param {{ stdin: string | null, last: boolean }} input `last`: nothing is piped after it
 * @param {Shell} shell
 * @returns {Ran}
 */
const runCommand = (command, { stdin, last }, shell) => {
  const bad = command.words.find((word) => word.bad)?.bad
  if (bad) return badSubstitution(bad)
  const expansion = expansionOf(shell)
  const argv = command.words.flatMap((word) => expandWord(word, expansion))
  const opened = openRedirects(command.redirects, argv.length > 0, shell)
  if (!opened.ok) return 'bad' in opened ? badSubstitution(opened.bad) : refused([opened.message], FAILURE)
  if (!argv.length) return refused([], SUCCESS)
  const [name, ...args] = argv
  if (!Object.hasOwn(shell.registry, name)) return refused([`bash: ${name}: command not found`], NOT_FOUND)
  const tty = last && !opened.sink
  const { fs, content, history, now, startedAt, settings, processes, cwd } = shell
  const output = shell.registry[name]({ argv: args, name, stdin, tty, cwd, env: variablesOf(shell), fs, content, history, now, startedAt, settings, processes })
  const ran = ranFrom(output, tty)
  if (opened.full) return ran.stdout ? writeError(ran, name, 'ENOSPC') : { ...ran, stdout: '' }
  return opened.sink ? writeOut(opened.sink, ran, name, shell) : ran
}

/**
 * Runs a pipeline: each command's stdout is the next one's stdin. Only a command that runs alone can change the
 * window's folder or variables, or stop the rest of the line, as each stage of a real pipeline is a subshell.
 * @param {Pipeline} pipeline
 * @param {Shell} shell
 * @returns {{ lines: Line[], effects: Effect[], code: number, cwd?: string, env?: Record<string, string>, aborts?: boolean }}
 */
const runPipeline = (pipeline, shell) => {
  /** @type {Ran[]} */
  const stages = []
  /** @type {string | null} */
  let stdin = null
  pipeline.forEach((command, index) => {
    const ran = runCommand(command, { stdin, last: index === pipeline.length - 1 }, shell)
    stages.push(ran)
    stdin = ran.stdout
  })
  const final = stages[stages.length - 1]
  const alone = stages.length === 1
  return {
    lines: [...stages.flatMap((stage) => stage.stderr.map((text) => error(text))), ...final.screen],
    effects: stages.flatMap((stage) => stage.effects),
    code: final.code,
    cwd: alone ? final.cwd : undefined,
    env: alone ? final.env : undefined,
    aborts: alone && final.aborts,
  }
}

/** @param {{ cwd: string, env: Variables, code: number }} state @param {Line[]} lines @param {Effect[]} effects @returns {ExecResult} */
const finished = (state, lines, effects) => ({ lines, effects, cwd: state.cwd, env: { ...state.env, PWD: state.cwd }, code: state.code })

/**
 * Runs a command line against `registry`. A blank line leaves $? as it was.
 * @param {string} raw
 * @param {ExecContext} context
 * @param {Registry} registry
 * @returns {ExecResult}
 */
export const runLine = (raw, context, registry) => {
  const start = { cwd: context.cwd, env: context.env ?? {}, code: context.lastCode ?? SUCCESS }
  const tokens = tokenize(raw)
  if (!tokens.ok) return finished({ ...start, code: SYNTAX_ERROR }, [error(tokens.message)], [])
  const syntax = buildSyntax(tokens.tokens)
  if (!syntax.ok) return finished({ ...start, code: syntax.code }, [error(syntax.message)], [])
  const { fs, content, history = [], now = () => new Date(), startedAt = now(), settings, processes } = context
  /** @type {Shell} */
  let shell = { fs, content, history, now, startedAt, settings, processes, registry, ...start }
  /** @type {Line[]} */
  let lines = []
  /** @type {Effect[]} */
  let effects = []
  /** @type {string | null} */
  let joined = null
  for (const item of syntax.list) {
    const skipped = (joined === '&&' && shell.code !== SUCCESS) || (joined === '||' && shell.code === SUCCESS)
    joined = item.next
    if (skipped) continue
    const ran = runPipeline(item.pipeline, shell)
    shell = { ...shell, code: ran.code, cwd: ran.cwd ?? shell.cwd, env: ran.env ? { ...shell.env, ...ran.env } : shell.env }
    // `clear` wipes what the line printed before it, as it would the screen
    lines = ran.effects.some((effect) => effect.type === EFFECTS.CLEAR) ? ran.lines : [...lines, ...ran.lines]
    effects = [...effects, ...ran.effects]
    if (ran.aborts) break
  }
  return finished(shell, lines, effects)
}
