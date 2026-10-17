import { useSettings, useSettingsDispatch } from '../state/contexts'
import { STYLES, VOLUME_RANGE } from '../state/settingsReducer'
import { Sym } from '../icons/symbols'
import { Slider } from './controls'

// Quick Settings' toggle tiles, in the mockup's order. `key` is the setting each one toggles.
const TOGGLES = Object.freeze([
  { key: 'wifi', title: 'Wi-Fi', isOn: (s) => s.wifi, icon: (s) => (s.wifi ? 'wifi' : 'wifioff'), subtitle: (s) => (s.wifi ? 'rafey.ai' : '') },
  // Greyed out: there is no Bluetooth, so it cannot be pressed
  { key: 'bt', title: 'Bluetooth', isOn: (s) => s.bt, icon: () => 'bt', dimmed: true },
  { key: 'night', title: 'Night Light', isOn: (s) => s.night, icon: () => 'night' },
  { key: 'style', title: 'Dark Style', isOn: (s) => s.style === STYLES.DARK, icon: () => 'dark' },
])

const Toggle = ({ toggle, settings, onToggle }) => {
  const on = toggle.isOn(settings)
  const subtitle = toggle.subtitle?.(settings)
  return (
    <button
      type="button"
      className={`${on ? 'qt on' : 'qt'}${toggle.dimmed ? ' dim' : ''}`}
      aria-pressed={on}
      tabIndex={toggle.dimmed ? -1 : undefined}
      onClick={toggle.dimmed ? undefined : () => onToggle(toggle.key)}
    >
      <Sym name={toggle.icon(settings)} />
      <span>
        <b>{toggle.title}</b>
        {subtitle && <small>{subtitle}</small>}
      </span>
    </button>
  )
}

/** The output volume, shared with Settings → Sound and the Music player. */
export const QuickVolume = () => {
  const { volume } = useSettings()
  const dispatch = useSettingsDispatch()
  return (
    <div className="qs-sl">
      <span className="vi">
        <Sym name={volume === 0 ? 'vol0' : 'vol'} />
      </span>
      <Slider
        value={volume}
        range={VOLUME_RANGE}
        label="Volume"
        onChange={(value) => dispatch({ type: 'set', key: 'volume', value })}
      />
    </div>
  )
}

export const QuickToggles = () => {
  const settings = useSettings()
  const dispatch = useSettingsDispatch()
  const onToggle = (key) => dispatch({ type: 'toggle', key })
  return (
    <div className="qs-grid">
      {TOGGLES.map((toggle) => (
        <Toggle key={toggle.key} toggle={toggle} settings={settings} onToggle={onToggle} />
      ))}
    </div>
  )
}
