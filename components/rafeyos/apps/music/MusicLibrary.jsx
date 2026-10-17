import { useState } from 'react'
import { useMusic, useMusicControls } from '../../state/contexts'
import { formatDuration } from '../../vfs/content'
import { Sym } from '../../icons/symbols'

// Library and playlists as in GNOME Music; only Music has anything in it
const LIBRARY = Object.freeze([
  { label: 'Music', icon: 'music', active: true },
  { label: 'Podcasts', icon: 'recent' },
  { label: 'Radio', icon: 'wifi' },
])
const PLAYLISTS = Object.freeze([
  { label: 'My Top Rated', icon: 'star' },
  { label: 'Recently Added', icon: 'list' },
])

const SourceRow = ({ source }) => (
  <button type="button" className={source.active ? 'srow on' : 'srow'} disabled={!source.active}>
    <Sym name={source.icon} />
    <span>{source.label}</span>
  </button>
)

export const MusicSidebar = () => (
  <div className="side">
    <div className="slist" role="navigation" aria-label="Library" style={{ paddingTop: 10 }}>
      <div className="mhead">Library</div>
      {LIBRARY.map((source) => (
        <SourceRow key={source.label} source={source} />
      ))}
      <div className="mhead" style={{ marginTop: 8 }}>
        Playlists
      </div>
      {PLAYLISTS.map((source) => (
        <SourceRow key={source.label} source={source} />
      ))}
    </div>
  </div>
)

/** "1" until the track has played; then a speaker while it plays, a pause sign while it doesn't. */
const TrackNumber = () => {
  const { playing, played } = useMusic()
  if (!played) return '1'
  return <Sym name={playing ? 'vol' : 'pause'} />
}

/** The one-row track table: click selects, double-click (or Enter) plays. */
export const TrackTable = ({ track }) => {
  const music = useMusicControls()
  const [selected, setSelected] = useState(false)
  return (
    <table className="tt">
      <thead>
        <tr>
          <th />
          <th>Title</th>
          <th>Artist</th>
          <th className="t">Time</th>
        </tr>
      </thead>
      <tbody>
        <tr
          className={selected ? 'trk sel' : 'trk'}
          tabIndex={0}
          onClick={() => setSelected(true)}
          onDoubleClick={music.play}
          onKeyDown={(event) => event.key === 'Enter' && music.play()}
        >
          <td className="n">
            <TrackNumber />
          </td>
          <td>{track.title}</td>
          <td>{track.artist}</td>
          <td className="t">{formatDuration(track.durationSeconds)}</td>
        </tr>
      </tbody>
    </table>
  )
}
