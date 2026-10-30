// @ts-check
// Commands that read and reshape text: echo, head, tail, wc, grep, sort, uniq, less. Each reads its file operands, or
// stdin when it has none (`-` names stdin too), and words its errors the way its GNU namesake does.
import { NODE_TYPES } from '@/components/rafeyos/core/vfs/buildVfs'
import { writeFile } from '@/components/rafeyos/core/vfs/fsOps'
import { byteCount, bytesOf, characterCount, textOf } from '@/components/rafeyos/core/vfs/bytes'
import { normalize, resolve } from '@/components/rafeyos/core/vfs/paths'
import { errnoText } from '@/components/rafeyos/core/commands/errors'
import { parseOptions } from '@/components/rafeyos/core/commands/options'
import { inside, missing, nameOf, shellChildren, usage, why } from './fileInfo'
import { homeFileMessage } from './fs'

/**
 * @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs'
 * @import { Errno } from '@/components/rafeyos/core/vfs/fsOps'
 * @import { OptionSpec, ParsedOptions } from '@/components/rafeyos/core/commands/options'
 * @import { CommandContext, CommandOutput } from './result'
 */

/**
 * @typedef {{ ok: true, text: string } | { ok: false, errno: Errno } | { ok: false, binary: true }} Input
 * @typedef {(typed: string, reason: string) => string} ReadError a command's wording for a file it can't read
 * @typedef {{ sign: '' | '+' | '-', count: number }} Amount head's and tail's N, with the sign it was given
 * @typedef {{ name: string, text: string }} Searched a file grep reads, by the name it prints
 */

const STDIN = '-'
const STDIN_NAME = 'standard input'
// The song has no text to show; cat says the same
const BINARY = 'binary file (try: music play)'
const DEFAULT_LINES = 10
const WC_STDIN_WIDTH = 7
const UNIQ_COUNT_WIDTH = 7
// grep and sort exit 2 on trouble, not 1
const TROUBLE = 2
const NO_MATCH = 1

/** @param {string} line */
const withNewline = (line) => `${line}\n`

/** A text's lines, each with its newline; a last line without one still counts. @param {string} text */
const linesOf = (text) => text.split(/(?<=\n)/).filter(Boolean)

/** A text's lines without their newlines, for commands that print each line again. @param {string} text */
const rowsOf = (text) => linesOf(text).map((line) => line.replace(/\n$/, ''))

/**
 * One operand's text: stdin for `-`, a file's text through links, or why there is none.
 * @param {Vfs} vfs @param {string} typed @param {Pick<CommandContext, 'cwd' | 'stdin'>} context
 * @returns {Input}
 */
const readInput = (vfs, typed, { cwd, stdin }) => {
  if (typed === STDIN) return { ok: true, text: stdin ?? '' }
  const found = resolve(vfs, normalize(typed, cwd), { followLast: true })
  if (!found.ok) return { ok: false, errno: found.errno }
  const node = vfs[found.path]
  if (node.type === NODE_TYPES.DIR) return { ok: false, errno: 'EISDIR' }
  return 'text' in node ? { ok: true, text: node.text } : { ok: false, binary: true }
}

/**
 * The line a failed read prints: the song in cat's words, anything else in the command's own.
 * @param {string} name @param {string} typed @param {Exclude<Input, { ok: true }>} input @param {ReadError} wording
 */
const readError = (name, typed, input, wording) => ('binary' in input ? `${name}: ${typed}: ${BINARY}` : wording(typed, errnoText(input.errno)))

/** @param {readonly string[]} argv @param {OptionSpec} spec @returns {ParsedOptions | CommandOutput} */
const options = (argv, spec) => {
  const parsed = parseOptions(argv, spec)
  return 'error' in parsed ? usage(parsed) : parsed
}

/** @param {string[]} operands the files to read, or stdin when there are none */
const inputsOf = (operands) => (operands.length ? operands : [STDIN])

