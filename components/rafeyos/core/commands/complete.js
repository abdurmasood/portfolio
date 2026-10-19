import { resolvePath, realPath } from '@/components/rafeyos/core/vfs/paths'
import { children, isDir } from '@/components/rafeyos/core/vfs/queries'

const pathCandidates = (word, { vfs, cwd }) => {
  const slash = word.lastIndexOf('/')
  const dirPart = slash >= 0 ? word.slice(0, slash + 1) : ''
  const base = slash >= 0 ? word.slice(slash + 1) : word
  const dir = dirPart ? resolvePath(vfs, dirPart, cwd) : cwd
  if (!dir || !isDir(vfs, dir)) return []
  return children(vfs, realPath(vfs, dir))
    .map((path) => vfs[path].name + (isDir(vfs, path) ? '/' : ''))
    .filter((name) => name.startsWith(base))
    .map((name) => dirPart + name)
}

/**
 * Tab completion. A unique match fills in (folders get "/", everything else a space);
 * several matches are listed only on the second consecutive tab.
 * @returns {{ value: string } | { list: string[] }}
 */
export const complete = (input, { vfs, cwd, commands, tabCount }) => {
  const parts = input.split(' ')
  const word = parts[parts.length - 1]
  const candidates =
    parts.length === 1 ? commands.filter((name) => name.startsWith(word)) : pathCandidates(word, { vfs, cwd })
  if (candidates.length === 1) {
    const [only] = candidates
    return { value: [...parts.slice(0, -1), only + (only.endsWith('/') ? '' : ' ')].join(' ') }
  }
  if (candidates.length > 1 && tabCount > 1) return { list: candidates }
  return { value: input }
}
