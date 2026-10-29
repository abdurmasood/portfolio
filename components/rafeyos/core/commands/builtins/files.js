// @ts-check
// Commands that change the filesystem: mkdir, rmdir, touch, rm, cp, mv, ln. Each operand is its own fsOps call
// through the store, so one refusal never stops the rest, and every message is coreutils' own wording.
import { NODE_TYPES, ROOT } from '@/components/rafeyos/core/vfs/buildVfs'
import { copy, mkdir, move, remove, symlink, touch } from '@/components/rafeyos/core/vfs/fsOps'
import { normalize, resolve } from '@/components/rafeyos/core/vfs/paths'
import { errnoText } from '@/components/rafeyos/core/commands/errors'
import { parseOptions } from '@/components/rafeyos/core/commands/options'
import { baseName, folderAt, inside, missing, spelled, subtree, usage, why } from './fileInfo'

/**
 * @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs'
 * @import { FsOpError } from '@/components/rafeyos/core/vfs/fsOps'
 * @import { FsCommitResult } from '@/components/rafeyos/core/vfs/fsStore'
 * @import { ParsedOptions } from '@/components/rafeyos/core/commands/options'
 * @import { CommandContext, CommandOutput } from './result'
 */

/**
 * @typedef {Exclude<FsCommitResult, { ok: true }>} Refusal
 * @typedef {{ out: string[], err: string[] }} Report what a command prints, in order, as it works through its operands
 * @typedef {{ from: string, to: string }} Pair a source and where it goes, both as typed
 */

/** @param {...string} lines @returns {Report} */
const failed = (...lines) => ({ out: [], err: lines })

/** @param {string[]} [lines] @returns {Report} */
const printed = (lines = []) => ({ out: lines, err: [] })

/** @param {Report[]} reports @returns {CommandOutput} */
const finish = (reports) => {
  const out = reports.flatMap((one) => one.out)
  const err = reports.flatMap((one) => one.err)
  return { stdout: out.map((line) => `${line}\n`).join(''), stderr: err, code: err.length ? 1 : 0 }
}

/**
 * @param {readonly string[]} argv
 * @param {string} name
 * @param {string} [flags]
 * @returns {ParsedOptions | CommandOutput}
 */
const options = (argv, name, flags = '') => {
  const parsed = parseOptions(argv, { name, flags })
  return 'error' in parsed ? usage(parsed) : parsed
}

/** @param {Vfs} vfs @param {string} path the node at a path, a link itself rather than its target */
const nodeAt = (vfs, path) => {
  const spot = resolve(vfs, path)
  return spot.ok ? { path: spot.path, node: vfs[spot.path] } : null
}

/** @param {Refusal} refusal */
const errnoOf = (refusal) => ('errno' in refusal ? refusal.errno : null)

/**
 * The typed prefixes of `typed` that don't exist yet: what mkdir -p is about to create.
 * @param {Vfs} vfs @param {string} typed @param {string} cwd
 */
const missingPrefixes = (vfs, typed, cwd) =>
  typed
    .split('/')
    .map((_, index, parts) => parts.slice(0, index + 1).join('/'))
    .filter((prefix) => prefix && !prefix.endsWith('/') && !resolve(vfs, normalize(prefix, cwd), { followLast: true }).ok)

/** @param {CommandContext} context @returns {CommandOutput} */
const mkdirCommand = ({ argv, fs, cwd }) => {
  const parsed = options(argv, 'mkdir', 'pv')
  if (!('operands' in parsed)) return parsed
  if (!parsed.operands.length) return missing('mkdir', 'missing operand')
  return finish(
    parsed.operands.map((typed) => {
      const made = parsed.flags.p ? missingPrefixes(fs.vfs(), typed, cwd) : [typed]
      const result = fs.apply(mkdir, { path: normalize(typed, cwd), parents: Boolean(parsed.flags.p) })
      if (result.ok) return printed(parsed.flags.v ? made.map((path) => `mkdir: created directory '${path}'`) : [])
      // mkdir -p names the folder on the way that it couldn't make
      const at = 'path' in result ? made.find((prefix) => normalize(prefix, cwd) === result.path) ?? typed : typed
      return failed(`mkdir: cannot create directory '${at}': ${why(result)}`)
    }),
  )
}

