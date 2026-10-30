// @ts-check
// The shell's way into the filesystem: the tree as it is right now, and the fsOps calls that change it. Every call
// goes through the store against the freshest state, so a command sees what the one before it did, and the GUI sees
// every change the moment it lands.
import { mergeState } from './fsState'

/**
 * @import { Vfs } from './buildVfs'
 * @import { FsState } from './fsState'
 * @import { FsOpResult } from './fsOps'
 * @import { FsCommitResult, FsStore } from './fsStore'
 */

/**
 * One of fsOps' calls.
 * @template A
 * @typedef {(vfs: Vfs, state: FsState, args: A, now: number) => FsOpResult} FsOp
 */

/** @typedef {{ ok: true } | { ok: false, errno: import('./fsOps').Errno, path: string }} FsCheckResult */

/**
 * @typedef {Readonly<{
 *   vfs: () => Vfs,
 *   apply: <A>(op: FsOp<A>, args: A) => FsCommitResult,
 *   check: <A>(op: FsOp<A>, args: A) => FsCheckResult,
 * }>} ShellFs
 */

// A dry run changes nothing, so its timestamp is never seen
const DRY_RUN_TIME = 0

/**
 * @param {{ base: Vfs, store: Pick<FsStore, 'getState' | 'commit'> }} deps base is the shipped tree
 * @returns {ShellFs}
 */
export const createShellFs = ({ base, store }) => {
  /** @type {FsState | null} */
  let seen = null
  /** @type {Vfs} */
  let merged = base

  /** The merged tree, rebuilt only when the store's state changes. */
  const vfs = () => {
    const state = store.getState()
    if (state !== seen) {
      seen = state
      merged = mergeState(base, state)
    }
    return merged
  }

  return Object.freeze({
    vfs,
    /** Runs `op` through the store, which persists it (or keeps it in memory, for /tmp). */
    apply: (op, args) => store.commit((state, now) => op(mergeState(base, state), state, args, now)),
    /** Whether `op` would succeed now, without changing anything: how `>>` opens its file before the command runs. */
    check: (op, args) => {
      const result = op(vfs(), store.getState(), args, DRY_RUN_TIME)
      return result.ok ? { ok: true } : { ok: false, errno: result.errno, path: result.path }
    },
  })
}
