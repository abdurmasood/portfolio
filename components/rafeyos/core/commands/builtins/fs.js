// Commands that read the filesystem: ls, cd, pwd, cat, tree, find, stat. The ones that change it are in files.js.
import { ls as lsLine, pre } from '@/components/rafeyos/core/commands/lines'
import { HOME, NODE_TYPES, ROOT } from '@/components/rafeyos/core/vfs/buildVfs'
import { joinPath, realPath, absPath, normalize, parentOf, resolve, resolvePath } from '@/components/rafeyos/core/vfs/paths'
import { isDir, isHidden, statOf } from '@/components/rafeyos/core/vfs/queries'
import { errnoText } from '@/components/rafeyos/core/commands/errors'
import { parseOptions } from '@/components/rafeyos/core/commands/options'
import { shellCollate } from '@/components/rafeyos/core/commands/expand'
import { failure } from './result'
import { folderAt, longListing, missing, nameOf, shellChildren, spelled, statBlock, usage } from './fileInfo'

// Same answers the home terminal gives for its pretend files
const HOME_FILE_MESSAGES = Object.freeze({
  'projects.txt': 'Use the command "projects" for all project details',
  'music.txt': 'Use the command "music" to explore Rafey\'s music',
})

/** What cat prints for one of the home terminal's pretend files, when `arg` names one that isn't really there. */
export const homeFileMessage = (vfs, arg, cwd) =>
  Object.hasOwn(HOME_FILE_MESSAGES, arg) && !vfs[joinPath(cwd, arg)] ? `${HOME_FILE_MESSAGES[arg]}\n` : undefined

const LS_SPEC = Object.freeze({ name: 'ls', flags: 'laAh1trSd', usageCode: 2 })
const CAT_SPEC = Object.freeze({ name: 'cat', flags: 'n' })
const TREE_SPEC = Object.freeze({ name: 'tree', flags: 'ad', values: 'L' })
const STAT_SPEC = Object.freeze({ name: 'stat' })
const LS_MISSING_CODE = 2
const TREE_ERROR_CODE = 2
const CAT_NUMBER_WIDTH = 6

/** One `ls` entry: the name it prints, the path it describes (a link itself, not its target) and that path's facts. */
const entryOf = (vfs, path, name) => ({ name, path, facts: statOf(vfs, path) })

const kindOf = (vfs, entry) => {
  if (entry.facts.type === NODE_TYPES.SYMLINK) return 'link'
  return isDir(vfs, entry.path) ? 'dir' : 'file'
}

// GNU's sort keys: name in the shell's order, or newest / largest first with the name breaking ties
const lsOrder = (flags) => (a, b) => {
  const byName = shellCollate(a.name, b.name)
  if (flags.t) return b.facts.mtime - a.facts.mtime || byName
  if (flags.S) return b.facts.size - a.facts.size || byName
  return byName
}

const sorted = (entries, flags) => {
  const ordered = [...entries].sort(lsOrder(flags))
  return flags.r ? ordered.reverse() : ordered
}

// What a folder lists: its children (dotfiles only with -a or -A), and with -a its own . and ..
const folderEntries = (vfs, folder, flags) => {
  const children = shellChildren(vfs, folder)
    .filter((path) => flags.a || flags.A || !isHidden(path))
    .map((path) => entryOf(vfs, path, nameOf(path)))
  if (!flags.a) return children
  return [entryOf(vfs, folder, '.'), entryOf(vfs, parentOf(folder) ?? ROOT, '..'), ...children]
}

// A folder operand is listed by its contents, unless -d, or -l on a link (GNU shows the link itself then)
const listsContents = (vfs, path, flags) =>
  !flags.d && folderAt(vfs, path) !== null && !(flags.l && vfs[path].type === NODE_TYPES.SYMLINK)

/**
 * Splits ls's operands into the files it names, the folders it lists and the ones that aren't there.
 * @returns {{ files: object[], folders: { name: string, entries: object[] }[], errors: string[] }}
 */
