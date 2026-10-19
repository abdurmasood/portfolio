import { useMusic, useMusicControls } from '@/components/rafeyos/state/logic/contexts'
import { formatDuration } from '@/components/rafeyos/core/vfs/content'
import { Slider } from '@/components/rafeyos/ui/controls/Slider'
import { useWaveLevels } from './logic/useWaveLevels'
import { NO_DRAG_PROPS } from '@/components/rafeyos/ui/logic/domHooks'

const BAR_COUNT = 48
// The shortest bar, so quiet passages and the not-yet-decoded state still read as a waveform
const MIN_BAR_LEVEL = 0.12

const percent = (level) => `${Math.round(Math.max(MIN_BAR_LEVEL, level) * 100)}%`

/**
 * The track's waveform as the position control. The bars are drawn; a transparent native range
 * input lies on top, so clicks, drags, keys and screen readers all work as on any slider.
 */
export const WaveScrubber = ({ track }) => {
  const { position } = useMusic()
  const music = useMusicControls()
  const levels = useWaveLevels(track.src, BAR_COUNT) ?? Array(BAR_COUNT).fill(0)
  const duration = track.durationSeconds
  const playedBars = Math.round((position / duration) * BAR_COUNT)
  return (
    <div className="np-scrub">
      <div className="np-wave" {...NO_DRAG_PROPS}>
        <div className="np-bars" aria-hidden="true">
          {levels.map((level, bar) => (
            // Bars never reorder, so the index is a stable key
            <i key={bar} className={bar < playedBars ? 'on' : undefined} style={{ height: percent(level) }} />
          ))}
        </div>
        <Slider value={position} range={{ min: 0, max: duration }} label="Position" onChange={music.seek} />
      </div>
      <div className="np-times">
        <span className="np-elapsed">{formatDuration(position)}</span>
        <span className="np-remaining">−{formatDuration(duration - position)}</span>
      </div>
    </div>
  )
}
