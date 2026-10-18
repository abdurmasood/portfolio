import { useCallback } from 'react'
import { useLayout, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { usePointerTrack } from './usePointerTrack'
import { startResize, stepResize } from './gestures'
import { applyRect } from './applyRect'
import { SNAP_MODES } from '@/components/rafeyos/core/geometry'
import { getApp } from '@/components/rafeyos/core/catalog/apps'

/** Edge and corner resizing for normal (unsnapped) windows; one commit on release. */
export const useWindowResize = ({ elementRef, winRef }) => {
  const windowManager = useWindowManager()
  const { area } = useLayout()
  const track = usePointerTrack()
  return useCallback(
    (event, edge) => {
      event.stopPropagation()
      event.preventDefault()
      const win = winRef.current
      windowManager.focus(win.id)
      if (win.mode !== SNAP_MODES.NORMAL) return
      let resize = startResize(win, { x: event.clientX, y: event.clientY }, { edge, min: getApp(win.appId).minSize, area })
      const move = (point) => {
        resize = stepResize(resize, point)
        applyRect(elementRef.current, resize.rect)
      }
      const end = () => resize.moved && windowManager.commitRect(win.id, resize.rect)
      track(event, { move, end })
    },
    [elementRef, winRef, windowManager, area, track],
  )
}
