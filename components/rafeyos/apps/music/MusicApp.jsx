import { useVfs } from '../../state/logic/contexts'
import { HeaderBar } from '../../wm/HeaderBar'
import { NowPlaying } from './NowPlaying'

/** Rafey's one song as a now-playing player. Playback lives in MusicProvider, so closing this keeps it going. */
export const MusicApp = () => {
  const { track } = useVfs().content.music
  return (
    <div className="np">
      <HeaderBar className="np-hb" />
      <NowPlaying track={track} />
    </div>
  )
}
