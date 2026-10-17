import { describe, it, expect } from 'vitest'
import { ARTIST_BLURB, formatTime, getFeaturedTrack } from './music.js'

describe('featured track metadata', () => {
  it('carries the measured file size and duration', () => {
    const track = getFeaturedTrack()

    expect(track.sizeBytes).toBe(5073188)
    expect(track.durationSeconds).toBe(158)
    expect(formatTime(track.durationSeconds)).toBe('2:38')
  })
})

describe('ARTIST_BLURB', () => {
  it('matches the blurb the music command printed before extraction', () => {
    expect(ARTIST_BLURB).toBe(
      'Rafey releases music as Ramé Sivano. He founded a record label and set up a recording studio in East London.',
    )
  })
})

describe('formatTime', () => {
  it('formats whole seconds as m:ss', () => {
    expect(formatTime(190)).toBe('3:10')
  })
})