// echo: bash's builtin reads options itself, only as leading words made of n, e and E
const ECHO_OPTION = /^-[neE]+$/
/** @type {Readonly<Record<string, string>>} */
const ESCAPES = Object.freeze({ a: '\x07', b: '\b', e: '\x1b', E: '\x1b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\' })
const ESCAPE = /(\\(?:[abeEfnrtv\\c]|0[0-7]{0,3}|x[0-9a-fA-F]{1,2}))/
const OCTAL = 8
const HEX = 16

/**
 * echo -e's escapes; `\c` ends the output there, newline included.
 * @param {string} text
 * @returns {{ text: string, stopped: boolean }}
 */
const unescape = (text) => {
  const pieces = text.split(ESCAPE)
  let out = ''
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index]
    if (index % 2 === 0) out += piece
    else if (piece === '\\c') return { text: out, stopped: true }
    else if (piece[1] === '0') out += String.fromCharCode(parseInt(piece.slice(2) || '0', OCTAL))
    else if (piece[1] === 'x') out += String.fromCharCode(parseInt(piece.slice(2), HEX))
    else out += ESCAPES[piece[1]]
  }
  return { text: out, stopped: false }
}

/** @param {CommandContext} context @returns {CommandOutput} */
const echo = ({ argv }) => {
  let at = 0
  const flags = { newline: true, escapes: false }
  for (; at < argv.length && ECHO_OPTION.test(argv[at]); at += 1) {
    for (const letter of argv[at].slice(1)) {
      if (letter === 'n') flags.newline = false
      else flags.escapes = letter === 'e'
    }
  }
  const joined = argv.slice(at).join(' ')
  const { text, stopped } = flags.escapes ? unescape(joined) : { text: joined, stopped: false }
  return { stdout: flags.newline && !stopped ? withNewline(text) : text }
}

// head and tail: -n N lines or -c N bytes; a sign changes which end N counts from
const AMOUNT = /^([+-]?)(\d+)$/

/** @param {string | undefined} value @returns {Amount | null} */
const amountOf = (value) => {
  const match = AMOUNT.exec(value ?? '')
  return match ? { sign: /** @type {Amount['sign']} */ (match[1]), count: Number(match[2]) } : null
}

/**
 * head keeps the first N items, or with -N all but the last N.
 * @template {{ length: number, slice: (start: number, end?: number) => any }} T
 * @param {T} items @param {Amount} amount @returns {T}
 */
const headOf = (items, { sign, count }) => (sign === '-' ? items.slice(0, Math.max(0, items.length - count)) : items.slice(0, count))

/**
 * tail keeps the last N items, or with +N everything from the Nth on.
 * @template {{ length: number, slice: (start: number, end?: number) => any }} T
 * @param {T} items @param {Amount} amount @returns {T}
 */
const tailOf = (items, { sign, count }) => (sign === '+' ? items.slice(Math.max(0, count - 1)) : items.slice(items.length - Math.min(count, items.length)))

/** @param {string} name */
const endsSpec = (name) => Object.freeze({ name, values: 'nc', long: { lines: 'n', bytes: 'c' }, numeric: 'n' })
const ENDS = Object.freeze({ head: { spec: endsSpec('head'), pick: headOf }, tail: { spec: endsSpec('tail'), pick: tailOf } })

/** @param {CommandContext} context @returns {CommandOutput} */
const ends = ({ argv, name, fs, cwd, stdin }) => {
  const { spec, pick } = ENDS[/** @type {'head' | 'tail'} */ (name)]
  const parsed = options(argv, spec)
  if (!('operands' in parsed)) return parsed
  // GNU checks each count as it reads it, and counts in the unit of whichever of -n and -c came last
  const given = Object.entries(parsed.values)
  const bad = given.find(([, value]) => !amountOf(value))
  if (bad) return { stderr: [`${name}: invalid number of ${bad[0] === 'c' ? 'bytes' : 'lines'}: '${bad[1]}'`], code: 1 }
  const [unit, value] = given.at(-1) ?? ['n', String(DEFAULT_LINES)]
  const bytes = unit === 'c'
  const amount = /** @type {Amount} */ (amountOf(value))
  const vfs = fs.vfs()
  const operands = inputsOf(parsed.operands)
  /** @type {string[]} */
  const stderr = []
  /** @type {string[]} */
  const parts = []
  for (const typed of operands) {
    const input = readInput(vfs, typed, { cwd, stdin })
    if (!input.ok) {
      const wording = 'errno' in input && input.errno === 'EISDIR' ? `error reading '${typed}'` : `cannot open '${typed}' for reading`
      stderr.push(readError(name, typed, input, (_, reason) => `${name}: ${wording}: ${reason}`))
      continue
    }
    const picked = bytes ? textOf(pick(bytesOf(input.text), amount)) : pick(linesOf(input.text), amount).join('')
    const header = operands.length > 1 ? `${parts.length ? '\n' : ''}==> ${typed === STDIN ? STDIN_NAME : typed} <==\n` : ''
    parts.push(header + picked)
  }
  return { stdout: parts.join(''), stderr, code: stderr.length ? 1 : 0 }
}

