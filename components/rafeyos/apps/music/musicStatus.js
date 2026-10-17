import { humanBytes } from '../../vfs/format'

const SECONDS_PER_MINUTE = 60

const counted = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

/**
 * GNOME Music's status bar: "1 song, 3 minutes, 5.1 MB", from the tracks' real length and size.
 * @param {{ durationSeconds: number, sizeBytes: number }[]} tracks
 */
export const musicStatusText = (tracks) => {
  const seconds = tracks.reduce((sum, track) => sum + track.durationSeconds, 0)
  const bytes = tracks.reduce((sum, track) => sum + track.sizeBytes, 0)
  const minutes = Math.round(seconds / SECONDS_PER_MINUTE)
  return `${counted(tracks.length, 'song')}, ${counted(minutes, 'minute')}, ${humanBytes(bytes)}`
}
