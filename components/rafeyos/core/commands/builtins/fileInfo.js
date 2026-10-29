// @ts-check
// What the file commands share: walking the tree in the shell's order, naming paths the way they were typed, and the
// facts `ls -l` and `stat` print (modes, owners, sizes, dates) in GNU's layout.
import { NODE_TYPES, ROOT } from '@/components/rafeyos/core/vfs/buildVfs'
import { parentOf, resolve } from '@/components/rafeyos/core/vfs/paths'
import { errnoText, failureErrno } from '@/components/rafeyos/core/commands/errors'
import { shellCollate } from '@/components/rafeyos/core/commands/expand'

/**
 * @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs'
 * @import { FsCommitResult } from '@/components/rafeyos/core/vfs/fsStore'
 * @import { OptionError } from '@/components/rafeyos/core/commands/options'
 * @import { CommandOutput } from './result'
 */

/** @typedef {NonNullable<ReturnType<typeof import('@/components/rafeyos/core/vfs/queries').statOf>>} Facts */

/** @type {Readonly<Record<string, number>>} */
const IDS = Object.freeze({ root: 0, rafey: 1000, visitor: 1001 })
const MONTHS = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
// GNU ls shows the time of day for anything changed in the last half Gregorian year, the year otherwise
const HALF_YEAR_MS = (31556952 / 2) * 1000
const BLOCK_BYTES = 4096
const KIBI = 1024
const HUMAN_UNITS = Object.freeze(['K', 'M', 'G', 'T'])
// stat's fixed facts: the one disk everything lives on
const DEVICE = '8,1'
const INODE_BASE = 100000
const INODE_SPAN = 900000
const SAFE_NAME = /^[\w./@%+=:,~^-]+$/

/** @param {string} path */
export const nameOf = (path) => (path === ROOT ? ROOT : path.slice(path.lastIndexOf('/') + 1))

/** @param {Vfs} vfs @param {string} path the folder a path leads to through links, or null */
export const folderAt = (vfs, path) => {
  const found = resolve(vfs, path, { followLast: true })
  return found.ok && vfs[found.path]?.type === NODE_TYPES.DIR ? found.path : null
}

/** @param {Vfs} vfs @param {string} folder a real folder path: its children, in the shell's name order */
export const shellChildren = (vfs, folder) =>
  Object.keys(vfs)
    .filter((path) => path !== folder && parentOf(path) === folder)
    .sort((a, b) => shellCollate(nameOf(a), nameOf(b)))

/**
 * A path and everything under it, parents first; links are not followed.
 * @param {Vfs} vfs @param {string} path a real path
 * @returns {string[]}
 */
export const subtree = (vfs, path) =>
  vfs[path]?.type === NODE_TYPES.DIR ? [path, ...shellChildren(vfs, path).flatMap((child) => subtree(vfs, child))] : [path]

/**
 * `path` (a real path under `real`) spelled from what was typed for `real`.
 * @param {{ typed: string, real: string }} root
 * @param {string} path
 */
export const spelled = ({ typed, real }, path) => (path === real ? typed : inside(typed, path.slice(real === ROOT ? 1 : real.length + 1)))

/** `name` inside the typed folder `typed`. @param {string} typed @param {string} name */
export const inside = (typed, name) => (typed.endsWith('/') ? typed + name : `${typed}/${name}`)

/** The last name in a typed path, trailing slashes aside. @param {string} typed */
export const baseName = (typed) => {
  const trimmed = typed.replace(/\/+$/, '')
  return trimmed ? trimmed.slice(trimmed.lastIndexOf('/') + 1) : ROOT
}

/** The command's usage error, as parseOptions words it. @param {OptionError} error @returns {CommandOutput} */
export const usage = (error) => ({ stderr: error.error, code: error.code })

/**
 * A missing operand, with getopt's hint.
 * @param {string} name @param {string} message
 * @returns {CommandOutput}
 */
export const missing = (name, message) => ({ stderr: [`${name}: ${message}`, `Try '${name} --help' for more information.`], code: 1 })

/** What a failed store call reads as. @param {Exclude<FsCommitResult, { ok: true }>} failure */
export const why = (failure) => errnoText(failureErrno(failure))

/** @param {Facts} facts 1K blocks, as ls -l totals them */
const kilobytesOf = (facts) => (facts.type === NODE_TYPES.SYMLINK ? 0 : Math.ceil(facts.size / BLOCK_BYTES) * (BLOCK_BYTES / KIBI))

/**
 * GNU's -h: powers of 1024 rounded up, one decimal below 10.
 * @param {number} bytes
 */
export const humanSize = (bytes) => {
  if (bytes < KIBI) return String(bytes)
  let value = bytes
  let unit = -1
  while (value >= KIBI && unit < HUMAN_UNITS.length - 1) {
    value /= KIBI
    unit += 1
  }
  const shown = value < 10 ? (Math.ceil(value * 10) / 10).toFixed(1) : String(Math.ceil(value))
  return `${shown}${HUMAN_UNITS[unit]}`
}

