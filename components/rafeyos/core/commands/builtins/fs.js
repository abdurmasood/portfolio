// Filesystem commands: ls, cd, pwd, cat
import { error, ls as lsLine, pre } from '@/components/rafeyos/core/commands/lines'
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { joinPath, realPath, absPath } from '@/components/rafeyos/core/vfs/paths'
import { children, isDir } from '@/components/rafeyos/core/vfs/queries'
import { result } from './result'
import { target } from './target'

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

const ls = ({ parsed, vfs, cwd }) => {
  const arg = parsed.args.join(' ')
  const path = arg ? target(vfs, arg, cwd) : cwd
  if (!path) return result([error(`ls: cannot access '${arg}': No such file or directory`)])
  if (!isDir(vfs, path)) return result([lsLine([entryFor(vfs, path)])])
  const kids = children(vfs, realPath(vfs, path))
  return result(kids.length ? [lsLine(kids.map((kid) => entryFor(vfs, kid)))] : [])
}

const cd = ({ parsed, vfs, cwd }) => {
  const arg = parsed.args.join(' ')
  const path = arg ? target(vfs, arg, cwd) : HOME
  if (!path) return result([error(`bash: cd: ${arg}: No such file or directory`)])
  if (!isDir(vfs, path)) return result([error(`bash: cd: ${arg}: Not a directory`)])
  return { ...result(), cwd: realPath(vfs, path) }
}

const pwd = ({ cwd }) => result([pre(absPath(cwd))])

const cat = ({ parsed, vfs, cwd }) => {
  const arg = parsed.args.join(' ')
  if (!arg) return result([pre('Usage: cat <file-name>')])
  if (HOME_FILE_MESSAGES[arg] && !vfs[joinPath(cwd, arg)]) return result([pre(HOME_FILE_MESSAGES[arg])])
  const path = target(vfs, arg, cwd)
  if (!path) return result([error(`cat: ${arg}: No such file or directory`)])
  if (isDir(vfs, path)) return result([error(`cat: ${arg}: Is a directory`)])
  const node = vfs[realPath(vfs, path)]
  if (node.type === 'audio') return result([error(`cat: ${arg}: binary file (try: music play)`)])
  return result([pre(node.text)])
}

export const fsCommands = Object.freeze({ ls, cd, pwd, cat })
