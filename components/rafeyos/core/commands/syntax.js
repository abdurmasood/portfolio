// @ts-check
// The second step of running a line: group tokens into the tree run.js walks. A line is a list of pipelines joined by
// `&&`, `||` and `;`; a pipeline is simple commands joined by `|`; a command is its words plus its `>` / `>>`
// redirects. Words stay unexpanded, because each command expands its own just before it runs. Anything past tier 2
// (loops, subshells, `$(…)`, assignments…) is refused whole, so nothing on the line runs.

/** @import { OpToken, Token, UnsupportedToken, Word } from './tokenize' */

/**
 * @typedef {{ op: '>' | '>>', target: Word }} Redirect
 * @typedef {{ words: Word[], redirects: Redirect[] }} SimpleCommand a bare `> f` has no words
 * @typedef {SimpleCommand[]} Pipeline
 * @typedef {'&&' | '||' | ';'} Connector
 * @typedef {{ pipeline: Pipeline, next: Connector | null }} ListItem `next` joins it to the item after; null on the last
 * @typedef {{ ok: true, list: ListItem[] } | { ok: false, message: string, code: 2 }} SyntaxResult
 */

// Bash's own exit status for a line it cannot parse
const SYNTAX_CODE = 2

/**
 * A reserved word that opens a tier-3 construct -> what this shell calls it. Bash reads these only in command
 * position, so after a leading redirect they are plain words.
 */
const KEYWORDS = new Map([
  ['for', 'loops'],
  ['while', 'loops'],
  ['until', 'loops'],
  ['select', 'loops'],
  ['if', 'conditionals'],
  ['case', 'conditionals'],
  ['function', 'functions'],
])
// A builtin, so it counts as a command's first word even after a redirect
const EXPORT = 'export'
const ASSIGNMENT = /^[A-Za-z_]\w*=/

/** @param {string} message @returns {SyntaxResult} */
const fail = (message) => ({ ok: false, message, code: SYNTAX_CODE })

/** Claude's call 1: one bash line naming what was typed and the kind of syntax it belongs to. */
const refuse = (/** @type {string} */ token, /** @type {string} */ what) => fail(`bash: ${token}: ${what} isn't supported here`)

/** @param {string} text what tokenize marked unsupported */
const categoryOf = (text) => {
  if (text === '(' || text === ')') return 'subshells'
  if (text === '&') return 'background jobs'
  if (text.startsWith('$(') || text.startsWith('`')) return 'command substitution'
  return text.endsWith('<') ? 'input redirection' : 'file descriptor redirection'
}

/** @param {Word} word */
const textOf = (word) => word.parts.map((part) => part.text).join('')

/**
 * A refusal when a command's first word opens a loop, conditional or function, or sets a variable. Only bare
 * spellings count: `'for'` is just a command bash can't find.
 * @param {Word} word
 * @param {boolean} commandPosition nothing, not even a redirect, comes before it in its command
 * @returns {SyntaxResult | null}
 */
const firstWordRefusal = (word, commandPosition) => {
  const [first] = word.parts
  if (first.quoted !== 'none') return null
  const name = word.parts.length === 1 ? first.text : ''
  const keyword = commandPosition ? KEYWORDS.get(name) : undefined
  if (keyword) return refuse(name, keyword)
  if (name === EXPORT) return refuse(name, 'variables')
  return ASSIGNMENT.test(first.text) ? refuse(textOf(word), 'variables') : null
}

/** @param {string} text the token bash names, or 'newline' at the end of the line */
const syntaxError = (text) => fail(`bash: syntax error near unexpected token '${text}'`)

/** @param {OpToken | UnsupportedToken | undefined} token what stood where a word was needed */
const unexpected = (token) => {
  if (!token) return syntaxError('newline')
  if (token.type === 'unsupported') return refuse(token.text, categoryOf(token.text))
  return syntaxError(token.op)
}

/** @returns {SimpleCommand} */
const emptyCommand = () => ({ words: [], redirects: [] })

/** @param {SimpleCommand} command */
const isEmpty = (command) => !command.words.length && !command.redirects.length

/** @param {Token} token */
const tokenText = (token) => (token.type === 'word' ? textOf(token) : token.type === 'op' ? token.op : token.text)

/**
 * What an unsupported token means where it stands. `(` opens a subshell at the start of a command and, closed at once
 * right after a lone name (`foo()`), defines a function; otherwise bash finds it, or what follows it, out of place.
 * @param {UnsupportedToken} token @param {SimpleCommand} command the command it interrupts
 * @param {Token | undefined} next the token after it
 */
const unsupportedRefusal = (token, command, next) => {
  if (token.text !== '(' || isEmpty(command)) return unexpected(token)
  if (command.words.length !== 1 || command.redirects.length) return syntaxError(token.text)
  if (next?.type === 'unsupported' && next.text === ')') return refuse(token.text, 'functions')
  return syntaxError(next ? tokenText(next) : 'newline')
}

/**
 * Closes the line: the last command ends the last pipeline, a trailing `;` is dropped, and a trailing `|`, `&&` or
 * `||` leaves the line unfinished.
 * @param {ListItem[]} list @param {Pipeline} pipeline @param {SimpleCommand} command
 * @returns {SyntaxResult}
 */
const finish = (list, pipeline, command) => {
  if (!isEmpty(command)) return { ok: true, list: [...list, { pipeline: [...pipeline, command], next: null }] }
  const last = list[list.length - 1]
  if (pipeline.length || (last && last.next !== ';')) return fail('bash: syntax error: unexpected end of file')
  return { ok: true, list: last ? [...list.slice(0, -1), { ...last, next: null }] : list }
}

/**
 * Builds the list a line runs as, or the error bash would print for it.
 * @param {Token[]} tokens
 * @returns {SyntaxResult}
 */
export const buildSyntax = (tokens) => {
  /** @type {ListItem[]} */
  const list = []
  /** @type {Pipeline} */
  let pipeline = []
  let command = emptyCommand()
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.type === 'unsupported') return unsupportedRefusal(token, command, tokens[index + 1])
    if (token.type === 'word') {
      const refusal = command.words.length ? null : firstWordRefusal(token, isEmpty(command))
      if (refusal) return refusal
      command.words.push(token)
    } else if (token.op === '>' || token.op === '>>') {
      const target = tokens[index + 1]
      if (target?.type !== 'word') return unexpected(target)
      command.redirects.push({ op: token.op, target })
      index += 1
    } else {
      if (token.op === ';;' || isEmpty(command)) return unexpected(token)
      pipeline.push(command)
      command = emptyCommand()
      if (token.op === '|') continue
      list.push({ pipeline, next: token.op })
      pipeline = []
    }
  }
  return finish(list, pipeline, command)
}
