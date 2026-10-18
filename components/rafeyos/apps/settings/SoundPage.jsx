import { useMusic, useSettings, useVfs } from '../../state/contexts'
import { VOLUME_RANGE } from '../../state/settingsReducer'
import { Slider } from '../../shell/chrome/controls'
import { BoxedGroup, Page, Row, ValueRow } from './SettingsRows'
import { useSettingActions } from './useSettingActions'

/** The music app's stream, as GNOME lists each app playing sound. */
const MusicLevel = () => {
  const { playing, played } = useMusic()
  const { track } = useVfs().content.music
  return (
    <Row title="Music" subtitle={played ? `${track.title} · ${track.artist}` : 'Not playing'}>
      <span className="rv">{playing ? 'Playing' : ''}</span>
    </Row>
  )
}

/** Output device and volume (the same volume as Quick Settings and Music). */
export const SoundPage = () => {
  const { volume } = useSettings()
  const { set } = useSettingActions()
  return (
    <Page>
      <BoxedGroup title="Output">
        <ValueRow title="Output Device" value="Speakers – Built-in Audio" />
        <Row title="Output Volume">
          <Slider
            value={volume}
            range={VOLUME_RANGE}
            label="Output volume"
            style={{ maxWidth: 260 }}
            onChange={(value) => set('volume', value)}
          />
        </Row>
      </BoxedGroup>
      <BoxedGroup title="Volume Levels">
        <MusicLevel />
      </BoxedGroup>
    </Page>
  )
}
