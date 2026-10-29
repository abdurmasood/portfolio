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

/** A first word that opens a tier-3 construct -> what this shell calls it. */
const KEYWORDS = new Map([
  ['for', 'loops'],
  ['while', 'loops'],
  ['until', 'loops'],
  ['select', 'loops'],
  ['if', 'conditionals'],
  ['case', 'conditionals'],
  ['function', 'functions'],
  ['export', 'variables'],
])
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
 * A refusal when a command's first word opens a loop, conditional or function, or assigns a variable. Only bare
 * spellings count: `'for'` is just a command bash can't find.
 * @param {Word} word
 * @returns {SyntaxResult | null}
 */
const firstWordRefusal = (word) => {
  const [first] = word.parts
  if (first.quoted !== 'none') return null
  const keyword = word.parts.length === 1 ? KEYWORDS.get(first.text) : undefined
  if (keyword) return refuse(first.text, keyword)
  return ASSIGNMENT.test(first.text) ? refuse(textOf(word), 'variables') : null
}

/** @param {OpToken | UnsupportedToken | undefined} token what stood where a word was needed */
const unexpected = (token) => {
  if (!token) return fail("bash: syntax error near unexpected token 'newline'")
  if (token.type === 'unsupported') return refuse(token.text, categoryOf(token.text))
  return fail(`bash: syntax error near unexpected token '${token.op}'`)
}

/** @returns {SimpleCommand} */
const emptyCommand = () => ({ words: [], redirects: [] })

/** @param {SimpleCommand} command */
const isEmpty = (command) => !command.words.length && !command.redirects.length

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
    if (token.type === 'unsupported') return unexpected(token)
    if (token.type === 'word') {
      const refusal = command.words.length ? null : firstWordRefusal(token)
      if (refusal) return refusal
      command.words.push(token)
    } else if (token.op === '>' || token.op === '>>') {
      const target = tokens[index + 1]
      if (target?.type !== 'word') return unexpected(target)
      command.redirects.push({ op: token.op, target })
      index += 1
    } else {
      if (isEmpty(command)) return unexpected(token)
      pipeline.push(command)
      command = emptyCommand()
      if (token.op === '|') continue
      list.push({ pipeline, next: token.op })
      pipeline = []
    }
  }
  return finish(list, pipeline, command)
}