/** @param {CommandContext} context @returns {CommandOutput} */
const rmdirCommand = ({ argv, fs, cwd }) => {
  const parsed = options(argv, 'rmdir', 'v')
  if (!('operands' in parsed)) return parsed
  if (!parsed.operands.length) return missing('rmdir', 'missing operand')
  return finish(
    parsed.operands.map((typed) => {
      const result = fs.apply(remove, { path: normalize(typed, cwd), dirOnly: true })
      return {
        out: parsed.flags.v ? [`rmdir: removing directory, '${typed}'`] : [],
        err: result.ok ? [] : [`rmdir: failed to remove '${typed}': ${why(result)}`],
      }
    }),
  )
}

/** @param {CommandContext} context @returns {CommandOutput} */
const touchCommand = ({ argv, fs, cwd }) => {
  const parsed = options(argv, 'touch')
  if (!('operands' in parsed)) return parsed
  if (!parsed.operands.length) return missing('touch', 'missing file operand')
  return finish(
    parsed.operands.map((typed) => {
      const result = fs.apply(touch, { path: normalize(typed, cwd) })
      return result.ok ? printed() : failed(`touch: cannot touch '${typed}': ${why(result)}`)
    }),
  )
}

/**
 * What rm refuses before it tries: `.` and `..`, and `-r /`.
 * @param {string} typed @param {string} path @param {boolean} recursive
 * @returns {string[] | null}
 */
const rmGuard = (typed, path, recursive) => {
  const name = baseName(typed)
  if (name === '.' || name === '..') return [`rm: refusing to remove '.' or '..' directory: skipping '${typed}'`]
  if (recursive && path === ROOT) return [`rm: it is dangerous to operate recursively on '${typed}'`, 'rm: use --no-preserve-root to override this failsafe']
  return null
}

/**
 * rm -v's lines: what was there before and is gone now, each folder after what it held.
 * @param {{ before: Vfs, after: Vfs }} trees @param {{ typed: string, real: string }} root
 */
const removedLines = ({ before, after }, root) =>
  subtree(before, root.real)
    .reverse()
    .filter((path) => !after[path])
    .map((path) => `removed ${before[path].type === NODE_TYPES.DIR ? 'directory ' : ''}'${spelled(root, path)}'`)

/**
 * One rm operand.
 * @param {string} typed @param {ParsedOptions['flags']} flags @param {CommandContext} context
 * @returns {Report}
 */
const rmOne = (typed, flags, { fs, cwd }) => {
  const recursive = Boolean(flags.r || flags.R)
  const path = normalize(typed, cwd)
  const guard = rmGuard(typed, path, recursive)
  if (guard) return failed(...guard)
  const before = fs.vfs()
  const found = nodeAt(before, path)
  if (!found && flags.f) return printed()
  const isFolder = found?.node.type === NODE_TYPES.DIR
  if (isFolder && !recursive && !flags.d) return failed(`rm: cannot remove '${typed}': Is a directory`)
  const result = fs.apply(remove, { path, recursive, dirOnly: isFolder && !recursive })
  if (!result.ok) return failed(`rm: cannot remove '${typed}': ${why(result)}`)
  // fsOps names what it couldn't remove from the absolute path it was given
  const kept = (result.errors ?? []).map((error) => `rm: cannot remove '${spelled({ typed, real: path }, error.path)}': ${errnoText(error.errno)}`)
  const removed = flags.v ? removedLines({ before, after: fs.vfs() }, { typed, real: found?.path ?? path }) : []
  return { out: removed, err: kept }
}

/** @param {CommandContext} context @returns {CommandOutput} */
const rmCommand = (context) => {
  const parsed = options(context.argv, 'rm', 'rRfdv')
  if (!('operands' in parsed)) return parsed
  if (!parsed.operands.length) return parsed.flags.f ? {} : missing('rm', 'missing operand')
  return finish(parsed.operands.map((typed) => rmOne(typed, parsed.flags, context)))
}

/**
 * Where each source goes: into the last operand when it is a folder, else to it (one source only).
 * @param {Vfs} vfs @param {string} cwd @param {string[]} operands at least two @param {string} name
 * @returns {{ pairs: Pair[] } | { error: string }}
 */
const destinations = (vfs, cwd, operands, name) => {
  const target = operands[operands.length - 1]
  const sources = operands.slice(0, -1)
  if (folderAt(vfs, normalize(target, cwd)) !== null) {
    return { pairs: sources.map((from) => ({ from, to: inside(target, baseName(from)) })) }
  }
  if (sources.length > 1) return { error: `${name}: target '${target}' is not a directory` }
  return { pairs: [{ from: sources[0], to: target }] }
}

