import { useMusic, useMusicControls, useSettings } from '../../state/contexts'
import { formatDuration } from '../../vfs/content'
import { HeaderBar } from '../../wm/HeaderBar'
import { Sym } from '../../icons/symbols'
import { Slider } from '../../shell/controls'
import { belowElement, useMenu } from '../../shell/useMenu'
import { menuHeading, menuItem } from '../../shell/menuItems'
import { useOpenSettings } from '../settings/useOpenSettings'
import { SETTINGS_PAGES } from '../settings/settingsPages'

// The mockup pulls the volume popover this far left of its button
const VOLUME_MENU_SHIFT = 120

/** The volume button's popover: the shared level, and a way to the Sound page. */
const useVolumeMenu = () => {
  const { volume } = useSettings()
  const openMenu = useMenu()
  const openSettings = useOpenSettings()
  return (event) => {
    const items = [
      menuHeading(`Volume ${volume}%`),
      menuItem('Open Sound Settings', () => openSettings(SETTINGS_PAGES.SOUND)),
    ]
    openMenu(items, belowElement(event.currentTarget, VOLUME_MENU_SHIFT))
  }
}

const Transport = () => {
  const { playing } = useMusic()
  const music = useMusicControls()
  return (
    <span className="ctl">
      <button type="button" className="flat" aria-label="Previous" onClick={music.prev}>
        <Sym name="prev" />
      </button>
      <button type="button" className="flat" aria-label={playing ? 'Pause' : 'Play'} onClick={music.toggle}>
        <Sym name={playing ? 'pause' : 'play'} />
      </button>
      <button type="button" className="flat" aria-label="Next" onClick={music.next}>
        <Sym name="next" />
      </button>
    </span>
  )
}

const NowPlaying = ({ track }) => {
  const { position } = useMusic()
  const music = useMusicControls()
  return (
    <div className="mu-now nodrag">
      <div className="mu-prog">
        <span className="t0">{formatDuration(position)}</span>
        <Slider value={position} range={{ min: 0, max: track.durationSeconds }} label="Position" onChange={music.seek} />
        <span>{formatDuration(track.durationSeconds)}</span>
      </div>
    </div>
  )
}

/** Transport controls, the now-playing block with its position slider, and the volume popover. */
export const MusicHeader = ({ track }) => {
  const openVolumeMenu = useVolumeMenu()
  return (
    <HeaderBar
      className="mu-hb"
      start={<Transport />}
      center={<NowPlaying track={track} />}
      end={
        <button type="button" className="flat" aria-label="Volume" onClick={openVolumeMenu}>
          <Sym name="vol" />
        </button>
      }
    />
  )
}
