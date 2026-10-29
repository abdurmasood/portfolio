// @ts-check
// The first step of running a line: split it into words and operators the way bash does. Quotes and backslashes are
// settled here, but nothing is expanded yet: each word keeps its parts with how they were quoted, so expand.js knows
// which `$` and `*` the visitor typed bare. Syntax this shell refuses (subshells, `&`, `<`, `2>`, `$(…)`) comes out as
// an `unsupported` token for syntax.js to name.

/**
 * @typedef {'none' | 'single' | 'double'} Quoting
 * @typedef {{ text: string, quoted: Quoting }} Part a run of a word quoted one way; an escaped character is a literal,
 *   so it is a 'single' part of its own
 * @typedef {{ type: 'word', parts: Part[] }} Word
 * @typedef {'|' | '>' | '>>' | '&&' | '||' | ';'} Operator
 * @typedef {{ type: 'op', op: Operator }} OpToken
 * @typedef {{ type: 'unsupported', text: string }} UnsupportedToken what was typed, or `$(…)` / `` `…` `` for a substitution
 * @typedef {Word | OpToken | UnsupportedToken} Token
 * @typedef {{ ok: true, tokens: Token[] } | { ok: false, message: string }} TokenizeResult
 */

const BLANKS = new Set([' ', '\t', '\n'])
// Inside double quotes a backslash escapes only these; before anything else it stays
const DOUBLE_QUOTE_ESCAPES = new Set(['$', '`', '"', '\\', '\n'])
const DIGITS = /^\d+$/
const COMMAND_SUBSTITUTION = '$(…)'
const BACKTICK_SUBSTITUTION = '`…`'

/** Collects tokens, gluing touching pieces into one word until a blank or an operator ends it. */
const createTokens = () => {
  /** @type {Token[]} */
  const tokens = []
  /** @type {Part[] | null} null between words */
  let parts = null

  /** @param {string} text @param {Quoting} quoted */
  const addText = (text, quoted) => {
    const current = parts ?? []
    const last = current[current.length - 1]
    if (last && last.quoted === quoted) current[current.length - 1] = { text: last.text + text, quoted }
    else current.push({ text, quoted })
    parts = current
  }
  const endWord = () => {
    if (parts) tokens.push({ type: 'word', parts })
    parts = null
  }
  /** @param {Token} token */
  const push = (token) => {
    endWord()
    tokens.push(token)
  }
  // `2>`: a word of bare digits touching a redirect names a file descriptor, so it joins the operator
  const takeDescriptor = () => {
    const only = parts?.length === 1 ? parts[0] : null
    if (!only || only.quoted !== 'none' || !DIGITS.test(only.text)) return ''
    parts = null
    return only.text
  }
  return { tokens, addText, endWord, push, takeDescriptor, inWord: () => parts !== null }
}

/** @typedef {ReturnType<typeof createTokens>} Tokens */

/**
 * A backslash outside quotes: the next character is literal, a newline after it vanishes, and a trailing one is kept.
 * @param {string} line @param {number} index @param {Tokens} out @returns {number} where to read on
 */
const readEscape = (line, index, out) => {
  const next = line[index + 1]
  if (next === undefined) out.addText('\\', 'none')
  else if (next !== '\n') out.addText(next, 'single')
  return index + 2
}

/**
 * `$(` or a backtick at `index`, as an unsupported token; 0 when there is none.
 * @param {string} line @param {number} index @param {Tokens} out @returns {number} characters it took
 */
const readSubstitution = (line, index, out) => {
  if (line[index] === '`') {
    out.push({ type: 'unsupported', text: BACKTICK_SUBSTITUTION })
    return 1
  }
  if (line[index] !== '$' || line[index + 1] !== '(') return 0
  out.push({ type: 'unsupported', text: COMMAND_SUBSTITUTION })
  return 2
}

/**
 * The quoted run opening at `start`: single quotes keep everything; double quotes honour a few escapes.
 * An empty pair still makes a word. Returns where to read on, or -1 when the quote never closes.
 * @param {string} line @param {number} start @param {Tokens} out
 */
const readQuoted = (line, start, out) => {
  if (line[start] === "'") {
    const end = line.indexOf("'", start + 1)
    if (end >= 0) out.addText(line.slice(start + 1, end), 'single')
    return end < 0 ? -1 : end + 1
  }
  let added = false
  let index = start + 1
  while (index < line.length && line[index] !== '"') {
    const char = line[index]
    const substitution = readSubstitution(line, index, out)
    if (substitution) {
      index += substitution
      continue
    }
    const escaped = char === '\\' && DOUBLE_QUOTE_ESCAPES.has(line[index + 1])
    if (escaped && line[index + 1] !== '\n') out.addText(line[index + 1], 'single')
    if (!escaped) out.addText(char, 'double')
    added ||= !escaped || line[index + 1] !== '\n'
    index += escaped ? 2 : 1
  }
  if (index >= line.length) return -1
  if (!added) out.addText('', 'double')
  return index + 1
}

/**
 * `>`, `<` and their doubles, with any file descriptor typed right before them.
 * @param {string} line @param {number} index @param {Tokens} out @returns {number} where to read on
 */
const readRedirect = (line, index, out) => {
  const char = line[index]
  const length = line[index + 1] === char ? 2 : 1
  const descriptor = out.takeDescriptor()
  if (char === '>' && !descriptor) out.push({ type: 'op', op: length === 2 ? '>>' : '>' })
  else out.push({ type: 'unsupported', text: descriptor + char.repeat(length) })
  return index + length
}

/**
 * The operator at `index`, pushed as a token; -1 when the character is part of a word.
 * @param {string} line @param {number} index @param {Tokens} out @returns {number} where to read on
 */
const readOperator = (line, index, out) => {
  const char = line[index]
  const doubled = line[index + 1] === char
  const substitution = readSubstitution(line, index, out)
  if (substitution) return index + substitution
  if (char === '>' || char === '<') return readRedirect(line, index, out)
  if (char === '|') out.push({ type: 'op', op: doubled ? '||' : '|' })
  else if (char === '&') out.push(doubled ? { type: 'op', op: '&&' } : { type: 'unsupported', text: '&' })
  else if (char === ';') out.push({ type: 'op', op: ';' })
  else if (char === '(' || char === ')') out.push({ type: 'unsupported', text: char })
  else return -1
  return index + ((char === '|' || char === '&') && doubled ? 2 : 1)
}

/**
 * Splits a command line into words and operators. An unquoted `#` that starts a word ends the line.
 * @param {string} raw
 * @returns {TokenizeResult}
 */
export const tokenize = (raw) => {
  const line = String(raw ?? '')
  const out = createTokens()
  let index = 0
  while (index < line.length) {
    const char = line[index]
    if (char === '#' && !out.inWord()) break
    if (char === "'" || char === '"') {
      index = readQuoted(line, index, out)
      if (index < 0) return { ok: false, message: `bash: unexpected EOF while looking for matching '${char}'` }
    } else if (char === '\\') {
      index = readEscape(line, index, out)
    } else if (BLANKS.has(char)) {
      out.endWord()
      index += 1
    } else {
      const next = readOperator(line, index, out)
      if (next < 0) out.addText(char, 'none')
      index = next < 0 ? index + 1 : next
    }
  }
  out.endWord()
  return { ok: true, tokens: out.tokens }
}
