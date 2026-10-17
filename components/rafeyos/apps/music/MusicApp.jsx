import { useVfs } from '../../state/contexts'
import { MusicHeader } from './MusicHeader'
import { MusicSidebar, TrackTable } from './MusicLibrary'
import { musicStatusText } from './musicStatus'

/** GNOME Music with Rafey's one song. Playback lives in MusicProvider, so closing this keeps it going. */
export const MusicApp = () => {
  const { track } = useVfs().content.music
  return (
    <>
      <MusicHeader track={track} />
      <div className="split">
        <MusicSidebar />
        <div className="main">
          <div className="scroll">
            <TrackTable track={track} />
          </div>
        </div>
      </div>
      <div className="statusbar">{musicStatusText([track])}</div>
    </>
  )
}
