import { useCallback, useLayoutEffect, useRef } from 'react'
import { useLayout, useShellDispatch } from '../state/contexts'
import { MENU_ITEM_KINDS } from './menuItems'
import { menuPosition } from './menuPosition'
import { useEscapeKey } from './useEscapeKey'
import { useReturnFocus } from './useFocusTrap'
import { menuStep } from './keyboardNavigation'

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

const ENABLED_ITEM = '[role="menuitem"]:not(:disabled)'

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
  return (
    <button type="button" className="mi" role="menuitem" disabled={entry.disabled} onClick={() => onChoose(entry)}>
      <span>{entry.label}</span>
    </button>
  )
}

/** The open context menu: app-themed .pop, or the dark .shm for shell menus. Outside presses close it (Desktop). */
export const ContextMenu = ({ menu }) => {
  const ref = useRef(null)
  const shellDispatch = useShellDispatch()
  const close = useCallback(() => shellDispatch({ type: 'closeMenu' }), [shellDispatch])
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
