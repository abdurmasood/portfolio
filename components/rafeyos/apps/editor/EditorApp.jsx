import { useEffect, useMemo, useState } from 'react'
import { useVfs, useWindowManager } from '../../state/contexts'
import { HeaderBar } from '../../wm/HeaderBar'
import { Sym } from '../../icons/symbols'
import { belowElement, useMenu } from '../../shell/useMenu'
import { useOpenPath } from '../../shell/useOpenPath'
import { pathCommands } from '../../shell/pathCommands'
import { editorMenuItems, folderLabel, recentDocumentItems } from './editorMenus'

// The main menu sits at the end of the header, so it opens inwards (mockup offset)
const MAIN_MENU_SHIFT = 160
const DIRTY_MARK = '• '

/** "• bio.txt" once the text differs from the file; edits are never saved. */
export const editorTitle = (name, dirty) => (dirty ? `${DIRTY_MARK}${name}` : name)

const useEditorMenus = (path) => {
  const { vfs } = useVfs()
  const windowManager = useWindowManager()
  const openPath = useOpenPath()
  const openMenu = useMenu()
  return useMemo(() => {
    const commands = pathCommands({ vfs, windowManager, openPath }, path)
    const openDocument = (doc) => windowManager.openApp('editor', { path: doc })
    return {
      openRecent: (event) => openMenu(recentDocumentItems(vfs, openDocument), belowElement(event.currentTarget)),
      openMain: (event) => openMenu(editorMenuItems(commands), belowElement(event.currentTarget, MAIN_MENU_SHIFT)),
    }
  }, [vfs, windowManager, openPath, openMenu, path])
}

const EditorHeader = ({ title, subtitle, menus }) => (
  <HeaderBar
    title={title}
    subtitle={subtitle}
    start={
      <>
        <button type="button" className="flat" style={{ fontWeight: 700 }} onClick={menus.openRecent}>
          Open <Sym name="down" />
        </button>
        <button type="button" className="flat" aria-label="New tab" disabled>
          <Sym name="plus" />
        </button>
      </>
    }
    end={
      <button type="button" className="flat" aria-label="Main Menu" onClick={menus.openMain}>
        <Sym name="menu" />
      </button>
    }
  />
)

/** GNOME Text Editor on one file: editable, never saved (closing the window drops the edits). */
export const EditorApp = ({ windowId, arg }) => {
  const { vfs } = useVfs()
  const windowManager = useWindowManager()
  const node = vfs[arg]
  const original = node.text ?? ''
  const [text, setText] = useState(original)
  const menus = useEditorMenus(arg)
  useEffect(() => windowManager.setTitle(windowId, node.name), [windowManager, windowId, node.name])
  return (
    <>
      <EditorHeader title={editorTitle(node.name, text !== original)} subtitle={folderLabel(arg)} menus={menus} />
      <div className="editor">
        <textarea
          className={node.small ? 'small' : undefined}
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          aria-label={node.name}
        />
      </div>
    </>
  )
}