const lsOperands = (vfs, operands, cwd, flags) => {
  const found = { files: [], folders: [], errors: [] }
  operands.forEach((arg) => {
    const spot = resolve(vfs, normalize(arg, cwd))
    if (!spot.ok) {
      found.errors.push(`ls: cannot access '${arg}': ${errnoText(spot.errno)}`)
      return
    }
    const entry = entryOf(vfs, spot.path, arg)
    if (!listsContents(vfs, spot.path, flags)) found.files.push(entry)
    else found.folders.push({ ...entry, entries: sorted(folderEntries(vfs, folderAt(vfs, spot.path), flags), flags) })
  })
  // Operands sort the way entries do: files first, then the folders
  return { ...found, files: sorted(found.files, flags), folders: sorted(found.folders, flags) }
}

// Each group's lines: plain names, or -l rows (a listed folder with its total)
const groupLines = (group, flags, now) =>
  flags.l ? longListing(group.entries, { now: now().getTime(), human: Boolean(flags.h), total: group.folder }) : group.entries.map((e) => e.name)

const groupsOf = ({ files, folders }, headers) => [
  ...(files.length ? [{ header: null, entries: files, folder: false }] : []),
  ...folders.map((folder) => ({ header: headers ? `${folder.name}:` : null, entries: folder.entries, folder: true })),
]

// On screen, the default form is one coloured row per group; -l and -1 print as plain text
const screenOf = (vfs, groups) =>
  groups.flatMap((group, index) => {
    const header = group.header ? [pre(`${index ? '\n' : ''}${group.header}`)] : []
    const quoted = group.entries.map((entry) => ({ name: entry.name.includes(' ') ? `'${entry.name}'` : entry.name, kind: kindOf(vfs, entry) }))
    return [...header, ...(quoted.length ? [lsLine(quoted)] : [])]
  })

const ls = ({ argv, fs, cwd, now }) => {
  const parsed = parseOptions(argv, LS_SPEC)
  if ('error' in parsed) return usage(parsed)
  const vfs = fs.vfs()
  // A folder deleted from under the shell still lists, as nothing
  if (!parsed.operands.length && !vfs[cwd]) return {}
  const operands = parsed.operands.length ? parsed.operands : ['.']
  const found = lsOperands(vfs, operands, cwd, parsed.flags)
  const groups = groupsOf(found, operands.length > 1)
  const texts = groups.map((group) => [...(group.header ? [group.header] : []), ...groupLines(group, parsed.flags, now)])
  const stdout = texts.map((lines) => lines.map((line) => `${line}\n`).join('')).join('\n')
  const plain = parsed.flags.l || parsed.flags['1']
  return {
    stdout,
    display: plain ? undefined : screenOf(vfs, groups),
    stderr: found.errors,
    code: found.errors.length ? LS_MISSING_CODE : 0,
  }
}

// The options Linux bash's cd takes; the folder it lands in is always the real one, so they change nothing here
const CD_OPTION = /^-[LPe]+$/

// cd's words after its leading options and a `--` that ends them
const cdOperands = (argv) => {
  const start = argv.findIndex((arg) => !CD_OPTION.test(arg))
  if (start < 0) return []
  return argv[start] === '--' ? argv.slice(start + 1) : argv.slice(start)
}

const cd = ({ argv: words, fs, cwd, env }) => {
  const argv = cdOperands(words)
  if (argv.length > 1) return failure('bash: cd: too many arguments')
  const [arg] = argv
  if (arg === '-' && !env.OLDPWD) return failure('bash: cd: OLDPWD not set')
  const vfs = fs.vfs()
  const wanted = arg === '-' ? env.OLDPWD : arg
  const path = wanted ? resolvePath(vfs, wanted, cwd) : HOME
  if (!path) return failure(`bash: cd: ${wanted}: No such file or directory`)
  if (!isDir(vfs, path)) return failure(`bash: cd: ${wanted}: Not a directory`)
  const next = realPath(vfs, path)
  // `cd -` says where it went
  return { cwd: next, env: { OLDPWD: cwd }, stdout: arg === '-' ? `${next}\n` : '' }
}

const pwd = ({ cwd }) => ({ stdout: `${absPath(cwd)}\n` })