/**
 * The pairs a cp or mv line names, or the output that ends it.
 * @param {string} name @param {ParsedOptions} parsed @param {CommandContext} context
 * @returns {{ pairs: Pair[] } | { output: CommandOutput }}
 */
const pairsFor = (name, parsed, { fs, cwd }) => {
  const { operands } = parsed
  if (!operands.length) return { output: missing(name, 'missing file operand') }
  if (operands.length === 1) return { output: missing(name, `missing destination file operand after '${operands[0]}'`) }
  const found = destinations(fs.vfs(), cwd, operands, name)
  return 'error' in found ? { output: { stderr: [found.error], code: 1 } } : found
}

/**
 * Why a copy failed, in cp's words. cpOne has already checked the source, so the refusal is about the destination.
 * cp stats the destination through links first, so a loop there is always 'cannot stat'.
 * @param {Refusal} refusal @param {Pair & { folder: boolean, destNode: boolean }} job
 */
const cpRefusal = (refusal, { from, to, folder, destNode }) => {
  const kind = folder ? 'directory' : 'regular file'
  if ('reason' in refusal) {
    return refusal.reason === 'full' ? `cp: error writing '${to}': ${why(refusal)}` : `cp: cannot create ${kind} '${to}': ${why(refusal)}`
  }
  if (refusal.errno === 'ENOENT' && destNode) return `cp: not writing through dangling symlink '${to}'`
  if (refusal.errno === 'ELOOP') return `cp: cannot stat '${to}': ${why(refusal)}`
  if (refusal.errno === 'EINVAL') return folder ? `cp: cannot copy a directory, '${from}', into itself, '${to}'` : `cp: '${from}' and '${to}' are the same file`
  if (refusal.errno === 'EISDIR') return `cp: cannot overwrite directory '${to}' with non-directory`
  if (refusal.errno === 'ENOTDIR' && destNode) return `cp: cannot overwrite non-directory '${to}' with directory '${from}'`
  return `cp: cannot create ${kind} '${to}': ${why(refusal)}`
}

/**
 * What cp -r couldn't place inside a folder it copied.
 * @param {FsOpError} error @param {Pair & { toPath: string }} job
 */
const cpClash = (error, { from, to, toPath }) => {
  const at = spelled({ typed: to, real: toPath }, error.path)
  if (error.errno === 'EISDIR') return `cp: cannot overwrite directory '${at}' with non-directory`
  return `cp: cannot overwrite non-directory '${at}' with directory '${from}${at.slice(to.length)}'`
}

/**
 * One copy.
 * @param {Pair} pair @param {ParsedOptions['flags']} flags @param {CommandContext} context
 * @returns {Report}
 */
const cpOne = ({ from, to }, flags, { fs, cwd }) => {
  const recursive = Boolean(flags.r || flags.R)
  const [fromPath, toPath] = [normalize(from, cwd), normalize(to, cwd)]
  const vfs = fs.vfs()
  const source = resolve(vfs, fromPath, { followLast: !recursive })
  if (!source.ok) return failed(`cp: cannot stat '${from}': ${errnoText(source.errno)}`)
  const folder = vfs[source.path].type === NODE_TYPES.DIR
  if (folder && !recursive) return failed(`cp: -r not specified; omitting directory '${from}'`)
  const destNode = nodeAt(vfs, toPath) !== null
  // -n asks what cp would stat: a file copied as a file looks through a link at the destination.
  const asFile = !folder && vfs[source.path].type !== NODE_TYPES.SYMLINK
  if (flags.n && (asFile ? resolve(vfs, toPath, { followLast: true }).ok : destNode)) return printed()
  const result = fs.apply(copy, { from: fromPath, to: toPath, recursive })
  if (!result.ok) return failed(cpRefusal(result, { from, to, folder, destNode }))
  const clashes = (result.errors ?? []).map((error) => cpClash(error, { from, to, toPath }))
  const copied = flags.v ? (folder ? subtree(vfs, source.path) : [source.path]) : []
  const named = (/** @type {string} */ typed, /** @type {string} */ path) => spelled({ typed, real: source.path }, path)
  return { out: copied.map((path) => `'${named(from, path)}' -> '${named(to, path)}'`), err: clashes }
}

/** @param {CommandContext} context @returns {CommandOutput} */
const cpCommand = (context) => {
  const parsed = options(context.argv, 'cp', 'rRvn')
  if (!('operands' in parsed)) return parsed
  const found = pairsFor('cp', parsed, context)
  if ('output' in found) return found.output
  return finish(found.pairs.map((pair) => cpOne(pair, parsed.flags, context)))
}

