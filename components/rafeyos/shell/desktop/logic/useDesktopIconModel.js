import { useCallback, useMemo, useState } from 'react'
import { useLayout, useSettings, useVfs } from '@/components/rafeyos/state/logic/contexts'
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { joinPath } from '@/components/rafeyos/core/vfs/paths'
import { children, isHidden } from '@/components/rafeyos/core/vfs/queries'
import { iconLayout } from './iconLayout'

export const DESKTOP = joinPath(HOME, 'Desktop')
const NONE_PLACED = Object.freeze({})

/**
 * Which icons the desktop shows and where: the corner layout, overridden by any icon the
 * visitor dragged. Dragged positions last until the corner changes (Settings re-lays the
 * icons out) or the desktop goes (a restart resets them).
 * @returns {{ paths: string[], positions: {path, x, y}[], positionOf: Function, place: Function }}
 */
export const useDesktopIconModel = () => {
  const { vfs } = useVfs()
  const { showHome, corner } = useSettings()
  const { area } = useLayout()
  // A new corner forgets the drags (React's adjust-state-while-rendering pattern, no extra effect pass)
  const [dragged, setDragged] = useState({ corner, placed: NONE_PLACED })
  if (dragged.corner !== corner) setDragged({ corner, placed: NONE_PLACED })
  const placed = dragged.corner === corner ? dragged.placed : NONE_PLACED
  const paths = useMemo(
    () => [...(showHome ? [HOME] : []), ...children(vfs, DESKTOP).filter((path) => !isHidden(path))],
    [vfs, showHome],
  )
  const positions = useMemo(
    () => iconLayout(paths, area, corner).map((position) => ({ ...position, ...placed[position.path] })),
    [paths, area, corner, placed],
  )
  const positionOf = useCallback((path) => positions.find((position) => position.path === path), [positions])
  const place = useCallback((moved) => setDragged((current) => ({ ...current, placed: { ...current.placed, ...moved } })), [])
  return { paths, positions, positionOf, place }
}