// One file's text, or the error cat prints for it
const catOne = (vfs, arg, { cwd, stdin }) => {
  if (arg === '-') return { text: stdin ?? '' }
  const message = homeFileMessage(vfs, arg, cwd)
  if (message) return { text: message }
  const found = resolve(vfs, normalize(arg, cwd), { followLast: true })
  if (!found.ok) return { error: `cat: ${arg}: ${errnoText(found.errno)}` }
  const node = vfs[found.path]
  if (node.type === NODE_TYPES.DIR) return { error: `cat: ${arg}: Is a directory` }
  if (node.type === NODE_TYPES.AUDIO) return { error: `cat: ${arg}: binary file (try: music play)` }
  return { text: node.text }
}

// cat -n: every line numbered, the count running on across files
const numbered = (text) =>
  text
    .split(/(?<=\n)/)
    .map((line, index) => `${String(index + 1).padStart(CAT_NUMBER_WIDTH)}\t${line}`)
    .join('')

const cat = ({ argv, fs, cwd, stdin }) => {
  const parsed = parseOptions(argv, CAT_SPEC)
  if ('error' in parsed) return usage(parsed)
  if (!parsed.operands.length && stdin === null) return { stdout: 'Usage: cat <file-name>\n' }
  const vfs = fs.vfs()
  const read = (parsed.operands.length ? parsed.operands : ['-']).map((arg) => catOne(vfs, arg, { cwd, stdin }))
  const stderr = read.flatMap((one) => (one.error ? [one.error] : []))
  const text = read.map((one) => one.text ?? '').join('')
  return { stdout: parsed.flags.n && text ? numbered(text) : text, stderr, code: stderr.length ? 1 : 0 }
}

