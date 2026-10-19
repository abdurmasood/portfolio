import { useEffect, useState } from 'react'
import { useServices } from '@/components/rafeyos/state/logic/contexts'
import { computeLevels } from '@/components/rafeyos/core/vfs/content'

/**
 * The track's loudness as `barCount` levels from 0 to 1, or null until the audio has decoded.
 * It stays null if the browser can't decode the file, and the waveform then draws flat bars.
 */
export const useWaveLevels = (src, barCount) => {
  const { loadAudioSamples } = useServices()
  const [levels, setLevels] = useState(null)
  useEffect(() => {
    let cancelled = false
    loadAudioSamples(src).then(
      (samples) => {
        if (!cancelled) setLevels(computeLevels(samples, barCount))
      },
      // A failed decode is a cosmetic loss: playback uses its own element, so nothing else breaks
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [loadAudioSamples, src, barCount])
  return levels
}
