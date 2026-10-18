import { useLayout, useSettings } from '../../state/logic/contexts'
import { DOCK_POSITIONS, ICON_CORNERS, ICON_SIZE_RANGE } from '../../state/logic/settingsReducer'
import { Sym } from '../../icons/symbols'
import { Slider, Switch } from '../../shell/chrome/controls'
import { belowElement, useMenu } from '../../shell/menus/logic/useMenu'
import { menuItem } from '../../shell/menus/logic/menuItems'
import { BoxedGroup, Page, Row } from './SettingsRows'
import { useSettingActions } from './logic/useSettingActions'

export const CORNER_LABELS = Object.freeze({ tl: 'Top Left', tr: 'Top Right', bl: 'Bottom Left', br: 'Bottom Right' })

const capitalised = (word) => word[0].toUpperCase() + word.slice(1)

const CornerDropdown = ({ corner, onPick }) => {
  const openMenu = useMenu()
  const open = (event) =>
    openMenu(
      ICON_CORNERS.map((option) => menuItem(CORNER_LABELS[option], () => onPick(option))),
      belowElement(event.currentTarget),
    )
  return (
    <button type="button" className="dd" aria-haspopup="menu" onClick={open}>
      {CORNER_LABELS[corner]} <Sym name="down" />
    </button>
  )
}

const DockPosition = ({ dockPos, onPick }) => (
  <div className="seg" role="group" aria-label="Position on Screen">
    {DOCK_POSITIONS.map((position) => (
      <button
        key={position}
        type="button"
        className={dockPos === position ? 'on' : undefined}
        aria-pressed={dockPos === position}
        onClick={() => onPick(position)}
      >
        {capitalised(position)}
      </button>
    ))}
  </div>
)

/** Desktop icons (Home, where new icons go) and the dock (icon size, side of the screen). */
export const DesktopPage = () => {
  const { showHome, corner, iconSize, dockPos } = useSettings()
  const { compact } = useLayout()
  const { set, toggle } = useSettingActions()
  return (
    <Page>
      <BoxedGroup title="Desktop Icons">
        <Row title="Show Personal Folder" subtitle="Show the personal folder on the desktop">
          <Switch on={showHome} label="Show Personal Folder" onToggle={() => toggle('showHome')} />
        </Row>
        <Row title="Position of New Icons">
          <CornerDropdown corner={corner} onPick={(value) => set('corner', value)} />
        </Row>
      </BoxedGroup>
      <BoxedGroup title="Dock" note={compact ? 'The dock moves to the bottom on small screens.' : undefined}>
        <Row title="Icon Size">
          <Slider
            value={iconSize}
            range={ICON_SIZE_RANGE}
            label="Icon size"
            style={{ maxWidth: 220 }}
            onChange={(value) => set('iconSize', value)}
          />
        </Row>
        <Row title="Position on Screen">
          <DockPosition dockPos={dockPos} onPick={(value) => set('dockPos', value)} />
        </Row>
      </BoxedGroup>
    </Page>
  )
}