// tree's branches under one folder; links are named with their target and never walked into
const treeLines = (vfs, folder, { prefix, depth, options, counts }) => {
  const children = shellChildren(vfs, folder).filter(
    (path) => (options.all || !isHidden(path)) && (!options.dirsOnly || folderAt(vfs, path) !== null),
  )
  return children.flatMap((path, index) => {
    const lastOne = index === children.length - 1
    const node = vfs[path]
    const isFolder = folderAt(vfs, path) !== null
    counts[isFolder ? 'dirs' : 'files'] += 1
    const label = node.type === NODE_TYPES.SYMLINK ? `${node.name} -> ${node.target}` : node.name
    const line = `${prefix}${lastOne ? '└── ' : '├── '}${label}`
    if (node.type !== NODE_TYPES.DIR || depth + 1 >= options.maxDepth) return [line]
    const deeper = { prefix: `${prefix}${lastOne ? '    ' : '│   '}`, depth: depth + 1, options, counts }
    return [line, ...treeLines(vfs, path, deeper)]
  })
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`

const tree = ({ argv, fs, cwd }) => {
  const parsed = parseOptions(argv, TREE_SPEC)
  if ('error' in parsed) return usage(parsed)
  const level = parsed.values.L === undefined ? Infinity : Number(parsed.values.L)
  if (!(level > 0)) return failure('tree: Invalid level, must be greater than 0.')
  const vfs = fs.vfs()
  const options = { all: Boolean(parsed.flags.a), dirsOnly: Boolean(parsed.flags.d), maxDepth: level }
  const counts = { dirs: 0, files: 0 }
  let failed = false
  const lines = (parsed.operands.length ? parsed.operands : ['.']).flatMap((arg) => {
    const folder = folderAt(vfs, normalize(arg, cwd))
    if (folder === null) {
      failed = true
      return [`${arg} [error opening dir]`]
    }
    return [arg, ...treeLines(vfs, folder, { prefix: '', depth: 0, options, counts })]
  })
  const dirs = plural(counts.dirs, 'directory', 'directories')
  const footer = options.dirsOnly ? dirs : `${dirs}, ${plural(counts.files, 'file', 'files')}`
  return { stdout: `${lines.join('\n')}\n\n${footer}\n`, code: failed ? TREE_ERROR_CODE : 0 }
}

// find's -name and -iname patterns: * and ? only, as the shell's own wildcards
const nameMatcher = (pattern, flags) => {
  const source = [...pattern].map((char) => (char === '*' ? '.*' : char === '?' ? '.' : char.replace(/[\\^$.*+?()[\]{}|/]/, '\\$&'))).join('')
  const regex = new RegExp(`^${source}$`, `su${flags}`)
  return (name) => regex.test(name)
}

const FIND_TYPES = Object.freeze({ f: 'file', d: 'dir', l: 'link' })

const typeOf = (node) => {
  if (node.type === NODE_TYPES.DIR) return 'dir'
  return node.type === NODE_TYPES.SYMLINK ? 'link' : 'file'
}

// One test of find's expression from its words; returns how many words it used, or an error
const findTest = (words, at, query) => {
  const [word, value] = [words[at], words[at + 1]]
  if (!['-name', '-iname', '-type', '-maxdepth'].includes(word)) {
    return { error: word.startsWith('-') ? `find: unknown predicate '${word}'` : `find: paths must precede expression: '${word}'` }
  }
  if (value === undefined) return { error: `find: missing argument to '${word}'` }
  if (word === '-maxdepth') {
    if (!/^\d+$/.test(value)) return { error: `find: Expected a positive decimal integer argument to -maxdepth, but got '${value}'` }
    query.maxDepth = Number(value)
  } else if (word === '-type') {
    if (!Object.hasOwn(FIND_TYPES, value)) return { error: `find: Unknown argument to -type: ${value}` }
    query.tests.push((node) => typeOf(node) === FIND_TYPES[value])
  } else {
    const matches = nameMatcher(value, word === '-iname' ? 'i' : '')
    query.tests.push((_node, shownName) => matches(shownName))
  }
  return { used: 2 }
}

// find's words: the starting points, then the tests every result must pass
const findQuery = (argv) => {
  const firstTest = argv.findIndex((word) => word.startsWith('-') && word !== '-')
  const roots = firstTest < 0 ? argv : argv.slice(0, firstTest)
  const query = { roots: roots.length ? roots : ['.'], tests: [], maxDepth: Infinity }
  for (let at = firstTest < 0 ? argv.length : firstTest; at < argv.length; ) {
    const step = findTest(argv, at, query)
    if (step.error) return step
    at += step.used
  }
  return query
}

const findFrom = (vfs, root, query) => {
  const walk = (path, depth) => {
    const node = vfs[path]
    const shownName = path === root.real ? nameOf(root.typed.replace(/(.)\/+$/, '$1')) : node.name
    const own = query.tests.every((test) => test(node, shownName)) ? [spelled(root, path)] : []
    if (node.type !== NODE_TYPES.DIR || depth >= query.maxDepth) return own
    return [...own, ...shellChildren(vfs, path).flatMap((child) => walk(child, depth + 1))]
  }
  return walk(root.real, 0)
}

const find = ({ argv, fs, cwd }) => {
  const query = findQuery(argv)
  if (query.error) return failure(query.error)
  const vfs = fs.vfs()
  const stderr = []
  const found = query.roots.flatMap((typed) => {
    const spot = resolve(vfs, normalize(typed, cwd))
    if (spot.ok) return findFrom(vfs, { typed, real: spot.path }, query)
    stderr.push(`find: '${typed}': ${errnoText(spot.errno)}`)
    return []
  })
  return { stdout: found.map((path) => `${path}\n`).join(''), stderr, code: stderr.length ? 1 : 0 }
}

const stat = ({ argv, fs, cwd }) => {
  const parsed = parseOptions(argv, STAT_SPEC)
  if ('error' in parsed) return usage(parsed)
  if (!parsed.operands.length) return missing('stat', 'missing operand')
  const vfs = fs.vfs()
  const stderr = []
  const blocks = parsed.operands.flatMap((arg) => {
    const spot = resolve(vfs, normalize(arg, cwd))
    if (spot.ok) return [`${statBlock(arg, spot.path, statOf(vfs, spot.path))}\n`]
    stderr.push(`stat: cannot statx '${arg}': ${errnoText(spot.errno)}`)
    return []
  })
  return { stdout: blocks.join(''), stderr, code: stderr.length ? 1 : 0 }
}

export const fsCommands = Object.freeze({ ls, cd, pwd, cat, tree, find, stat })