/** @param {number} value */
const two = (value) => String(value).padStart(2, '0')

/**
 * `Oct  1 00:00`, or `Jan  1  2024` for anything older than half a year or in the future.
 * @param {number} mtime @param {number} now
 */
const listingDate = (mtime, now) => {
  const date = new Date(mtime)
  const age = now - mtime
  const tail = age >= 0 && age < HALF_YEAR_MS ? `${two(date.getHours())}:${two(date.getMinutes())}` : ` ${date.getFullYear()}`
  return `${MONTHS[date.getMonth()]} ${String(date.getDate()).padStart(2, ' ')} ${tail}`
}

/**
 * `ls -l` rows, columns padded as GNU pads them, with the folder's `total` line when `total` is set.
 * @param {{ name: string, facts: Facts }[]} rows
 * @param {{ now: number, human: boolean, total: boolean }} options
 */
export const longListing = (rows, { now, human, total }) => {
  const size = (/** @type {Facts} */ facts) => (human ? humanSize(facts.size) : String(facts.size))
  const width = (/** @type {(facts: Facts) => string} */ field) => Math.max(0, ...rows.map((row) => field(row.facts).length))
  const widths = { links: width((f) => String(f.nlink)), owner: width((f) => f.owner), group: width((f) => f.group), size: width(size) }
  const lines = rows.map(({ name, facts }) =>
    [
      facts.mode,
      String(facts.nlink).padStart(widths.links),
      facts.owner.padEnd(widths.owner),
      facts.group.padEnd(widths.group),
      size(facts).padStart(widths.size),
      listingDate(facts.mtime, now),
      facts.target === undefined ? name : `${name} -> ${facts.target}`,
    ].join(' '),
  )
  if (!total) return lines
  const kilobytes = rows.reduce((sum, row) => sum + kilobytesOf(row.facts), 0)
  return [`total ${human ? humanSize(kilobytes * KIBI) : kilobytes}`, ...lines]
}

/** `0644` from `-rw-r--r--`, `1777` from `drwxrwxrwt`. @param {string} mode */
const octalMode = (mode) => {
  const bits = [...mode.slice(1)].map((char) => (char === '-' ? 0 : 1))
  const sticky = mode.endsWith('t') ? 1 : 0
  const digits = [0, 3, 6].map((at) => bits[at] * 4 + bits[at + 1] * 2 + bits[at + 2])
  return `${sticky}${digits.join('')}`
}

/** @param {number} mtime */
const statTime = (mtime) => {
  const date = new Date(mtime)
  const offset = -date.getTimezoneOffset()
  const zone = `${offset < 0 ? '-' : '+'}${two(Math.floor(Math.abs(offset) / 60))}${two(Math.abs(offset) % 60)}`
  const day = `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
  const time = `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`
  return `${day} ${time}.${String(date.getMilliseconds()).padStart(3, '0')}000000 ${zone}`
}

/** A stable made-up inode, so the same path always shows the same number. @param {string} path */
const inodeOf = (path) => [...path].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7) % INODE_SPAN + INODE_BASE

/** @param {Facts} facts */
const kindText = (facts) => {
  if (facts.type === NODE_TYPES.DIR) return 'directory'
  if (facts.type === NODE_TYPES.SYMLINK) return 'symbolic link'
  return facts.size ? 'regular file' : 'regular empty file'
}

/** A name as stat's %N quotes it: bare when the shell would read it as one word. @param {string} name */
const quoted = (name) => (SAFE_NAME.test(name) ? name : `'${name.replaceAll("'", "'\\''")}'`)

/** @param {string} owner */
const idOf = (owner) => String(IDS[owner] ?? 0).padStart(5)

/**
 * GNU stat's default block for one path.
 * @param {string} typed the name as typed
 * @param {string} path its real path
 * @param {Facts} facts
 */
export const statBlock = (typed, path, facts) => {
  const name = facts.target === undefined ? quoted(typed) : `${quoted(typed)} -> ${quoted(facts.target)}`
  const time = statTime(facts.mtime)
  const blocks = kilobytesOf(facts) * 2
  return [
    `  File: ${name}`,
    `  Size: ${String(facts.size).padEnd(10)}\tBlocks: ${String(blocks).padEnd(10)} IO Block: ${String(BLOCK_BYTES).padEnd(6)} ${kindText(facts)}`,
    `Device: ${DEVICE}\tInode: ${String(inodeOf(path)).padEnd(11)} Links: ${facts.nlink}`,
    `Access: (${octalMode(facts.mode)}/${facts.mode})  Uid: (${idOf(facts.owner)}/${facts.owner.padStart(8)})   Gid: (${idOf(facts.group)}/${facts.group.padStart(8)})`,
    `Access: ${time}`,
    `Modify: ${time}`,
    `Change: ${time}`,
    ' Birth: -',
  ].join('\n')
}
