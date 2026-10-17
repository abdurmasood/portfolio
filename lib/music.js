// Single source for Rafey's music: used by the home terminal (`music`) and /journey

export const TRACKS = [
  {
    id: 'storms-ahead',
    title: 'Storms Ahead',
    artist: 'Ramé Sivano',
    src: '/background-music.mp3',
    featured: true,
    sizeBytes: 5073188,
    // Measured with ffprobe: 158.54s
    durationSeconds: 158,
  },
]

export const MILESTONES = [
  { year: 2006, event: 'Picked up a guitar for the first time', short: 'first guitar' },
  { year: 2011, event: 'Started his journey touring as a cover artist in Pakistan', short: 'touring Pakistan' },
  { year: 2016, event: 'Moved to London & started focusing on his lyrical expression', short: 'moved to London' },
  { year: 2022, event: 'Incorporated his own record label & got signed to Studio X', short: 'own label · Studio X' },
  { year: 2027, event: 'Release date of his debut album', short: 'debut album', upcoming: true },
]

const YEAR_WIDTH = 4
// A year plus at least one space before the next one
const MIN_YEAR_GAP = YEAR_WIDTH + 1
const MIN_LABEL_GAP = 2
const WAVE_LEVELS = '▁▂▃▄▅▆▇█'

export const getTrack = (trackId) => TRACKS.find((track) => track.id === trackId)

// Deterministic on purpose: a visitor gets one listen, so it should be the featured track
export const getFeaturedTrack = () => TRACKS.find((track) => track.featured) ?? TRACKS[0]

export const ARTIST_BLURB = `Rafey releases music as ${getFeaturedTrack().artist}. He founded a record label and set up a recording studio in East London.`

export const milestoneLabel = (milestone) =>
  milestone.upcoming ? `${milestone.short} · upcoming` : milestone.short

const writeAt = (chars, start, text) => {
  for (let i = 0; i < text.length; i += 1) {
    chars[start + i] = text[i]
  }
}

/**
 * Lays the milestones out on a ruler where distance is proportional to time.
 *
 * @param {Array} milestones - sorted oldest first
 * @param {number} columns - width available for the ruler itself
 * @param {number} labelColumns - width labels may extend to (labels can run past the ruler)
 * @returns {{ years: string, rail: string, labelRows: string[] | null }}
 *   labelRows is null when two-row labels would collide or overflow; render a list instead.
 */
export const layoutRuler = (milestones, columns, labelColumns = columns) => {
  const firstYear = milestones[0].year
  const span = milestones[milestones.length - 1].year - firstYear || 1
  const usable = Math.max(columns - YEAR_WIDTH, 0)

  const positions = []
  milestones.forEach((milestone, index) => {
    const scaled = Math.round(((milestone.year - firstYear) / span) * usable)
    positions.push(index === 0 ? scaled : Math.max(scaled, positions[index - 1] + MIN_YEAR_GAP))
  })

  const lastPosition = positions[positions.length - 1]
  const years = Array(lastPosition + YEAR_WIDTH).fill(' ')
  const rail = Array(lastPosition + 1).fill('─')
  milestones.forEach((milestone, index) => {
    writeAt(years, positions[index], String(milestone.year))
    rail[positions[index]] = milestone.upcoming ? '○' : '●'
  })

  // Labels alternate between two rows so neighbours don't collide
  const rows = ['', '']
  let labelsFit = true
  milestones.forEach((milestone, index) => {
    const row = index % 2
    const label = milestoneLabel(milestone)
    const start = positions[index]
    const gapNeeded = rows[row].length === 0 ? 0 : MIN_LABEL_GAP
    if (start < rows[row].length + gapNeeded || start + label.length > labelColumns) {
      labelsFit = false
      return
    }
    rows[row] = rows[row].padEnd(start, ' ') + label
  })

  return {
    years: years.join(''),
    rail: rail.join(''),
    labelRows: labelsFit ? rows : null,
  }
}

/**
 * Turns decoded audio samples into one loudness level per bar: RMS per bucket, normalised so the
 * loudest bar is 1. O(n) over the samples.
 */
export const computeLevels = (samples, barCount) => {
  const bucketSize = Math.max(1, Math.floor(samples.length / barCount))
  const energies = []
  for (let bar = 0; bar < barCount; bar += 1) {
    let sum = 0
    const start = bar * bucketSize
    const end = Math.min(start + bucketSize, samples.length)
    for (let i = start; i < end; i += 1) {
      sum += samples[i] * samples[i]
    }
    energies.push(end > start ? Math.sqrt(sum / (end - start)) : 0)
  }
  const loudest = Math.max(...energies) || 1
  return energies.map((energy) => energy / loudest)
}

/** One block character per bar, for the terminal's waveform. */
export const computePeaks = (samples, barCount) =>
  computeLevels(samples, barCount).map((level) => WAVE_LEVELS[Math.round(level * (WAVE_LEVELS.length - 1))])

export const formatTime = (seconds) => {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
