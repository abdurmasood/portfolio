import { useCallback, useMemo, useState } from 'react'
import { useLayout, useSettings, useVfs } from '@/components/rafeyos/state/logic/contexts'
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { joinPath } from '@/components/rafeyos/core/vfs/paths'
import { children, isHidden } from '@/components/rafeyos/core/vfs/queries'
import { iconLayout } from './iconLayout'

export const DESKTOP = joinPath(HOME, 'Desktop')
const NONE_PLACED = Object.freeze({})

/** `placed` without the icons whose files are gone, or `placed` itself when none are. */
const placedThatExist = (vfs, placed) => {
  const kept = Object.entries(placed).filter(([path]) => vfs[path])
  return kept.length === Object.keys(placed).length ? placed : Object.fromEntries(kept)
}

/**
 * Which icons the desktop shows and where: the corner layout, overridden by any icon the
 * visitor dragged. Dragged positions last until the corner changes (Settings re-lays the
 * icons out), the desktop goes (a restart resets them) or the file does (one made again sits in the layout).
 * @returns {{ paths: string[], positions: {path, x, y}[], positionOf: Function, place: Function }}
 */
export const useDesktopIconModel = () => {
  const { vfs } = useVfs()
  const { showHome, corner } = useSettings()
  const { area } = useLayout()
  // A new corner forgets the drags (React's adjust-state-while-rendering pattern, no extra effect pass)
  const [dragged, setDragged] = useState({ corner, placed: NONE_PLACED })
  // Likewise a file the shell deleted takes its dragged position with it
  const live = placedThatExist(vfs, dragged.placed)
  if (dragged.corner !== corner) setDragged({ corner, placed: NONE_PLACED })
  else if (live !== dragged.placed) setDragged({ corner, placed: live })
  const placed = dragged.corner === corner ? live : NONE_PLACED
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
