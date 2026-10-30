// @ts-check
// Tab completion, read with the same tokenizer the shell runs. The word being typed (the last one) completes wherever
// it sits on the line: after `|`, `&&`, `||` or `;`, and inside a quote left open. The first word of a command
// completes to a command name; any other word to a path, through links, with `~/` as the visitor's home and the
// window's `$VARS` filled in where they name the folder. As readline does, `.` and `..` count once a dot is typed.
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { normalize, resolve } from '@/components/rafeyos/core/vfs/paths'
import { children, isDir } from '@/components/rafeyos/core/vfs/queries'
import { expandVariables } from './expand'
import { tokenize } from './tokenize'

/**
 * @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs'
 * @import { ExpandContext } from './expand'
 * @import { Part, Token } from './tokenize'
 */

/**
 * @typedef {{ fill: string, shown: string }} Candidate what the word becomes, and how a list of matches shows it
 * @typedef {ExpandContext & { commands: readonly string[], tabCount: number }} CompleteContext
 * @typedef {{ text: string, parts: Part[], quote: string, isCommand: boolean }} TypedWord
 */

const QUOTES = ["'", '"']
// Stands in for the cursor: it glues onto the word it touches, so the last token is the word being typed
const CURSOR = '\u0000'
const COMMAND_STARTS = new Set(['|', '&&', '||', ';'])
// What a filled-in name needs a backslash before: outside quotes, and inside double quotes
const SPECIAL_BARE = /[\s'"\\|&;()<>$`*?#!{}[\]~]/g
const SPECIAL_DOUBLE = /["\\$`]/g
// What a typed name starting with a dot can also be
const DOT_FOLDERS = ['./', '../']

/**
 * The word being typed: its text with quotes settled, the quote left open ('' for none), and whether it is a command
 * name. Null when the cursor is not in a word (a comment ate it) or the line ends in a lone backslash.
 * @param {string} input
 * @returns {TypedWord | null}
 */
const wordAtCursor = (input) => {
  const quote = tokenize(input).ok ? '' : QUOTES.find((mark) => tokenize(input + mark).ok)
  if (quote === undefined) return null
  const result = tokenize(input + CURSOR + quote)
  if (!result.ok) return null
  const { tokens } = result
  const last = tokens[tokens.length - 1]
  const lastPart = last?.type === 'word' ? last.parts[last.parts.length - 1] : null
  // Outside quotes a cursor in a 'single' part was escaped by a trailing backslash
  if (!lastPart?.text.endsWith(CURSOR) || (!quote && lastPart.quoted === 'single')) return null
  const word = /** @type {Extract<Token, { type: 'word' }>} */ (last)
  const before = tokens[tokens.length - 2]
  return {
    text: word.parts.map((part) => part.text).join('').slice(0, -CURSOR.length),
    parts: word.parts,
    quote,
    isCommand: !before || (before.type === 'op' && COMMAND_STARTS.has(before.op)),
  }
}

/**
 * The folder a typed directory part names, through links; null when it is not one.
 * @param {Vfs} vfs @param {string} dirPart @param {string} cwd
 */
const folderAt = (vfs, dirPart, cwd) => {
  const typed = dirPart.startsWith('~/') ? HOME + dirPart.slice(1) : dirPart
  const resolved = resolve(vfs, normalize(typed, cwd), { followLast: true })
  return resolved.ok && vfs[resolved.path]?.type === 'dir' ? resolved.path : null
}

/**
 * The first `length` characters of the word with their variables filled in; single-quoted and escaped text stays
 * as typed.
 * @param {Part[]} parts @param {number} length @param {ExpandContext} context
 */
const expandedPrefix = (parts, length, context) => {
  let left = length
  return parts
    .map((part) => {
      const text = part.text.slice(0, Math.max(0, left))
      left -= part.text.length
      return part.quoted === 'single' ? text : expandVariables(text, context)
    })
    .join('')
}

/**
 * Names in the typed folder that start with the typed rest; dotfiles, `./` and `../` only when that rest starts with
 * a dot. The folder part is looked up expanded but filled in as typed.
 * @param {TypedWord} word @param {CompleteContext} context
 * @returns {Candidate[]}
 */
const pathCandidates = ({ text, parts }, context) => {
  const { vfs } = context
  const slash = text.lastIndexOf('/')
  const dirPart = text.slice(0, slash + 1)
  const base = text.slice(slash + 1)
  const folder = folderAt(vfs, expandedPrefix(parts, dirPart.length, context), context.cwd)
  if (!folder) return []
  const dots = base.startsWith('.') ? DOT_FOLDERS.filter((shown) => shown.startsWith(base)) : []
  const names = children(vfs, folder)
    .filter((path) => {
      const { name } = vfs[path]
      return name.startsWith(base) && (base.startsWith('.') || !name.startsWith('.'))
    })
    .map((path) => vfs[path].name + (isDir(vfs, path) ? '/' : ''))
  return [...dots, ...names].map((shown) => ({ fill: dirPart + shown, shown }))
}

/**
 * The text that finishes the word, quoted the way the word was: a folder keeps the word open for its contents,
 * anything else closes any open quote and ends the word.
 * @param {string} rest what the match adds to the typed word @param {string} quote the open quote, '' for none
 */
const finish = (rest, quote) => {
  const escaped =
    quote === "'" ? rest.replaceAll("'", "'\\''") : rest.replace(quote ? SPECIAL_DOUBLE : SPECIAL_BARE, '\\$&')
  return escaped + (rest.endsWith('/') ? '' : `${quote} `)
}

/**
 * Tab completion. A unique match fills in (folders get "/", everything else a space);
 * several matches are listed only on the second consecutive tab.
 * @param {string} input
 * @param {CompleteContext} context
 * @returns {{ value: string } | { list: string[] }}
 */
export const complete = (input, context) => {
  const word = wordAtCursor(input)
  if (!word) return { value: input }
  const candidates = word.isCommand
    ? context.commands.filter((name) => name.startsWith(word.text)).map((name) => ({ fill: name, shown: name }))
    : pathCandidates(word, context)
  if (candidates.length === 1) return { value: input + finish(candidates[0].fill.slice(word.text.length), word.quote) }
  if (candidates.length > 1 && context.tabCount > 1) return { list: candidates.map(({ shown }) => shown) }
  return { value: input }
}
