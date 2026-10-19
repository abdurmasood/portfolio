import { useCallback } from 'react'
import { useLayout, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { usePointerTrack } from './usePointerTrack'
import { startDrag, stepDrag } from './gestures'
import { applyPosition } from './applyRect'
import { NO_DRAG } from '@/components/rafeyos/ui/logic/domHooks'

/**
 * Header drag: style writes per frame, one commit (snap or rect) on release.
 * Pulling a snapped window free commits its unsnapped size once, at that moment.
 */
export const useWindowDrag = ({ elementRef, winRef }) => {
  const windowManager = useWindowManager()
  const { area } = useLayout()
  const track = usePointerTrack()
  return useCallback(
    (event) => {
      if (event.button !== 0 || event.target.closest(NO_DRAG)) return
      event.preventDefault()
      const { id } = winRef.current
      let drag = startDrag(winRef.current, { x: event.clientX, y: event.clientY }, area)
      const move = (point) => {
        drag = stepDrag(drag, point)
        if (!drag.moved) return
        // Commit the moved rect, not the origin, so the re-render lands where the pointer already is
        if (drag.unsnapped) windowManager.unsnap(id, drag.rect)
        applyPosition(elementRef.current, drag.rect)
        windowManager.snapPreview.set(drag.mode)
      }
      const end = () => {
        windowManager.snapPreview.set(null)
        if (!drag.moved) return
        if (drag.mode) windowManager.snap(id, drag.mode)
        else windowManager.commitRect(id, drag.rect)
      }
      track(event, { move, end })
    },
    [elementRef, winRef, windowManager, area, track],
  )
}