// wc: the counts it prints, in GNU's column order
const WC_SPEC = Object.freeze({ name: 'wc', flags: 'lwcm', long: { lines: 'l', words: 'w', bytes: 'c', chars: 'm' } })
const WC_COLUMNS = Object.freeze(['l', 'w', 'm', 'c'])
const WC_DEFAULT = Object.freeze(['l', 'w', 'c'])

/** @param {string} text @returns {Record<string, number>} */
const countsOf = (text) => ({
  l: (text.match(/\n/g) ?? []).length,
  w: text.split(/\s+/).filter(Boolean).length,
  m: characterCount(text),
  c: byteCount(text),
})

/** @param {Input} input */
const isFolder = (input) => !input.ok && 'errno' in input && input.errno === 'EISDIR'

/**
 * GNU's column width: as wide as the files' total size, at least 7 when a pipe or folder is read, and 1 when there
 * is only one number to print or the first file is missing.
 * @param {{ input: Input, typed: string }[]} read @param {number} columns
 */
const wcWidth = (read, columns) => {
  if ((read.length === 1 && columns === 1) || (!read[0].input.ok && !isFolder(read[0].input))) return 1
  const special = read.some(({ input, typed }) => (input.ok && typed === STDIN) || isFolder(input))
  const total = read.reduce((sum, { input }) => sum + (input.ok ? byteCount(input.text) : 0), 0)
  return Math.max(String(total).length, special ? WC_STDIN_WIDTH : 1)
}

/** @param {CommandContext} context @returns {CommandOutput} */
const wc = ({ argv, fs, cwd, stdin }) => {
  const parsed = options(argv, WC_SPEC)
  if (!('operands' in parsed)) return parsed
  const columns = WC_COLUMNS.filter((letter) => parsed.flags[letter])
  const shown = columns.length ? columns : WC_DEFAULT
  const vfs = fs.vfs()
  const read = inputsOf(parsed.operands).map((typed) => ({ typed, input: readInput(vfs, typed, { cwd, stdin }) }))
  const width = wcWidth(read, shown.length)
  const stderr = []
  const rows = []
  const totals = countsOf('')
  const row = (/** @type {Record<string, number>} */ counts, /** @type {string} */ label) =>
    [shown.map((letter) => String(counts[letter]).padStart(width)).join(' '), ...(label ? [label] : [])].join(' ')
  for (const { typed, input } of read) {
    if (!input.ok) stderr.push(readError('wc', typed, input, (_, reason) => `wc: ${typed}: ${reason}`))
    // A folder still gets its row of zeros
    if (!input.ok && !isFolder(input)) continue
    const counts = countsOf(input.ok ? input.text : '')
    WC_COLUMNS.forEach((letter) => (totals[letter] += counts[letter]))
    rows.push(row(counts, parsed.operands.length ? typed : ''))
  }
  if (read.length > 1) rows.push(row(totals, 'total'))
  return { stdout: rows.map(withNewline).join(''), stderr, code: stderr.length ? 1 : 0 }
}

// grep: patterns are JavaScript regular expressions, close to grep -E (Claude's call 5)
const GREP_SPEC = Object.freeze({ name: 'grep', flags: 'invclrRwFE', usageCode: TROUBLE })
const REGEX_SPECIALS = /[\\^$.*+?()[\]{}|/]/g
// -w's word characters: letters and digits in any script, and _, as GNU grep has them in a UTF-8 locale
const WORD_CHARACTER = '[\\p{L}\\p{N}_]'

