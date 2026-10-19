import { useMemo, useState } from 'react'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'

/**
 * A split view's sidebar on narrow windows: CSS hides it under 560px of window width (a container
 * query on .split) and shows the toggle; opening lays the sidebar over the content.
 * @returns {{ open: boolean, toggle: () => void, close: () => void }}
 */
export const useSidebarToggle = () => {
  const [open, setOpen] = useState(false)
  return useMemo(() => ({ open, toggle: () => setOpen((current) => !current), close: () => setOpen(false) }), [open])
}

export const splitClassName = (sidebar) => (sidebar.open ? 'split side-open' : 'split')

/** Only visible while the window is narrow (see .sbtoggle in window.css). */
export const SidebarToggle = ({ sidebar }) => (
  <button
    type="button"
    className={sidebar.open ? 'flat sbtoggle on' : 'flat sbtoggle'}
    aria-label={sidebar.open ? 'Hide sidebar' : 'Show sidebar'}
    aria-expanded={sidebar.open}
    onClick={sidebar.toggle}
  >
    <Sym name="dock" />
  </button>
)
