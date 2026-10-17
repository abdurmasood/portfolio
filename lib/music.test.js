import { describe, it, expect } from 'vitest'
import { ARTIST_BLURB, computeLevels, computePeaks, formatTime, getFeaturedTrack } from './music.js'

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

describe('computeLevels', () => {
  it('gives one 0..1 level per bar, normalised to the loudest bar', () => {
    const samples = Float32Array.from([0.5, -0.5, 0.25, -0.25, 1, -1, 0, 0])

    expect(computeLevels(samples, 4)).toEqual([0.5, 0.25, 1, 0])
  })

  it('gives zeros for silence instead of dividing by zero', () => {
    expect(computeLevels(new Float32Array(8), 4)).toEqual([0, 0, 0, 0])
  })
})

describe('computePeaks', () => {
  it('maps each level to the nearest block character', () => {
    const samples = Float32Array.from([0.5, -0.5, 0.25, -0.25, 1, -1, 0, 0])

    expect(computePeaks(samples, 4)).toEqual(['▅', '▃', '█', '▁'])
  })
})