/** @param {string} source @param {string} flags @returns {RegExp | null} */
const compileRegex = (source, flags) => {
  try {
    return new RegExp(source, flags)
  } catch (error) {
    if (error instanceof SyntaxError) return null
    throw error
  }
}

/**
 * @param {string} pattern @param {ParsedOptions['flags']} flags
 * @returns {RegExp | null} null when the pattern isn't a regular expression
 */
const grepRegex = (pattern, flags) => {
  const source = flags.F ? pattern.replace(REGEX_SPECIALS, '\\$&') : pattern
  const ignoreCase = flags.i ? 'i' : ''
  if (!flags.w) return compileRegex(source, ignoreCase)
  // \p{…} needs the u flag, which rejects some patterns grep takes, like ] and \-; those keep ASCII word edges
  return (
    compileRegex(`(?<!${WORD_CHARACTER})(?:${source})(?!${WORD_CHARACTER})`, `${ignoreCase}u`) ??
    compileRegex(`(?<!\\w)(?:${source})(?!\\w)`, ignoreCase)
  )
}

/**
 * The files under a folder grep -r reads, in the shell's order. -r skips the links it meets; -R follows them, each
 * real folder once, so a loop ends.
 * @param {Vfs} vfs @param {{ typed: string, real: string }} root @param {boolean} follow
 * @returns {Searched[]}
 */
const walkFolder = (vfs, root, follow) => {
  const seen = new Set()
  /** @param {string} folder @param {string} shown @returns {Searched[]} */
  const walk = (folder, shown) => {
    if (seen.has(folder)) return []
    seen.add(folder)
    return shellChildren(vfs, folder).flatMap((path) => {
      const name = shown ? inside(shown, nameOf(path)) : nameOf(path)
      if (vfs[path].type === NODE_TYPES.SYMLINK && !follow) return []
      const found = resolve(vfs, path, { followLast: true })
      if (!found.ok) return []
      const node = vfs[found.path]
      if (node.type === NODE_TYPES.DIR) return walk(found.path, name)
      return 'text' in node ? [{ name, text: node.text }] : []
    })
  }
  return walk(root.real, root.typed)
}

/**
 * What grep reads for one operand, with -r a folder's files too.
 * @param {string} typed @param {ParsedOptions['flags']} flags @param {CommandContext} context
 * @returns {{ files: Searched[], walked: boolean } | { error: string }}
 */
const grepTargets = (typed, flags, { fs, cwd, stdin }) => {
  if (typed === STDIN) return { files: [{ name: '(standard input)', text: stdin ?? '' }], walked: false }
  const vfs = fs.vfs()
  // A folder deleted from under the shell still searches, as nothing
  if (!typed && !vfs[cwd]) return { files: [], walked: true }
  const found = resolve(vfs, normalize(typed || '.', cwd), { followLast: true })
  if (!found.ok) return { error: `grep: ${typed}: ${errnoText(found.errno)}` }
  const node = vfs[found.path]
  const recursive = flags.r || flags.R
  if (node.type === NODE_TYPES.DIR && !recursive) return { error: `grep: ${typed}: Is a directory` }
  if (node.type === NODE_TYPES.DIR) return { files: walkFolder(vfs, { typed, real: found.path }, Boolean(flags.R)), walked: true }
  // The song never matches: there is no text in it to search
  return { files: 'text' in node ? [{ name: typed, text: node.text }] : [], walked: false }
}

/**
 * What grep prints for one file, and whether anything in it was selected.
 * @param {Searched} file @param {RegExp} regex @param {ParsedOptions['flags']} flags @param {boolean} named
 */
const grepFile = ({ name, text }, regex, flags, named) => {
  const prefix = named ? `${name}:` : ''
  const selected = rowsOf(text).flatMap((line, index) => (regex.test(line) !== Boolean(flags.v) ? [{ line, number: index + 1 }] : []))
  if (flags.l) return { lines: selected.length ? [name] : [], matched: selected.length > 0 }
  if (flags.c) return { lines: [`${prefix}${selected.length}`], matched: selected.length > 0 }
  return { lines: selected.map(({ line, number }) => `${prefix}${flags.n ? `${number}:` : ''}${line}`), matched: selected.length > 0 }
}

