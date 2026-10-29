// Commands that open apps or files: open/xdg-open/gio open, nautilus, text editors
import { dim, pre } from '@/components/rafeyos/core/commands/lines'
import { realPath, resolvePath } from '@/components/rafeyos/core/vfs/paths'
import { isDir } from '@/components/rafeyos/core/vfs/queries'
import { failure, operands, result, EFFECTS } from './result'
import { APP } from '@/components/rafeyos/core/catalog/apps'

const UNINSTALLED_EDITORS = new Set(['nano', 'vim', 'vi'])

const openContact = (what, content) => {
  if (what === 'email') {
    return result([pre('Opening email application...')], [{ type: EFFECTS.OPEN_APP, app: APP.MAIL }])
  }
  return result(
    [pre('Opening LinkedIn profile in a new tab...')],
    [{ type: EFFECTS.OPEN_LINK, href: content.contact.linkedinUrl }],
  )
}

const open = ({ argv, name, fs, cwd, content }) => {
  // `gio open <x>`: the first arg is gio's subcommand
  const args = name === 'gio' ? operands(argv).slice(1) : operands(argv)
  const [what] = args
  if (what === 'email' || what === 'linkedin') return openContact(what, content)
  const vfs = fs.vfs()
  const path = what ? resolvePath(vfs, what, cwd) : null
  if (!path) return failure(`${name}: ${what || 'missing operand'}: No such file or directory`)
  return result([], [{ type: EFFECTS.OPEN_PATH, path: realPath(vfs, path) }])
}

const nautilus = ({ argv, fs, cwd }) => {
  const vfs = fs.vfs()
  const [arg] = operands(argv)
  const path = arg ? resolvePath(vfs, arg, cwd) : cwd
  if (!path || !isDir(vfs, path)) return failure(`nautilus: ${arg ?? ''}: not a folder`)
  return result([], [{ type: EFFECTS.OPEN_APP, app: APP.FILES, path: realPath(vfs, path) }])
}

const editor = ({ argv, name, fs, cwd }) => {
  const vfs = fs.vfs()
  const [arg] = operands(argv)
  const path = arg ? resolvePath(vfs, arg, cwd) : null
  if (!path || isDir(vfs, path)) return failure(`${name}: ${arg || 'missing file'}: No such file`)
  const lines = UNINSTALLED_EDITORS.has(name) ? [dim(`${name} isn't installed here, opened Text Editor instead`)] : []
  return result(lines, [{ type: EFFECTS.OPEN_APP, app: APP.EDITOR, path: realPath(vfs, path) }])
}

export const launchCommands = Object.freeze({
  open,
  'xdg-open': open,
  gio: open,
  nautilus,
  'gnome-text-editor': editor,
  gedit: editor,
  nano: editor,
  vim: editor,
  vi: editor,
})
