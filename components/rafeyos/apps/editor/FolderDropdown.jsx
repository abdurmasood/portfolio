import { useId } from 'react'
import { useShellDispatch, useShellState } from '../../state/contexts'
import { Sym } from '../../icons/symbols'
import { belowElement, useMenu } from '../../shell/menus/js/useMenu'
import { choiceItem } from '../../shell/menus/js/menuItems'
import { SAVE_FOLDERS } from '../../vfs/documents'

/**
 * The save dialog's folder picker, as a GTK dropdown: a button showing the folder, opening the
 * shell's popover with a check on the current one. Clicks inside a dialog don't close menus
 * (Desktop's KEEPS_POPUP), so a second click on the button closes it here.
 */
export const FolderDropdown = ({ folder, onChoose }) => {
  const labelId = useId()
  const valueId = useId()
  const openMenu = useMenu()
  const { menu } = useShellState()
  const shellDispatch = useShellDispatch()
  const current = SAVE_FOLDERS.find((place) => place.path === folder) ?? SAVE_FOLDERS[0]
  const toggle = (event) => {
    if (menu) {
      shellDispatch({ type: 'closeMenu' })
      return
    }
    const items = SAVE_FOLDERS.map((place) =>
      choiceItem({ label: place.label, icon: place.icon, checked: place.path === folder, action: () => onChoose(place.path) }),
    )
    openMenu(items, belowElement(event.currentTarget))
  }
  return (
    <div className="where">
      <span id={labelId}>Folder</span>
      <button type="button" className="dd" aria-haspopup="menu" aria-labelledby={`${labelId} ${valueId}`} onClick={toggle}>
        <Sym name={current.icon} />
        <span id={valueId} className="ddv">{current.label}</span>
        <Sym name="down" className="ddc" />
      </button>
    </div>
  )
}