/** @param {CommandContext} context @returns {CommandOutput} */
const grep = (context) => {
  const parsed = options(context.argv, GREP_SPEC)
  if (!('operands' in parsed)) return parsed
  const [pattern, ...operands] = parsed.operands
  if (pattern === undefined) return { stderr: ['Usage: grep [OPTION]... PATTERNS [FILE]...', "Try 'grep --help' for more information."], code: TROUBLE }
  const regex = grepRegex(pattern, parsed.flags)
  if (!regex) return { stderr: ['grep: Invalid regular expression'], code: TROUBLE }
  // -r with no file searches here, naming what it finds without a leading ./
  const recursive = parsed.flags.r || parsed.flags.R
  const targets = (operands.length ? operands : [recursive ? '' : STDIN]).map((typed) => grepTargets(typed, parsed.flags, context))
  const stderr = targets.flatMap((target) => ('error' in target ? [target.error] : []))
  const found = targets.flatMap((target) => ('files' in target ? [target] : []))
  const named = operands.length > 1 || found.some((target) => target.walked)
  const results = found.flatMap((target) => target.files).map((file) => grepFile(file, regex, parsed.flags, named))
  const matched = results.some((one) => one.matched)
  return {
    stdout: results.flatMap((one) => one.lines).map(withNewline).join(''),
    stderr,
    code: stderr.length ? TROUBLE : matched ? 0 : NO_MATCH,
  }
}

// sort: the locale's order, as en_US.UTF-8 sorts
const SORT_SPEC = Object.freeze({ name: 'sort', flags: 'rnuf' })
const LEADING_NUMBER = /^\s*-?(\d+\.?\d*|\.\d+)/

/** @param {string} a @param {string} b */
const collate = (a, b) => a.localeCompare(b, 'en')

/** A line's number for -n: its leading number, or 0 when it has none. @param {string} line */
const numberOf = (line) => {
  const match = LEADING_NUMBER.exec(line)
  return match ? Number(match[0]) : 0
}

/**
 * The key order -n and -f set; GNU breaks a tie by the whole line unless -u.
 * @param {ParsedOptions['flags']} flags
 * @returns {(a: string, b: string) => number}
 */
const keyOrder = (flags) => {
  if (flags.n) return (a, b) => numberOf(a) - numberOf(b)
  return flags.f ? (a, b) => collate(a.toUpperCase(), b.toUpperCase()) : collate
}

/**
 * Every operand's lines, or the first one sort can't read: it stops there.
 * @param {string[]} operands @param {CommandContext} context
 * @returns {{ lines: string[] } | { error: string }}
 */
const sortInput = (operands, { fs, cwd, stdin }) => {
  const vfs = fs.vfs()
  const lines = []
  for (const typed of inputsOf(operands)) {
    const input = readInput(vfs, typed, { cwd, stdin })
    if (!input.ok) {
      const wording = 'errno' in input && input.errno === 'EISDIR' ? 'read failed' : 'cannot read'
      return { error: readError('sort', typed, input, (_, reason) => `sort: ${wording}: ${typed}: ${reason}`) }
    }
    lines.push(...rowsOf(input.text))
  }
  return { lines }
}

/** @param {CommandContext} context @returns {CommandOutput} */
const sort = (context) => {
  const parsed = options(context.argv, SORT_SPEC)
  if (!('operands' in parsed)) return parsed
  const read = sortInput(parsed.operands, context)
  if ('error' in read) return { stderr: [read.error], code: TROUBLE }
  const { flags } = parsed
  const byKey = keyOrder(flags)
  const direction = flags.r ? -1 : 1
  const order = (/** @type {string} */ a, /** @type {string} */ b) => direction * (byKey(a, b) || (flags.u ? 0 : collate(a, b)))
  const sorted = [...read.lines].sort(order)
  // -u keeps the first of each run whose keys tie
  const kept = flags.u ? sorted.filter((line, index) => index === 0 || byKey(sorted[index - 1], line) !== 0) : sorted
  return { stdout: kept.map(withNewline).join('') }
}

