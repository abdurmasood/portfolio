import { useMusic, useMusicControls, useSettings, useSettingsDispatch } from '@/components/rafeyos/state/logic/contexts'
import { VOLUME_RANGE, SETTINGS_ACTIONS } from '@/components/rafeyos/state/logic/settingsReducer'
import { AppIcon } from '@/components/rafeyos/ui/icons/appIcons'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { Slider } from '@/components/rafeyos/ui/controls/Slider'
import { WaveScrubber } from './WaveScrubber'
import { APP } from '@/components/rafeyos/core/catalog/apps'

// There's no cover art yet: the dock's disc stands in, so the window matches the icon clicked
const Artwork = () => (
  <div className="np-art">
    <AppIcon name={APP.MUSIC} className="np-disc" />
  </div>
)

const Transport = () => {
  const { playing, repeat } = useMusic()
  const music = useMusicControls()
  return (
    <div className="np-ctl">
      <div className="np-tr">
        <button type="button" className="flat" aria-label="Previous" onClick={music.prev}>
          <Sym name="prev" />
        </button>
        <button type="button" className="np-play" aria-label={playing ? 'Pause' : 'Play'} onClick={music.toggle}>
          <Sym name={playing ? 'pause' : 'play'} />
        </button>
        <button type="button" className="flat" aria-label="Next" onClick={music.next}>
          <Sym name="next" />
        </button>
      </div>
      <button type="button" className={repeat ? 'flat on' : 'flat'} aria-label="Repeat" aria-pressed={repeat} onClick={music.toggleRepeat}>
        <Sym name="repeat" />
      </button>
    </div>
  )
}

/** The system output volume, the same setting as Quick Settings and Settings → Sound. */
const VolumeRow = () => {
  const { volume } = useSettings()
  const dispatch = useSettingsDispatch()
  return (
    <div className="np-vol">
      <Sym name="vol0" />
      <Slider
        value={volume}
        range={VOLUME_RANGE}
        label="Player volume"
        onChange={(value) => dispatch({ type: SETTINGS_ACTIONS.SET, key: 'volume', value })}
      />
      <Sym name="vol" />
    </div>
  )
}

/** Amberol-style player for the one track: artwork, title, waveform, transport and volume. */
export const NowPlaying = ({ track }) => (
  <div className="np-body">
    <Artwork />
    <div className="np-info">
      <b>{track.title}</b>
      <span>{track.artist}</span>
    </div>
    <WaveScrubber track={track} />
    <Transport />
    <VolumeRow />
  </div>
)
