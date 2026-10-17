import { useSyncExternalStore } from 'react'
import { useLayout, useWindowManager } from '../state/contexts'
import { snapRect } from './geometry'

const INSET = 6

/** The translucent target shown while a drag would snap; re-renders only when the mode changes. */
export const SnapPreview = () => {
  const { snapPreview } = useWindowManager()
  const { area } = useLayout()
  const mode = useSyncExternalStore(snapPreview.subscribe, snapPreview.get, snapPreview.get)
  const rect = mode ? snapRect(area, mode) : null
  const style = rect
    ? { left: rect.x + INSET, top: rect.y + INSET, width: rect.w - INSET * 2, height: rect.h - INSET * 2 }
    : undefined
  return <div className={mode ? 'snap on' : 'snap'} style={style} />
}