// uniq: runs of equal adjacent lines; a second operand is the file to write, `-` for stdout
const UNIQ_SPEC = Object.freeze({ name: 'uniq', flags: 'cdui' })

/**
 * Adjacent equal lines grouped, each run by its first line.
 * @param {string[]} lines @param {boolean} ignoreCase
 * @returns {{ line: string, count: number }[]}
 */
const runsOf = (lines, ignoreCase) => {
  const same = (/** @type {string} */ a, /** @type {string} */ b) => (ignoreCase ? a.toLowerCase() === b.toLowerCase() : a === b)
  /** @type {{ line: string, count: number }[]} */
  const runs = []
  lines.forEach((line) => {
    const previous = runs[runs.length - 1]
    if (previous && same(previous.line, line)) previous.count += 1
    else runs.push({ line, count: 1 })
  })
  return runs
}

/** @param {CommandContext} context @returns {CommandOutput} */
const uniq = ({ argv, fs, cwd, stdin }) => {
  const parsed = options(argv, UNIQ_SPEC)
  if (!('operands' in parsed)) return parsed
  const [from = STDIN, to, extra] = parsed.operands
  if (extra !== undefined) return missing('uniq', `extra operand '${extra}'`)
  const input = readInput(fs.vfs(), from, { cwd, stdin })
  if (!input.ok) return { stderr: [readError('uniq', from, input, (_, reason) => `uniq: ${from}: ${reason}`)], code: 1 }
  const { flags } = parsed
  const runs = runsOf(rowsOf(input.text), Boolean(flags.i)).filter(({ count }) => !(flags.d && count === 1) && !(flags.u && count > 1))
  const text = runs.map(({ line, count }) => withNewline(flags.c ? `${String(count).padStart(UNIQ_COUNT_WIDTH)} ${line}` : line)).join('')
  if (to === undefined || to === STDIN) return { stdout: text }
  const written = fs.apply(writeFile, { path: normalize(to, cwd), text })
  return written.ok ? {} : { stderr: [`uniq: ${to}: ${why(written)}`], code: 1 }
}

// less's options that take a value, from the rest of their word or else the next one (`-pBio`, `-p Bio`)
const LESS_VALUED = /[bhjkoOpPtTxyz#]/

/**
 * The files less shows: the words after its leading options (`-N`, `+G`, `--LINE-NUMBERS`) and a `--` that ends them.
 * @param {readonly string[]} argv
 */
const lessFiles = (argv) => {
  for (let at = 0; at < argv.length; at += 1) {
    const word = argv[at]
    if (word === '--') return argv.slice(at + 1)
    if (word.length < 2 || !'-+'.includes(word[0])) return argv.slice(at)
    const valued = word[0] === '-' && word[1] !== '-' ? word.slice(1).search(LESS_VALUED) : -1
    if (valued >= 0 && valued === word.length - 2) at += 1
  }
  return []
}

/**
 * less prints its files straight to the screen, the way cat does (`c-less`); its errors are less's own.
 * @param {CommandContext} context @returns {CommandOutput}
 */
const less = ({ argv, fs, cwd, stdin }) => {
  const files = lessFiles(argv)
  if (!files.length && stdin === null) return { stderr: ['Missing filename ("less --help" for help)'], code: 1 }
  const vfs = fs.vfs()
  const stderr = []
  let text = ''
  for (const typed of inputsOf(files)) {
    const message = homeFileMessage(vfs, typed, cwd)
    /** @type {Input} */
    const input = message ? { ok: true, text: message } : readInput(vfs, typed, { cwd, stdin })
    if (input.ok) text += input.text
    else stderr.push(readError('less', typed, input, (_, reason) => (reason === errnoText('EISDIR') ? `${typed} is a directory` : `${typed}: ${reason}`)))
  }
  return { stdout: text, stderr, code: stderr.length ? 1 : 0 }
}

export const textCommands = Object.freeze({ echo, head: ends, tail: ends, wc, grep, sort, uniq, less })
