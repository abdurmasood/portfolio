// The Text Editor's "Open" popover and main menu (mockup wording).
import { SEPARATOR, disabledItem, menuHeading, menuItem } from '../../shell/menuItems'
import { HOME } from '../../vfs/buildVfs'
import { parentOf, tilde } from '../../vfs/paths'
import { textDocuments } from '../../vfs/queries'

/** "~/blog/" for a file in ~/blog: the editor's subtitle. */
export const folderLabel = (path) => `${tilde(parentOf(path) ?? HOME)}/`

/** Name, then its folder, as one row: "bio.txt   ~". */
export const documentLabel = (vfs, path) => `${vfs[path].name}   ${tilde(parentOf(path) ?? HOME)}`

export const recentDocumentItems = (vfs, openDocument) => [
  menuHeading('Recent Documents'),
  ...textDocuments(vfs).map((path) => menuItem(documentLabel(vfs, path), () => openDocument(path))),
]

export const editorMenuItems = ({ showInFiles, openTerminal, save = null }) => [
  menuItem('Show in Files', showInFiles),
  menuItem('Open in Terminal', openTerminal),
  SEPARATOR,
  menuItem('Save', save),
  disabledItem('Preferences'),
  disabledItem('About Text Editor'),
]
