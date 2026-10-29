// @ts-check
// The first step of running a line: split it into words and operators the way bash does. Quotes and backslashes are
// settled here, but nothing is expanded yet: each word keeps its parts with how they were quoted, so expand.js knows
// which `$` and `*` the visitor typed bare. Syntax this shell refuses (subshells, `&`, `<`, `2>`, `>&`, `|&`,
// `$(…)`) comes out as an `unsupported` token for syntax.js to name. A word holding a `${` is then read back from what
// was typed the way bash's expansion reads it, which can differ, and is marked when that fails.

/**
 * @typedef {'none' | 'single' | 'double'} Quoting
 * @typedef {{ text: string, quoted: Quoting }} Part a run of a word quoted one way; an escaped character is a literal,
 *   so it is a 'single' part of its own, and each double-quoted string starts a part of its own
 * @typedef {{ type: 'word', parts: Part[], bad?: string }} Word `bad` is bash's error when the word cannot expand (a
 *   bad substitution), which fails its command when it runs
 * @typedef {'|' | '>' | '>>' | '&&' | '||' | ';' | ';;'} Operator `;;` ends a case branch, so it is only ever an error here
 * @typedef {{ type: 'op', op: Operator }} OpToken
 * @typedef {{ type: 'unsupported', text: string }} UnsupportedToken what was typed, or `$(…)` / `` `…` `` for a substitution
 * @typedef {Word | OpToken | UnsupportedToken} Token
 * @typedef {{ ok: true, tokens: Token[] } | { ok: false, message: string }} TokenizeResult
 * @typedef {{ end: number } | { open: string }} Scan where a matched pair closed (just after it), or the innermost
 *   opener still open when the text ran out
 */

