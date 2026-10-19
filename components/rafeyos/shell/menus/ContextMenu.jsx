import { useCallback, useLayoutEffect, useRef } from 'react'
import { useLayout, useShellDispatch } from '@/components/rafeyos/state/logic/contexts'
import { MENU_ITEM_KINDS } from '@/components/rafeyos/ui/menus/logic/menuItems'
import { menuPosition } from './logic/menuPosition'
import { useEscapeKey } from '@/components/rafeyos/shell/popups/logic/useEscapeKey'
import { useReturnFocus } from '@/components/rafeyos/ui/popups/logic/useFocusTrap'
import { menuStep } from '@/components/rafeyos/ui/menus/logic/keyboardNavigation'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'

const sizeOf = (element) => ({ w: element.offsetWidth, h: element.offsetHeight })

/** Measures before paint and keeps the menu on screen. */
const usePlacement = (ref, menu) => {
  const { viewport } = useLayout()
  useLayoutEffect(() => {
    const element = ref.current
    const { left, top } = menuPosition(menu, sizeOf(element), viewport, { anchorBottom: menu.anchorBottom })
    element.style.left = `${left}px`
    element.style.top = `${top}px`
  }, [ref, menu, viewport])
}

const ENABLED_ITEM = ':is([role="menuitem"], [role="menuitemradio"]):not(:disabled)'

/** The first item takes focus; arrows, Home and End move it (wrapping); Tab closes the menu. */
const useMenuKeys = (ref, close) => {
  useReturnFocus({ onlyIfLost: true })
  useLayoutEffect(() => {
    ref.current.querySelector(ENABLED_ITEM)?.focus({ preventScroll: true })
  }, [ref])
  return (event) => {
    if (event.key === 'Tab') {
      event.preventDefault()
      close()
      return
    }
    const items = [...ref.current.querySelectorAll(ENABLED_ITEM)]
    if ((event.key === 'Enter' || event.key === ' ') && items.includes(document.activeElement)) {
      event.preventDefault()
      document.activeElement.click()
      return
    }
    const next = menuStep(items.indexOf(document.activeElement), event.key, items.length)
    if (next === null) return
    event.preventDefault()
    items[next].focus()
  }
}

const Entry = ({ entry, onChoose }) => {
  if (entry.kind === MENU_ITEM_KINDS.SEPARATOR) return <div className="msep" role="separator" />
  if (entry.kind === MENU_ITEM_KINDS.HEADING) return <div className="mhead">{entry.label}</div>
  // Choice items carry `checked`; plain items don't have the key at all
  const isChoice = 'checked' in entry
  return (
    <button
      type="button"
      className="mi"
      role={isChoice ? 'menuitemradio' : 'menuitem'}
      aria-checked={isChoice ? entry.checked : undefined}
      disabled={entry.disabled}
      onClick={() => onChoose(entry)}
    >
      {entry.icon && <Sym name={entry.icon} className="mic" />}
      <span>{entry.label}</span>
      {entry.checked && <Sym name="check" className="chk" />}
    </button>
  )
}

/** The open context menu: app-themed .pop, or the dark .shm for shell menus. Outside presses close it (Desktop). */
export const ContextMenu = ({ menu }) => {
  const ref = useRef(null)
  const shellDispatch = useShellDispatch()
  const close = useCallback(() => shellDispatch({ type: SHELL_ACTIONS.CLOSE_MENU }), [shellDispatch])
  usePlacement(ref, menu)
  useEscapeKey(close)
  const onKeyDown = useMenuKeys(ref, close)
  const choose = (entry) => {
    close()
    entry.action()
  }
  return (
    <div ref={ref} className={menu.shell ? 'shm' : 'pop'} role="menu" style={{ left: menu.x, top: menu.y }} onKeyDown={onKeyDown}>
      {menu.items.map((entry, i) => (
        <Entry key={`${i}-${entry.label ?? entry.kind}`} entry={entry} onChoose={choose} />
      ))}
    </div>
  )
}
