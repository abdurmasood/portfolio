// Viewport-derived layout: compact mode, where the dock sits and the windows' work area
import { workArea } from '../wm/geometry'

export const COMPACT_BREAKPOINT = 760
export const COMPACT_ICON_SIZE = 34
// The dock is the icon plus its padding (mockup: iconPx() + 14)
const DOCK_PADDING = 14

/**
 * @param {{ w: number, h: number }} viewport
 * @param {{ dockPos: string, iconSize: number }} settings
 */
export const computeLayout = (viewport, { dockPos, iconSize }) => {
  const compact = viewport.w < COMPACT_BREAKPOINT
  const shownDockPos = compact ? 'bottom' : dockPos
  const shownIconSize = compact ? COMPACT_ICON_SIZE : iconSize
  const dockSize = shownIconSize + DOCK_PADDING
  return Object.freeze({
    viewport,
    compact,
    dockPos: shownDockPos,
    iconSize: shownIconSize,
    dockSize,
    area: workArea({ viewport, dockPos: shownDockPos, dockSize }),
  })
}
