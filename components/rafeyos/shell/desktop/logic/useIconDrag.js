import { useCallback, useMemo, useRef } from 'react'
import { usePointerTrack } from '@/components/rafeyos/wm/logic/usePointerTrack'
import { applyPosition } from '@/components/rafeyos/wm/logic/applyRect'
import { pointOfEvent } from '@/components/rafeyos/ui/menus/logic/useMenu'
import { passedThreshold } from './rubberBand'

const iconElements = (layer, paths) =>
  Object.fromEntries([...layer.querySelectorAll('.dicon')].filter((el) => paths.includes(el.dataset.path)).map((el) => [el.dataset.path, el]))

const movedPositions = (origins, delta) =>
  Object.fromEntries(Object.entries(origins).map(([path, at]) => [path, { x: at.x + delta.x, y: at.y + delta.y }]))

/**
 * Moves the selected desktop icons together: style writes per frame, one commit on release.
 * @param {{ layerRef, positionOf: (path) => {x, y}, onCommit: (positions) => void }} options
 * @returns {{ start: (event, paths: string[]) => void, dragged: () => boolean }} dragged: the last press moved
 */
export const useIconDrag = ({ layerRef, positionOf, onCommit }) => {
  const track = usePointerTrack()
  const draggedRef = useRef(false)
  const start = useCallback(
    (event, paths) => {
      const from = pointOfEvent(event)
      const origins = Object.fromEntries(paths.map((path) => [path, positionOf(path)]))
      const elements = iconElements(layerRef.current, paths)
      let positions = null
      draggedRef.current = false
      const move = (point) => {
        const delta = { x: point.x - from.x, y: point.y - from.y }
        if (!draggedRef.current && !passedThreshold(delta)) return
        draggedRef.current = true
        positions = movedPositions(origins, delta)
        Object.entries(positions).forEach(([path, at]) => applyPosition(elements[path], at))
      }
      const end = () => positions && onCommit(positions)
      track(event, { move, end })
    },
    [layerRef, positionOf, onCommit, track],
  )
  const dragged = useCallback(() => draggedRef.current, [])
  return useMemo(() => ({ start, dragged }), [start, dragged])
}
