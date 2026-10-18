import { MusicControlsContext, MusicStateContext, useVfs } from './logic/contexts'
import { useMusicPlayer } from './logic/useMusicPlayer'

/**
 * Owns playback for the whole desktop, so music keeps going when the Music window closes.
 * Children pass through untouched: a position tick re-renders only useMusic() consumers.
 */
export const MusicProvider = ({ children }) => {
  const { track } = useVfs().content.music
  const { state, controls } = useMusicPlayer(track)
  return (
    <MusicControlsContext.Provider value={controls}>
      <MusicStateContext.Provider value={state}>{children}</MusicStateContext.Provider>
    </MusicControlsContext.Provider>
  )
}
