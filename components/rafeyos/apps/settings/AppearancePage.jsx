import { useSettings } from '../../state/contexts'
import { STYLES } from '../../state/settingsReducer'
import { WALLS } from '../../theme/walls'
import { ACCENTS } from '../../theme/accents'
import { Group, Page } from './SettingsRows'
import { useSettingActions } from './useSettingActions'

// Window colours for each style's mini preview (the mockup's --win and --hb)
const PREVIEW_COLOURS = Object.freeze({
  [STYLES.LIGHT]: { body: '#fafafa', header: '#ebebeb' },
  [STYLES.DARK]: { body: '#242424', header: '#303030' },
})
const WINDOW_SHADOW = '0 2px 6px rgba(0,0,0,.3)'

/** Two overlapping windows on the current wallpaper, with an accent-coloured button. */
const StylePreview = ({ style, wall, accent }) => {
  const { body, header } = PREVIEW_COLOURS[style]
  return (
    <div className="pv" style={{ background: wall.css }} data-wall={wall.name}>
      <i style={{ left: '12%', top: '18%', width: '56%', height: '62%', background: body, boxShadow: WINDOW_SHADOW }} />
      <i style={{ left: '12%', top: '18%', width: '56%', height: '14%', background: header, borderRadius: '6px 6px 0 0' }} />
      <i style={{ left: '34%', top: '34%', width: '54%', height: '52%', background: body, boxShadow: WINDOW_SHADOW }} />
      <i style={{ left: '34%', top: '34%', width: '54%', height: '12%', background: header, borderRadius: '6px 6px 0 0' }} />
      <i style={{ left: '40%', top: '52%', width: '14%', height: '8%', background: accent, borderRadius: 3 }} />
    </div>
  )
}

const STYLE_CARDS = Object.freeze([
  { style: STYLES.LIGHT, label: 'Default' },
  { style: STYLES.DARK, label: 'Dark' },
])

const StyleCards = ({ settings, onPick }) => (
  <div className="styles">
    {STYLE_CARDS.map(({ style, label }) => (
      <button
        key={style}
        type="button"
        className={settings.style === style ? 'stc on' : 'stc'}
        aria-pressed={settings.style === style}
        onClick={() => onPick(style)}
      >
        <StylePreview style={style} wall={WALLS[settings.wall] ?? WALLS[0]} accent={settings.accent} />
        <span>{label}</span>
      </button>
    ))}
  </div>
)

/** Style, accent colour and wallpaper, all applied live. */
export const AppearancePage = () => {
  const settings = useSettings()
  const { set } = useSettingActions()
  return (
    <Page>
      <Group title="Style">
        <StyleCards settings={settings} onPick={(style) => set('style', style)} />
      </Group>
      <Group title="Color">
        <div className="boxed accents">
          {ACCENTS.map(({ name, hex }) => (
            <button
              key={hex}
              type="button"
              className={settings.accent === hex ? 'acc on' : 'acc'}
              style={{ background: hex }}
              aria-label={name}
              aria-pressed={settings.accent === hex}
              title={name}
              onClick={() => set('accent', hex)}
            />
          ))}
        </div>
      </Group>
      <Group title="Background">
        <div className="walls">
          {WALLS.map((wall, i) => (
            <button
              key={wall.name}
              type="button"
              className={settings.wall === i ? 'wl on' : 'wl'}
              style={{ background: wall.css }}
              aria-label={wall.name}
              aria-pressed={settings.wall === i}
              title={wall.name}
              onClick={() => set('wall', i)}
            />
          ))}
        </div>
      </Group>
    </Page>
  )
}
