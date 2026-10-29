// Filesystem commands: ls, cd, pwd, cat
import { ls as lsLine } from '@/components/rafeyos/core/commands/lines'
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { joinPath, realPath, absPath, resolvePath } from '@/components/rafeyos/core/vfs/paths'
import { children, isDir } from '@/components/rafeyos/core/vfs/queries'
import { failure, operands } from './result'

// Same answers the home terminal gives for its pretend files
const HOME_FILE_MESSAGES = Object.freeze({
  'projects.txt': 'Use the command "projects" for all project details',
  'music.txt': 'Use the command "music" to explore Rafey\'s music',
})

const entryFor = (vfs, path) => {
  const { name, type } = vfs[path]
  const shown = name.includes(' ') ? `'${name}'` : name
  if (type === 'symlink') return { name: shown, kind: 'link' }
  return { name: shown, kind: isDir(vfs, path) ? 'dir' : 'file' }
}

// On screen one coloured row; down a pipe or into a file one plain name per line, as ls does
const listing = (vfs, paths) => ({
  stdout: paths.map((path) => `${vfs[path].name}\n`).join(''),
  display: paths.length ? [lsLine(paths.map((path) => entryFor(vfs, path)))] : [],
})

const ls = ({ argv, fs, cwd }) => {
  const vfs = fs.vfs()
  const [arg] = operands(argv)
  const path = arg ? resolvePath(vfs, arg, cwd) : cwd
  if (!path) return failure(`ls: cannot access '${arg}': No such file or directory`, 2)
  if (!isDir(vfs, path)) return listing(vfs, [path])
  return listing(vfs, children(vfs, realPath(vfs, path)))
}

const cd = ({ argv, fs, cwd }) => {
  const vfs = fs.vfs()
  const [arg] = operands(argv)
  const path = arg ? resolvePath(vfs, arg, cwd) : HOME
  if (!path) return failure(`bash: cd: ${arg}: No such file or directory`)
  if (!isDir(vfs, path)) return failure(`bash: cd: ${arg}: Not a directory`)
  return { cwd: realPath(vfs, path), env: { OLDPWD: cwd } }
}

const pwd = ({ cwd }) => ({ stdout: `${absPath(cwd)}\n` })

// One file's text, or the error cat prints for it
const catOne = (vfs, arg, cwd) => {
  if (HOME_FILE_MESSAGES[arg] && !vfs[joinPath(cwd, arg)]) return { text: `${HOME_FILE_MESSAGES[arg]}\n` }
  const path = resolvePath(vfs, arg, cwd)
  if (!path) return { error: `cat: ${arg}: No such file or directory` }
  if (isDir(vfs, path)) return { error: `cat: ${arg}: Is a directory` }
  const node = vfs[realPath(vfs, path)]
  if (node.type === 'audio') return { error: `cat: ${arg}: binary file (try: music play)` }
  return { text: node.text }
}

const cat = ({ argv, fs, cwd, stdin }) => {
  const args = operands(argv)
  if (!args.length) return { stdout: stdin ?? 'Usage: cat <file-name>\n' }
  const vfs = fs.vfs()
  const read = args.map((arg) => catOne(vfs, arg, cwd))
  const stderr = read.flatMap((one) => (one.error ? [one.error] : []))
  return { stdout: read.map((one) => one.text ?? '').join(''), stderr, code: stderr.length ? 1 : 0 }
}

export const fsCommands = Object.freeze({ ls, cd, pwd, cat })