const BLANKS = new Set([' ', '\t', '\n'])
// Inside double quotes a backslash escapes only these; before anything else it stays
const DOUBLE_QUOTE_ESCAPES = new Set(['$', '`', '"', '\\', '\n'])
const DIGITS = /^\d+$/
const COMMAND_SUBSTITUTION = '$(…)'
const BACKTICK_SUBSTITUTION = '`…`'
// `$$` is the shell's process ID, read as one unit, so its second `$` never opens a `${`
const PROCESS_ID = '$$'
const DOLLAR_BRACE = '${'
// What `${…}` may hold: a parameter, maybe counted (`#`) or indirect (`!`), maybe subscripted, then nothing or an
// operator such as `:-` or `%`. Anything else is a bad substitution
const VALID_BRACE = /^[#!]?(?:[A-Za-z_]\w*|\d+|[?#$!@*-])(?:\[[^\]]*\])?(?:[:#%/^,@+=?-][\s\S]*)?$/
const ESCAPED_CHAR = /\\([\s\S])/g
// File descriptor 1 is stdout, so `1>` is `>` spelled out
const STDOUT = 1
// Bash's shorthand for `2>&1 |`
const ERROR_PIPE = '|&'

/** Builds one word's parts: text joins the last part when quoted the same way, unless a double-quoted string starts. */
const createParts = () => {
  /** @type {Part[]} */
  const parts = []
  let apart = false
  /** @param {string} text @param {Quoting} quoted */
  const addText = (text, quoted) => {
    const last = parts[parts.length - 1]
    if (last && last.quoted === quoted && !apart) parts[parts.length - 1] = { text: last.text + text, quoted }
    else parts.push({ text, quoted })
    apart = false
  }
  return {
    parts,
    addText,
    // Each double-quoted string is a part of its own, so `"$@"""` still shows it holds an empty string
    openDouble: () => {
      apart = true
    },
    // An empty double-quoted string is still an empty part
    closeDouble: () => {
      if (apart) addText('', 'double')
    },
  }
}

/** @typedef {ReturnType<typeof createParts>} Parts */

/** A single-quoted string from just after its `'`. @param {string} text @param {number} index @returns {Scan} */
const scanSingle = (text, index) => {
  const close = text.indexOf("'", index)
  return close < 0 ? { open: "'" } : { end: close + 1 }
}

/**
 * `$$` or a whole `${…}` at `index`, as bash's tokenizer reads them; null for anything else.
 * @param {string} text @param {number} index
 * @returns {Scan | null}
 */
const scanDollar = (text, index) => {
  if (text.startsWith(PROCESS_ID, index)) return { end: index + PROCESS_ID.length }
  return text.startsWith(DOLLAR_BRACE, index) ? scanBrace(text, index + DOLLAR_BRACE.length) : null
}

/**
 * One step of a matched-pair scan: an escape is two characters, `$$` one unit, and `${…}` and, where `quotes` count,
 * a quoted string are read whole.
 * @param {string} text @param {number} at @param {boolean} quotes
 * @returns {Scan}
 */
const scanStep = (text, at, quotes) => {
  const char = text[at]
  if (char === '\\') return { end: at + 2 }
  if (quotes && char === "'") return scanSingle(text, at + 1)
  if (quotes && char === '"') return scanDouble(text, at + 1)
  return scanDollar(text, at) ?? { end: at + 1 }
}

/**
 * Bash's matched-pair scan of a `${`, from just after it: quotes are skipped whole, a nested `${` must close first,
 * and `}` closes.
 * @param {string} text @param {number} index
 * @returns {Scan}
 */
const scanBrace = (text, index) => {
  let at = index
  while (at < text.length && text[at] !== '}') {
    const step = scanStep(text, at, true)
    if ('open' in step) return step
    at = step.end
  }
  return at < text.length ? { end: at + 1 } : { open: '}' }
}

/**
 * A double-quoted string from just after its `"`. A `'` inside is plain text, though inside a `${…}` it quotes.
 * @param {string} text @param {number} index
 * @returns {Scan}
 */
const scanDouble = (text, index) => {
  let at = index
  while (at < text.length && text[at] !== '"') {
    const step = scanStep(text, at, false)
    if ('open' in step) return step
    at = step.end
  }
  return at < text.length ? { end: at + 1 } : { open: '"' }
}

/** @param {Scan} scan @param {number} fallback where to stop when the scan never closed */
const endOf = (scan, fallback) => ('end' in scan ? scan.end : fallback)

/**
 * A backslash outside quotes: the next character is literal, a newline after it vanishes, and a trailing one is kept.
 * @param {string} line @param {number} index @param {Pick<Parts, 'addText'>} out @returns {number} where to read on
 */
const readEscape = (line, index, out) => {
  const next = line[index + 1]
  if (next === undefined) out.addText('\\', 'none')
  else if (next !== '\n') out.addText(next, 'single')
  return index + 2
}

/**
 * Where bash's expansion ends a double-quoted string of a typed word: unlike the tokenizer it reads every `${` to its
 * `}`, even one right after `$$`. The end of the word when it never closes; -1 when such a `${` never does.
 * @param {string} raw @param {number} start just after the `"`
 */
const expandedDoubleEnd = (raw, start) => {
  let at = start
  while (at < raw.length && raw[at] !== '"') {
    const brace = raw.startsWith(DOLLAR_BRACE, at) ? scanBrace(raw, at + DOLLAR_BRACE.length) : { end: at + (raw[at] === '\\' ? 2 : 1) }
    if ('open' in brace) return -1
    at = brace.end
  }
  return Math.min(at, raw.length)
}

/**
 * Adds the double-quoted text from `from` to `to` as bash's expansion reads it. A `${` that `$$` reads past is
 * literal, though what it spans still reads as double-quoted text, inner quotes and all. False at a `${…}` that holds
 * no valid parameter.
 * @param {string} raw @param {number} from @param {number} to @param {Parts} out
 * @returns {boolean}
 */
const readDoubleText = (raw, from, to, out) => {
  // The last character was a `$` that a `$` right after it pairs with
  let pairs = false
  let at = from
  while (at < to) {
    const [char, next] = [raw[at], raw[at + 1]]
    if (char === '\\' && DOUBLE_QUOTE_ESCAPES.has(next)) {
      if (next !== '\n') out.addText(next, 'single')
      at += 2
    } else if (char === '$' && next === '{') {
      const end = endOf(scanBrace(raw, at + DOLLAR_BRACE.length), to)
      if (pairs) out.addText(char, 'double')
      const read = pairs ? readDoubleText(raw, at + 1, end, out) : VALID_BRACE.test(raw.slice(at + DOLLAR_BRACE.length, end - 1))
      if (!read) return false
      if (!pairs) out.addText(raw.slice(at, end), 'double')
      at = end
    } else {
      out.addText(char, 'double')
      at += 1
    }
    pairs = char === '$' && next !== '{' && !pairs
  }
  return true
}

/**
 * A double-quoted string of a typed word, read back the way bash's expansion reads it.
 * @param {string} raw the whole word @param {number} start just after the `"` @param {Parts} out
 * @returns {{ end: number } | { bad: string }}
 */
const readExpandedDouble = (raw, start, out) => {
  const close = expandedDoubleEnd(raw, start)
  if (close < 0) return { bad: `bash: bad substitution: no closing '}' in ${raw}` }
  out.openDouble()
  // Bash names the string with only its `\"` unescaped
  const shown = raw.slice(start, close).replace(ESCAPED_CHAR, (escape, char) => (char === '"' ? char : escape))
  if (!readDoubleText(raw, start, close, out)) return { bad: `bash: ${shown}: bad substitution` }
  out.closeDouble()
  return { end: close + 1 }
}

/**
 * One piece of a typed word, read back the way bash's expansion reads it. An unquoted `${…}` that holds no valid
 * parameter fails naming the whole word.
 * @param {string} raw @param {number} index @param {Parts} out
 * @returns {{ end: number } | { bad: string }}
 */
const readExpandedPiece = (raw, index, out) => {
  const char = raw[index]
  if (char === '\\') return { end: readEscape(raw, index, out) }
  if (char === '"') return readExpandedDouble(raw, index + 1, out)
  if (char === "'") {
    const end = endOf(scanSingle(raw, index + 1), raw.length + 1)
    out.addText(raw.slice(index + 1, end - 1), 'single')
    return { end }
  }
  const dollar = scanDollar(raw, index)
  const end = dollar ? endOf(dollar, raw.length) : index + 1
  if (raw.startsWith(DOLLAR_BRACE, index) && !VALID_BRACE.test(raw.slice(index + DOLLAR_BRACE.length, end - 1))) {
    return { bad: `bash: ${raw}: bad substitution` }
  }
  out.addText(raw.slice(index, end), 'none')
  return { end }
}

/**
 * A word holding a `${`, read back from what was typed the way bash's expansion reads it. That differs from the
 * tokenizer twice over: inside double quotes it reads `"$${""}"` as the one string `$${""}`, and it fails on a `${…}`
 * that holds no valid parameter, giving bash's error for the first failure instead.
 * @param {string} raw
 * @returns {{ parts: Part[] } | { bad: string }}
 */
const readWord = (raw) => {
  const out = createParts()
  let index = 0
  while (index < raw.length) {
    const read = readExpandedPiece(raw, index, out)
    if ('bad' in read) return read
    index = read.end
  }
  return { parts: out.parts }
}

/**
 * Collects tokens, gluing touching pieces into one word until a blank or an operator ends it. `at` keeps it told
 * where the line has got to, so each word knows what was typed for it.
 * @param {string} line
 */
const createTokens = (line) => {
  /** @type {Token[]} */
  const tokens = []
  /** @type {Parts | null} null between words */
  let word = null
  let start = 0
  let cursor = 0
  const current = () => {
    if (!word) start = cursor
    word ??= createParts()
    return word
  }
  const endWord = () => {
    const typed = line.slice(start, cursor)
    const read = word && typed.includes(DOLLAR_BRACE) ? readWord(typed) : null
    // A bad word keeps the tokenizer's parts, as it never expands
    if (word) tokens.push(read && 'parts' in read ? { type: 'word', parts: read.parts } : { type: 'word', parts: word.parts, ...read })
    word = null
  }
  /** @param {Token} token */
  const push = (token) => {
    endWord()
    tokens.push(token)
  }
  // `2>`: a word of bare digits touching a redirect names a file descriptor, so it joins the operator
  const takeDescriptor = () => {
    const only = word?.parts.length === 1 ? word.parts[0] : null
    if (!only || only.quoted !== 'none' || !DIGITS.test(only.text)) return ''
    word = null
    return only.text
  }
  /** @param {number} index */
  const at = (index) => {
    cursor = index
  }
  /** @param {string} text @param {Quoting} quoted */
  const addText = (text, quoted) => current().addText(text, quoted)
  const [openDouble, closeDouble] = [() => current().openDouble(), () => current().closeDouble()]
  return { tokens, addText, openDouble, closeDouble, at, endWord, push, takeDescriptor, inWord: () => word !== null }
}

/** @typedef {ReturnType<typeof createTokens>} Tokens */

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
 * The text of a double-quoted string, from `from` to its closing quote at `to`: a few escapes count, and `$$` and
 * `${…}` are taken whole.
 * @param {string} line @param {number} from @param {number} to @param {Tokens} out
 */
const readDouble = (line, from, to, out) => {
  out.openDouble()
  let index = from
  while (index < to) {
    const char = line[index]
    const dollar = scanDollar(line, index)
    if (dollar) {
      const end = endOf(dollar, to)
      out.addText(line.slice(index, end), 'double')
      index = end
      continue
    }
    const substitution = readSubstitution(line, index, out)
    if (substitution) {
      index += substitution
      continue
    }
    const escaped = char === '\\' && DOUBLE_QUOTE_ESCAPES.has(line[index + 1])
    if (escaped && line[index + 1] !== '\n') out.addText(line[index + 1], 'single')
    if (!escaped) out.addText(char, 'double')
    index += escaped ? 2 : 1
  }
  out.closeDouble()
}

/**
 * The quoted run opening at `start`: single quotes keep everything; double quotes honour a few escapes. An empty pair
 * still makes a word.
 * @param {string} line @param {number} start @param {Tokens} out
 * @returns {Scan}
 */
const readQuoted = (line, start, out) => {
  const single = line[start] === "'"
  const scanned = single ? scanSingle(line, start + 1) : scanDouble(line, start + 1)
  if ('open' in scanned) return scanned
  if (single) out.addText(line.slice(start + 1, scanned.end - 1), 'single')
  else readDouble(line, start + 1, scanned.end - 1, out)
  return scanned
}

/**
 * `>`, `<`, their doubles and their descriptor copies (`>&`, `<&`), with any file descriptor typed right before them.
 * @param {string} line @param {number} index @param {Tokens} out @returns {number} where to read on
 */
const readRedirect = (line, index, out) => {
  const char = line[index]
  const operator = line.slice(index, index + (line[index + 1] === char || line[index + 1] === '&' ? 2 : 1))
  const descriptor = out.takeDescriptor()
  if ((operator === '>' || operator === '>>') && (!descriptor || Number(descriptor) === STDOUT)) out.push({ type: 'op', op: operator })
  else out.push({ type: 'unsupported', text: descriptor + operator })
  return index + operator.length
}

/**
 * `&>` or `&>>` at `index`, sending stdout and stderr to one file, as an unsupported token; 0 when there is none.
 * @param {string} line @param {number} index @param {Tokens} out @returns {number} characters it took
 */
const readBothRedirect = (line, index, out) => {
  if (!line.startsWith('&>', index)) return 0
  const text = line.startsWith('&>>', index) ? '&>>' : '&>'
  out.push({ type: 'unsupported', text })
  return text.length
}

/**
 * `|&`, a pipe that also carries stderr (`2>&1 |`), as an unsupported token; 0 when there is none.
 * @param {string} line @param {number} index @param {Tokens} out @returns {number} characters it took
 */
const readErrorPipe = (line, index, out) => {
  if (!line.startsWith(ERROR_PIPE, index)) return 0
  out.push({ type: 'unsupported', text: ERROR_PIPE })
  return ERROR_PIPE.length
}

/**
 * The operator at `index`, pushed as a token; -1 when the character is part of a word.
 * @param {string} line @param {number} index @param {Tokens} out @returns {number} where to read on
 */
const readOperator = (line, index, out) => {
  const char = line[index]
  const doubled = line[index + 1] === char
  const taken = readSubstitution(line, index, out) || readBothRedirect(line, index, out) || readErrorPipe(line, index, out)
  if (taken) return index + taken
  if (char === '>' || char === '<') return readRedirect(line, index, out)
  if (char === '|') out.push({ type: 'op', op: doubled ? '||' : '|' })
  else if (char === '&') out.push(doubled ? { type: 'op', op: '&&' } : { type: 'unsupported', text: '&' })
  else if (char === ';') out.push({ type: 'op', op: doubled ? ';;' : ';' })
  else if (char === '(' || char === ')') out.push({ type: 'unsupported', text: char })
  else return -1
  return index + ((char === '|' || char === '&' || char === ';') && doubled ? 2 : 1)
}

/**
 * Splits a command line into words and operators. An unquoted `#` that starts a word ends the line.
 * @param {string} raw
 * @returns {TokenizeResult}
 */
export const tokenize = (raw) => {
  const line = String(raw ?? '')
  const out = createTokens(line)
  let index = 0
  while (index < line.length) {
    const char = line[index]
    out.at(index)
    if (char === '#' && !out.inWord()) break
    const dollar = scanDollar(line, index)
    const read = dollar ?? (char === "'" || char === '"' ? readQuoted(line, index, out) : null)
    if (read && 'open' in read) return { ok: false, message: `bash: unexpected EOF while looking for matching '${read.open}'` }
    if (read) {
      if (dollar) out.addText(line.slice(index, read.end), 'none')
      index = read.end
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
  out.at(index)
  out.endWord()
  return { ok: true, tokens: out.tokens }
}
