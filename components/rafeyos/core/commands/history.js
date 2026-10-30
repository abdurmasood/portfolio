// @ts-check
// Bash's history file: every terminal records its lines in the visitor's ~/.bash_history, so `history` shows what
// other windows ran and a reload keeps it. The terminal records a line before running it, so `history` lists itself.
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { writeFile } from '@/components/rafeyos/core/vfs/fsOps'
import { joinPath, resolve } from '@/components/rafeyos/core/vfs/paths'

/**
 * @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs'
 * @import { FsState } from '@/components/rafeyos/core/vfs/fsState'
 * @import { FsOpResult } from '@/components/rafeyos/core/vfs/fsOps'
 */

export const HISTORY_FILE = joinPath(HOME, '.bash_history')

/** How many lines the file keeps, as bash's HISTSIZE and HISTFILESIZE default to. */
export const HISTSIZE = 500

/**
 * The file's lines, oldest first, read through a link; none when it is missing or isn't text.
 * @param {Vfs} vfs
 * @returns {string[]}
 */
export const historyLines = (vfs) => {
  const found = resolve(vfs, HISTORY_FILE, { followLast: true })
  const node = found.ok ? vfs[found.path] : undefined
  return node && 'text' in node ? node.text.split('\n').filter(Boolean) : []
}

/**
 * An fsOps call: appends `line` to the file and keeps only its last HISTSIZE lines.
 * @param {Vfs} vfs
 * @param {FsState} state
 * @param {{ line: string }} args
 * @param {number} now
 * @returns {FsOpResult}
 */
export const recordHistory = (vfs, state, { line }, now) => {
  const kept = [...historyLines(vfs), line].slice(-HISTSIZE)
  return writeFile(vfs, state, { path: HISTORY_FILE, text: kept.map((entry) => `${entry}\n`).join('') }, now)
}
