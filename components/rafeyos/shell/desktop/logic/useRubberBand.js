import { useCallback } from 'react'
import { usePointerTrack } from '@/components/rafeyos/wm/logic/usePointerTrack'
import { rectOfElement } from '@/components/rafeyos/ui/logic/dom'
import { pointOfEvent } from '@/components/rafeyos/ui/menus/logic/useMenu'
import { bandRect, pathsInBand, sameSelection } from './rubberBand'

const measureIcons = (layer) =>
  [...layer.querySelectorAll('.dicon')].map((element) => ({ path: element.dataset.path, rect: rectOfElement(element) }))

const drawBand = (element, rect) => {
  element.hidden = false
  element.style.left = `${rect.x}px`
  element.style.top = `${rect.y}px`
  element.style.width = `${rect.w}px`
  element.style.height = `${rect.h}px`
}

/**
 * Drag on the wallpaper to select icons. The band is drawn imperatively; the selection
 * updates at most once per frame, and only when it changes.
 * @param {{ bandRef, layerRef, onSelect: Function }} refs - the band element, the icons layer, the selection setter
 * @returns {(event: PointerEvent) => void} call from the wallpaper's pointerdown
 */
export const useRubberBand = ({ bandRef, layerRef, onSelect }) => {
  const track = usePointerTrack()
  return useCallback(
    (event) => {
      const start = pointOfEvent(event)
      // Icons don't move during the band, so measure once
      const icons = measureIcons(layerRef.current)
      let selected = []
      const move = (point) => {
        const rect = bandRect(start, point)
        drawBand(bandRef.current, rect)
        const next = pathsInBand(rect, icons)
        if (sameSelection(next, selected)) return
        selected = next
        onSelect(next)
      }
      const end = () => {
        bandRef.current.hidden = true
      }
      track(event, { move, end })
    },
    [bandRef, layerRef, onSelect, track],
  )
}
