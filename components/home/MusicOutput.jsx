'use client'

import { useEffect, useRef, useState } from 'react'
import { MILESTONES, computePeaks, formatTime, getTrack, layoutRuler, milestoneLabel } from '../../lib/music'
import { loadSamples } from '../../lib/audioSamples'

const MAX_RULER_COLUMNS = 72
const MIN_WAVE_BARS = 32
const MAX_WAVE_BARS = 96
const SEEK_SECONDS = 5

// ● ○ ─ ▁…█ aren't in the loaded JetBrains Mono subset; the fallback font is wider than 1ch,
// so each glyph gets its own fixed cell to keep columns aligned
const Cells = ({ text, className }) => (
  <span className={className}>
    {[...text].map((character, index) => (
      <span key={index} className={character === '○' ? 'cell is-open' : 'cell'}>{character}</span>
    ))}
  </span>
)

// Width of the element in monospace columns; output is laid out by column like a real terminal
const useColumns = (elementRef) => {
  const [columns, setColumns] = useState(0)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return undefined

    const probe = document.createElement('span')
    probe.textContent = '0'.repeat(10)
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre'
    element.appendChild(probe)

    const measure = () => {
      const columnWidth = probe.getBoundingClientRect().width / 10
      if (columnWidth > 0) {
        setColumns(Math.floor(element.clientWidth / columnWidth))
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => {
      observer.disconnect()
      probe.remove()
    }
  }, [elementRef])

  return columns
}

export function MusicStory() {
  const blockRef = useRef(null)
  const columns = useColumns(blockRef)
  const ruler = columns > 0 ? layoutRuler(MILESTONES, Math.min(columns, MAX_RULER_COLUMNS), columns) : null

  return (
    <div className="terminal-block" ref={blockRef}>
      {ruler && (
        <>
          <p className="music-line dim">{ruler.years}</p>
          <p className="music-line marker"><Cells text={ruler.rail} /></p>
          {ruler.labelRows ? (
            ruler.labelRows.map((row, index) => <p key={index} className="music-line">{row}</p>)
          ) : (
            <>
              <div className="gap-half" />
              {MILESTONES.map((milestone) => (
                <p key={milestone.year} className="music-line">
                  <span className="dim">{milestone.year}  </span>
                  {milestoneLabel(milestone)}
                </p>
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}

function StoppedLine({ track, stoppedAt, duration }) {
  const position = stoppedAt === undefined ? '' : ` at ${formatTime(stoppedAt)} / ${formatTime(duration)}`
  return (
    <p className="music-line dim">
      ■ stopped{position} · {track.title} — {track.artist}
    </p>
  )
}

function ActivePlayer({ track, onStop }) {
  const blockRef = useRef(null)
  const audioRef = useRef(null)
  const stoppedRef = useRef(false)
  const onStopRef = useRef(onStop)
  const [samples, setSamples] = useState(null)
  const [decodeFailed, setDecodeFailed] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const columns = useColumns(blockRef)
  const barCount = Math.min(Math.max(columns, MIN_WAVE_BARS), MAX_WAVE_BARS)

  onStopRef.current = onStop

  const stop = () => {
    if (stoppedRef.current) return
    stoppedRef.current = true
    const audio = audioRef.current
    audio.pause()
    onStopRef.current({ at: audio.currentTime, duration: audio.duration })
  }

  const togglePause = () => {
    const audio = audioRef.current
    if (audio.paused) {
      audio.play().catch(() => setIsPaused(true))
    } else {
      audio.pause()
    }
  }

  const seek = (seconds) => {
    const audio = audioRef.current
    const end = Number.isFinite(audio.duration) ? audio.duration : audio.currentTime
    audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), end)
  }

  // Runs inside the Enter keypress that issued `music play`, so browsers allow the sound
  useEffect(() => {
    const audio = new Audio(track.src)
    audioRef.current = audio
    const syncPaused = () => setIsPaused(audio.paused)
    const syncDuration = () => setDuration(audio.duration)
    audio.addEventListener('play', syncPaused)
    audio.addEventListener('pause', syncPaused)
    audio.addEventListener('loadedmetadata', syncDuration)
    audio.addEventListener('ended', stop)
    audio.play().catch(() => setIsPaused(true))

    return () => {
      audio.removeEventListener('play', syncPaused)
      audio.removeEventListener('pause', syncPaused)
      audio.removeEventListener('loadedmetadata', syncDuration)
      audio.removeEventListener('ended', stop)
      // Only pause here: StrictMode re-runs this effect in dev, so recording a stop would end playback
      audio.pause()
    }
  }, [track.src])

  useEffect(() => {
    let cancelled = false
    loadSamples(track.src)
      .then((decoded) => { if (!cancelled) setSamples(decoded) })
      .catch(() => { if (!cancelled) setDecodeFailed(true) })
    return () => { cancelled = true }
  }, [track.src])

  // Only re-render when the visible second changes, not on every animation frame
  useEffect(() => {
    let frame
    const tick = () => {
      const audio = audioRef.current
      if (audio) {
        setPosition((previous) => (Math.floor(previous) === Math.floor(audio.currentTime) ? previous : audio.currentTime))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === ' ') {
        event.preventDefault()
        togglePause()
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        seek(event.key === 'ArrowLeft' ? -SEEK_SECONDS : SEEK_SECONDS)
      } else if (event.key === 'q' || event.key === 'Escape' || (event.ctrlKey && event.key === 'c')) {
        event.preventDefault()
        stop()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const bars = samples ? computePeaks(samples, barCount) : decodeFailed ? Array(barCount).fill('▁') : null
  const playedBars = duration > 0 ? Math.round((position / duration) * barCount) : 0

  return (
    <div className="terminal-block music-player" ref={blockRef}>
      <p className="music-line">
        <span className={`player-state${isPaused ? ' is-paused' : ''}`}>{isPaused ? '‖ paused ' : '▶ playing'}</span>
        {'   '}{track.title} <span className="dim">· {track.artist}</span>
      </p>
      <p className="music-line" aria-hidden="true">
        {bars ? (
          <>
            <Cells className="wave-played" text={bars.slice(0, playedBars).join('')} />
            <Cells className="wave-rest" text={bars.slice(playedBars).join('')} />
          </>
        ) : (
          <span className="dim">loading {track.title}…</span>
        )}
      </p>
      <p className="music-line">
        {formatTime(position)}<span className="dim"> / {formatTime(duration)}</span>
      </p>
      <p className="music-line dim player-keys">
        <span className="player-key">space</span> {isPaused ? 'resume' : 'pause'} · <span className="player-key">←/→</span> seek · <span className="player-key">q</span> quit
      </p>
      <div className="player-taps">
        <button type="button" onClick={togglePause}>[ {isPaused ? 'play' : 'pause'} ]</button>
        <button type="button" onClick={() => seek(-SEEK_SECONDS)} aria-label="Seek back 5 seconds">[ -5s ]</button>
        <button type="button" onClick={() => seek(SEEK_SECONDS)} aria-label="Seek forward 5 seconds">[ +5s ]</button>
        <button type="button" onClick={stop}>[ stop ]</button>
      </div>
    </div>
  )
}

export function MusicPlayer({ trackId, active, stoppedAt, duration, onStop }) {
  const track = getTrack(trackId)
  if (!track) {
    return <p className="error-text">music: no such track: {trackId}</p>
  }
  return active
    ? <ActivePlayer track={track} onStop={onStop} />
    : <StoppedLine track={track} stoppedAt={stoppedAt} duration={duration} />
}
