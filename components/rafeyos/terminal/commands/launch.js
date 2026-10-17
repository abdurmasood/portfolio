// Commands that open apps or files: open/xdg-open/gio open, nautilus, text editors
import { dim, error, pre } from '../lines'
import { realPath } from '../../vfs/paths'
import { isDir } from '../../vfs/queries'
import { result, EFFECTS } from './result'
import { target } from './target'

const UNINSTALLED_EDITORS = new Set(['nano', 'vim', 'vi'])

const openContact = (what, content) => {
  if (what === 'email') {
    return result([pre('Opening email application...')], [{ type: EFFECTS.OPEN_APP, app: 'mail' }])
  }
  return result(
    [pre('Opening LinkedIn profile in a new tab...')],
    [{ type: EFFECTS.OPEN_LINK, href: content.contact.linkedinUrl }],
  )
}

const open = ({ parsed, name, vfs, cwd, content }) => {
  // `gio open <x>`: the first arg is gio's subcommand
  const args = name === 'gio' ? parsed.args.slice(1) : parsed.args
  const what = args.join(' ')
  if (what === 'email' || what === 'linkedin') return openContact(what, content)
  const path = what ? target(vfs, what, cwd) : null
  if (!path) return result([error(`${name}: ${what || 'missing operand'}: No such file or directory`)])
  return result([], [{ type: EFFECTS.OPEN_PATH, path: realPath(vfs, path) }])
}

const nautilus = ({ parsed, vfs, cwd }) => {
  const arg = parsed.args.join(' ')
  const path = arg ? target(vfs, arg, cwd) : cwd
  if (!path || !isDir(vfs, path)) return result([error(`nautilus: ${arg}: not a folder`)])
  return result([], [{ type: EFFECTS.OPEN_APP, app: 'files', path: realPath(vfs, path) }])
}

const editor = ({ parsed, name, vfs, cwd }) => {
  const arg = parsed.args.join(' ')
  const path = arg ? target(vfs, arg, cwd) : null
  if (!path || isDir(vfs, path)) return result([error(`${name}: ${arg || 'missing file'}: No such file`)])
  const lines = UNINSTALLED_EDITORS.has(name) ? [dim(`${name} isn't installed here, opened Text Editor instead`)] : []
  return result(lines, [{ type: EFFECTS.OPEN_APP, app: 'editor', path: realPath(vfs, path) }])
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