/**
 * Why a move failed, in mv's words.
 * @param {Refusal} refusal @param {Pair & { folder: boolean, destNode: boolean }} job
 */
const mvRefusal = (refusal, { from, to, folder, destNode }) => {
  const errno = errnoOf(refusal)
  if (errno === 'EINVAL') return `mv: cannot move '${from}' to a subdirectory of itself, '${to}'`
  if (errno === 'EISDIR') return `mv: cannot overwrite directory '${to}' with non-directory`
  if (errno === 'ENOTDIR' && folder && destNode) return `mv: cannot overwrite non-directory '${to}' with directory '${from}'`
  return `mv: cannot move '${from}' to '${to}': ${why(refusal)}`
}

/**
 * One move.
 * @param {Pair} pair @param {ParsedOptions['flags']} flags @param {CommandContext} context
 * @returns {Report}
 */
const mvOne = ({ from, to }, flags, { fs, cwd }) => {
  const [fromPath, toPath] = [normalize(from, cwd), normalize(to, cwd)]
  const vfs = fs.vfs()
  const source = resolve(vfs, fromPath)
  if (!source.ok) return failed(`mv: cannot stat '${from}': ${errnoText(source.errno)}`)
  const dest = nodeAt(vfs, toPath)
  if (dest?.path === source.path) return failed(`mv: '${from}' and '${to}' are the same file`)
  if (flags.n && dest) return printed()
  const result = fs.apply(move, { from: fromPath, to: toPath })
  const folder = vfs[source.path].type === NODE_TYPES.DIR
  if (!result.ok) return failed(mvRefusal(result, { from, to, folder, destNode: dest !== null }))
  return printed(flags.v ? [`renamed '${from}' -> '${to}'`] : [])
}

/** @param {CommandContext} context @returns {CommandOutput} */
const mvCommand = (context) => {
  const parsed = options(context.argv, 'mv', 'vnf')
  if (!('operands' in parsed)) return parsed
  const found = pairsFor('mv', parsed, context)
  if ('output' in found) return found.output
  return finish(found.pairs.map((pair) => mvOne(pair, parsed.flags, context)))
}

/**
 * ln without -s: a hard link, which this filesystem can't make (Claude's call 2).
 * @param {Pair} pair @param {CommandContext} context
 */
const hardLink = ({ from, to }, { fs, cwd }) => {
  const source = resolve(fs.vfs(), normalize(from, cwd))
  if (!source.ok) return `ln: failed to access '${from}': ${errnoText(source.errno)}`
  return `ln: failed to create hard link '${to}' => '${from}': ${errnoText('EPERM')}`
}

/**
 * One symbolic link; with -f a file already at the name goes first.
 * @param {Pair} pair @param {ParsedOptions['flags']} flags @param {CommandContext} context
 * @returns {string | null} the error, if any
 */
const softLink = ({ from, to }, flags, { fs, cwd }) => {
  const path = normalize(to, cwd)
  const existing = nodeAt(fs.vfs(), path)
  if (flags.f && existing && existing.node.type !== NODE_TYPES.DIR) {
    const removed = fs.apply(remove, { path })
    if (!removed.ok) return `ln: cannot remove '${to}': ${why(removed)}`
  }
  const result = fs.apply(symlink, { target: from, path })
  return result.ok ? null : `ln: failed to create symbolic link '${to}': ${why(result)}`
}

/** @param {CommandContext} context @returns {CommandOutput} */
const lnCommand = (context) => {
  const parsed = options(context.argv, 'ln', 'sf')
  if (!('operands' in parsed)) return parsed
  const { operands } = parsed
  if (!operands.length) return missing('ln', 'missing file operand')
  // With one operand the link is made here, named after its target
  const found =
    operands.length === 1 ? { pairs: [{ from: operands[0], to: baseName(operands[0]) }] } : destinations(context.fs.vfs(), context.cwd, operands, 'ln')
  if ('error' in found) return { stderr: [found.error], code: 1 }
  return finish(
    found.pairs.map((pair) => {
      const error = parsed.flags.s ? softLink(pair, parsed.flags, context) : hardLink(pair, context)
      return error ? failed(error) : printed()
    }),
  )
}

export const filesCommands = Object.freeze({
  mkdir: mkdirCommand,
  rmdir: rmdirCommand,
  touch: touchCommand,
  rm: rmCommand,
  cp: cpCommand,
  mv: mvCommand,
  ln: lnCommand,
})
