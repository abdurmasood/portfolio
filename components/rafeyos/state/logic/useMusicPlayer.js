// The music player: real playback through the injected audio adapter, state in musicReducer.
// The adapter is created on the first play, which always comes from a click or a key press,
// so the browser's autoplay policy allows it; if it refuses anyway, the player stays paused.
import { useEffect, useMemo, useReducer, useRef } from 'react'
import { useServices, useSettings } from './contexts'
import { useLatest } from './useLatest'
import { useNotify } from '@/components/rafeyos/state/logic/useNotify'
import { initialMusic, musicReducer, MUSIC_ACTIONS } from './musicReducer'
import { APP } from '@/components/rafeyos/core/catalog/apps'

// Refusals the visitor caused or expects (autoplay policy, a pause during play()): no error to show
const QUIET_REJECTIONS = new Set(['NotAllowedError', 'AbortError'])

/**
 * The element's own play and pause events. Our controls set `intent` before they act, so these
 * only change anything when something else did it: a hardware media key, the browser's controls.
 */
const followElement = (audio, { refs, dispatch }) => {
  audio.onPause(() => {
    if (!refs.intent.current) return
    // Also cancels a play() still pending
    refs.token.current += 1
    refs.intent.current = false
    dispatch({ type: MUSIC_ACTIONS.PAUSE })
  })
  audio.onPlay(() => {
    if (refs.intent.current) return
    refs.intent.current = true
    dispatch({ type: MUSIC_ACTIONS.STARTED })
  })
}

/** At the end: back to the start, then either stop or, with repeat on, play again. */
const onTrackEnded = (audio, { refs, dispatch, replay }) => () => {
  refs.token.current += 1
  refs.intent.current = false
  audio.seek(0)
  dispatch({ type: MUSIC_ACTIONS.STOP })
  if (refs.state.current.repeat) replay()
}

const ensureAudio = (deps) => {
  const { refs, createAudio, track, dispatch } = deps
  if (refs.audio.current) return refs.audio.current
  const audio = createAudio(track.src)
  audio.setVolume(refs.volume.current)
  if (refs.state.current.position) audio.seek(refs.state.current.position)
  audio.onTime((seconds) => dispatch({ type: MUSIC_ACTIONS.TIME, position: seconds }))
  audio.onEnded(onTrackEnded(audio, deps))
  followElement(audio, deps)
  refs.audio.current = audio
  return audio
}

// A repeat restarts quietly: the banner is for the visitor's own play, not every loop
const createPlay = (deps) => {
  const withReplay = { ...deps, replay: () => startPlayback(withReplay, false) }
  return () => startPlayback(withReplay, true)
}

const startPlayback = (deps, announce) => {
  const { refs, dispatch, notify, track } = deps
  if (refs.intent.current) return Promise.resolve(true)
  const audio = ensureAudio(deps)
  refs.intent.current = true
  const token = ++refs.token.current
  const isCurrent = () => token === refs.token.current
  dispatch({ type: MUSIC_ACTIONS.REQUEST })
  return audio.play().then(
    () => {
      if (!isCurrent()) return false
      dispatch({ type: MUSIC_ACTIONS.STARTED })
      if (announce) notify({ appId: APP.MUSIC, title: track.title, body: track.artist })
      return true
    },
    (error) => {
      if (isCurrent()) {
        refs.intent.current = false
        dispatch({ type: MUSIC_ACTIONS.BLOCKED })
      }
      if (!QUIET_REJECTIONS.has(error?.name)) throw error
      return false
    },
  )
}

/** @returns {{ play, pause, toggle, seek, prev, next, toggleRepeat }} */
const createControls = (deps) => {
  const { refs, dispatch } = deps
  const play = createPlay(deps)
  const halt = (type) => {
    refs.token.current += 1
    refs.intent.current = false
    refs.audio.current?.pause()
    dispatch({ type })
  }
  const seek = (seconds) => {
    refs.audio.current?.seek(seconds)
    dispatch({ type: MUSIC_ACTIONS.SEEK, position: seconds })
  }
  const pause = () => halt(MUSIC_ACTIONS.PAUSE)
  return Object.freeze({
    play,
    pause,
    toggle: () => (refs.intent.current ? pause() : play()),
    seek,
    prev: () => seek(0),
    // GNOME Music with one song: next ends the queue, back at the start
    next: () => {
      refs.audio.current?.seek(0)
      halt(MUSIC_ACTIONS.STOP)
    },
    toggleRepeat: () => dispatch({ type: MUSIC_ACTIONS.TOGGLE_REPEAT }),
  })
}

/** Stops and releases the audio when the desktop goes (logout, restart, leaving the route). */
const useReleaseOnUnmount = (refs) => {
  useEffect(
    () => () => {
      refs.token.current += 1
      refs.intent.current = false
      refs.audio.current?.destroy()
      refs.audio.current = null
    },
    [refs],
  )
}

/**
 * The OS media controls: play/pause/previous/next call the player; the track shows once it has
 * played. Skipped where the browser has no Media Session API.
 */
const useMediaSession = ({ mediaSession, controls, track, state }) => {
  useEffect(() => {
    if (!mediaSession) return undefined
    const { play, pause, prev, next } = controls
    return mediaSession.setHandlers({ play, pause, previoustrack: prev, nexttrack: next })
  }, [mediaSession, controls])
  const { played, playing } = state
  useEffect(() => {
    if (mediaSession && played) mediaSession.setMetadata(track)
  }, [mediaSession, played, track])
  useEffect(() => {
    if (mediaSession && played) mediaSession.setPlaybackState(playing)
  }, [mediaSession, played, playing])
}

/**
 * @param {{ src: string, title: string, artist: string }} track
 * @returns {{ state: { playing, position, played, repeat }, controls: { play, pause, toggle, seek, prev, next, toggleRepeat } }}
 */
export const useMusicPlayer = (track) => {
  const { createAudio, mediaSession } = useServices()
  const { volume } = useSettings()
  const notify = useNotify()
  const [state, dispatch] = useReducer(musicReducer, initialMusic)
  const audio = useRef(null)
  const token = useRef(0)
  const intent = useRef(false)
  const volumeRef = useLatest(volume)
  const stateRef = useLatest(state)
  const refs = useMemo(() => ({ audio, token, intent, volume: volumeRef, state: stateRef }), [volumeRef, stateRef])
  useEffect(() => {
    audio.current?.setVolume(volume)
  }, [volume])
  useReleaseOnUnmount(refs)
  const controls = useMemo(
    () => createControls({ refs, createAudio, track, dispatch, notify }),
    [refs, createAudio, track, notify],
  )
  useMediaSession({ mediaSession, controls, track, state })
  return { state, controls }
}
