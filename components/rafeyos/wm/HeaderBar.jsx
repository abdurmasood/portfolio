import { useWindowChrome } from './WindowChromeContext'
import { WindowControls } from './WindowControls'

const IGNORE_DOUBLE_CLICK = 'button, input, a, .nodrag'

/**
 * A draggable GNOME header bar: start items, optional centre, end items, window controls
 * and a centred title. Double-clicking empty space toggles maximize.
 */
export const HeaderBar = ({ start, center, end, title, subtitle, controls = true, className = '' }) => {
  const { startDrag, toggleMax } = useWindowChrome()
  const onDoubleClick = (event) => {
    if (!event.target.closest(IGNORE_DOUBLE_CLICK)) toggleMax()
  }
  return (
    <div className={`hb ${className}`.trim()} onPointerDown={startDrag} onDoubleClick={onDoubleClick}>
      {start}
      <span className="sp" />
      {center}
      {center && <span className="sp" />}
      {end}
      {controls && <WindowControls />}
      {title && (
        <div className="ttl">
          <b>{title}</b>
          {subtitle && <small>{subtitle}</small>}
        </div>
      )}
    </div>
  )
}
