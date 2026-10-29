// @ts-check
// The last step before a command runs: turn each of its words into the arguments it receives. In order, as bash
// does: `~` at the start, then `$VAR`, `${VAR}`, `$?` and the other special parameters, then `*` and `?` against the
// tree. Only what the visitor typed bare can glob; a variable's value is used as it is, never split or globbed (the
// variables are fixed, and a folder name with a blank in $PWD should stay one argument).
import { HOME, ROOT } from '@/components/rafeyos/core/vfs/buildVfs'
import { joinPath, normalize, parentOf, resolve } from '@/components/rafeyos/core/vfs/paths'

/** @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs' */
/** @import { Part, Word } from './tokenize' */

/**
 * @typedef {{ env: Readonly<Record<string, string>>, cwd: string, vfs: Vfs, lastCode: number }} ExpandContext
 * @typedef {{ text: string, typed: boolean }} Piece a stretch of an expanded word; `typed` when it was typed bare, so
 *   its wildcards are live
 * @typedef {{ char: string, wild: boolean }} PatternChar
 * @typedef {{ shown: string, path: string }} Match the text the shell prints for a match, and the path it names
 */

const VARIABLE = /\$(?:\{([A-Za-z_]\w*|\d+|[?#$!@*-])\}|([A-Za-z_]\w*|[\d?#$!@*-]))/g
const POSITIONAL = /^\d+$/
// The special parameters of an interactive bash run with no arguments and no background jobs: `$0` is its name,
// `$$` a made-up process ID, `$-` its option flags, and `$1`…, `$@`, `$*` and `$!` are empty
const SPECIAL = Object.freeze({ '0': 'bash', '#': '0', $: '2817', '-': 'himBHs', '@': '', '*': '', '!': '' })
const WILDCARDS = new Set(['*', '?'])
const REGEX_SYNTAX = /[\\^$.*+?()[\]{}|/]/g

/**
 * The shell's name order, for globs, ls, tree and find: case ignored, folders not first.
 * @param {string} a @param {string} b
 */
export const shellCollate = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })

/** @param {string} name @param {ExpandContext} context */
const valueOf = (name, { env, lastCode }) => {
  if (name === '?') return String(lastCode)
  if (POSITIONAL.test(name)) return Number(name) === 0 ? SPECIAL['0'] : ''
  if (Object.hasOwn(SPECIAL, name)) return SPECIAL[/** @type {keyof typeof SPECIAL} */ (name)]
  return Object.hasOwn(env, name) ? env[name] : ''
}

/**
 * Whether a part is a double-quoted string holding `$@`: with no arguments it is no word at all, where `"$*"` or `""`
 * is one empty word.
 * @param {Part} part
 */
const holdsQuotedAt = (part) => part.quoted === 'double' && [...part.text.matchAll(VARIABLE)].some((match) => (match[1] ?? match[2]) === '@')

/**
 * `text` with its variables replaced; the replaced values never glob.
 * @param {string} text @param {boolean} typed @param {ExpandContext} context
 * @returns {Piece[]}
 */
const substitute = (text, typed, context) => {
  /** @type {Piece[]} */
  const pieces = []
  let from = 0
  for (const match of text.matchAll(VARIABLE)) {
    const at = match.index ?? 0
    pieces.push({ text: text.slice(from, at), typed }, { text: valueOf(match[1] ?? match[2], context), typed: false })
    from = at + match[0].length
  }
  pieces.push({ text: text.slice(from), typed })
  return pieces
}

/**
 * `~` alone or `~/…` at the start of an unquoted word is the home folder; `~name` stays as typed.
 * @param {Part[]} parts @param {ExpandContext} context
 * @returns {{ home: Piece[], parts: Part[] }}
 */
const expandTilde = (parts, { env }) => {
  const [first, ...rest] = parts
  const bare = first?.quoted === 'none' && ((first.text === '~' && !rest.length) || first.text.startsWith('~/'))
  if (!bare) return { home: [], parts }
  return { home: [{ text: env.HOME ?? HOME, typed: false }], parts: [{ text: first.text.slice(1), quoted: 'none' }, ...rest] }
}

/** @param {Part} part @param {ExpandContext} context @returns {Piece[]} */
const piecesOf = (part, context) =>
  part.quoted === 'single' ? [{ text: part.text, typed: false }] : substitute(part.text, part.quoted === 'none', context)

/** @param {Vfs} vfs @param {string} path */
const exists = (vfs, path) => resolve(vfs, path).ok

/** @param {Vfs} vfs @param {string} path */
const isFolder = (vfs, path) => {
  const resolved = resolve(vfs, path, { followLast: true })
  return resolved.ok && vfs[resolved.path]?.type === 'dir'
}

/** Names directly inside the folder `path` leads to (through links); none when it is not a folder. */
const namesIn = (/** @type {Vfs} */ vfs, /** @type {string} */ path) => {
  const resolved = resolve(vfs, path, { followLast: true })
  if (!resolved.ok || vfs[resolved.path]?.type !== 'dir') return []
  return Object.keys(vfs)
    .filter((key) => key !== resolved.path && parentOf(key) === resolved.path)
    .map((key) => key.slice(key.lastIndexOf('/') + 1))
}

/**
 * Tests a name against one segment of a pattern. A dotfile matches only a pattern that starts with a dot.
 * @param {PatternChar[]} segment
 * @returns {(name: string) => boolean}
 */
const segmentMatcher = (segment) => {
  const source = segment.map(({ char, wild }) => (wild ? (char === '*' ? '.*' : '.') : char.replace(REGEX_SYNTAX, '\\$&'))).join('')
  const regex = new RegExp(`^${source}$`, 'su')
  const dotted = segment[0]?.char === '.'
  return (name) => (dotted || !name.startsWith('.')) && regex.test(name)
}

/**
 * Where a match goes from one segment: a literal segment is followed as typed (the last one must exist); a
 * wildcard segment lists the folder. Before a further segment only folders carry on.
 * @param {Vfs} vfs @param {Match} match @param {PatternChar[]} segment @param {boolean} last
 * @returns {Match[]}
 */
const step = (vfs, match, segment, last) => {
  const slash = last ? '' : '/'
  if (!segment.some(({ wild }) => wild)) {
    const name = segment.map(({ char }) => char).join('')
    const path = normalize(name || '.', match.path)
    return last && !exists(vfs, path) ? [] : [{ shown: match.shown + name + slash, path }]
  }
  const matches = segmentMatcher(segment)
  return namesIn(vfs, match.path)
    .filter(matches)
    .map((name) => ({ shown: match.shown + name + slash, path: joinPath(match.path, name) }))
    .filter(({ path }) => last || isFolder(vfs, path))
}

/**
 * Every existing path a pattern names, spelled the way it was typed (relative stays relative).
 * @param {PatternChar[]} pattern @param {ExpandContext} context
 * @returns {string[]}
 */
const glob = (pattern, { cwd, vfs }) => {
  /** @type {PatternChar[][]} */
  const segments = [[]]
  pattern.forEach((patternChar) => {
    if (patternChar.char === '/') segments.push([])
    else segments[segments.length - 1].push(patternChar)
  })
  const absolute = pattern[0]?.char === '/'
  const walked = absolute ? segments.slice(1) : segments
  /** @type {Match[]} */
  const start = [absolute ? { shown: ROOT, path: ROOT } : { shown: '', path: cwd }]
  const matches = walked.reduce((found, segment, index) => found.flatMap((match) => step(vfs, match, segment, index === walked.length - 1)), start)
  return matches.map(({ shown }) => shown).sort(shellCollate)
}

/**
 * The arguments one word becomes. A word that comes to nothing is dropped when each of its quoted strings holds `$@`
 * (an unquoted one has none); a pattern that matches nothing stays as typed.
 * @param {Word} word
 * @param {ExpandContext} context
 * @returns {string[]}
 */
export const expandWord = (word, context) => {
  const { home, parts } = expandTilde(word.parts, context)
  const pieces = [...home, ...parts.flatMap((part) => piecesOf(part, context))]
  const text = pieces.map((piece) => piece.text).join('')
  if (!text && word.parts.filter((part) => part.quoted !== 'none').every(holdsQuotedAt)) return []
  const pattern = pieces.flatMap(({ text: pieceText, typed }) => [...pieceText].map((char) => ({ char, wild: typed && WILDCARDS.has(char) })))
  if (!pattern.some(({ wild }) => wild)) return [text]
  const matches = glob(pattern, context)
  return matches.length ? matches : [text]
}
