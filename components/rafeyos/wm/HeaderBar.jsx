import { useWindowChrome } from './logic/WindowChromeContext'
import { WindowControls } from './WindowControls'
import { NO_DRAG } from '@/components/rafeyos/ui/logic/domHooks'

/**
 * A draggable GNOME header bar: start items, optional centre, end items, window controls
 * and a centred title. Double-clicking empty space toggles maximize. `children` render
 * after the window controls.
 *
 * With a centre, the bar is a three-column grid so the centre sits on the window's middle
 * like GTK's, however wide each side is. Flat siblings and spacers can't do that.
 */
export const HeaderBar = ({ start, center, end, title, subtitle, controls = true, className = '', children }) => {
  const { startDrag, toggleMax } = useWindowChrome()
  const onDoubleClick = (event) => {
    if (!event.target.closest(NO_DRAG)) toggleMax()
  }
  const controlsNode = controls && <WindowControls />
  return (
    <div className={`hb ${center ? 'hb-center ' : ''}${className}`.trim()} onPointerDown={startDrag} onDoubleClick={onDoubleClick}>
      {center ? (
        <>
          <span className="hb-start">{start}</span>
          {center}
          <span className="hb-end">
            {end}
            {controlsNode}
          </span>
        </>
      ) : (
        <>
          {start}
          <span className="sp" />
          {end}
          {controlsNode}
        </>
      )}
      {title && (
        <div className="ttl">
          <b>{title}</b>
          {subtitle && <small>{subtitle}</small>}
        </div>
      )}
      {children}
    </div>
  )
}
