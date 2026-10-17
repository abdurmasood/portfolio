// Decoded audio for waveforms, shared by the home terminal's player and rafeyOS Music

// Decoding a 5MB mp3 is expensive, so each file is decoded once per page load
const sampleCache = new Map()

/** @returns {Promise<Float32Array>} the first channel's samples */
export const loadSamples = (src) => {
  if (!sampleCache.has(src)) {
    const pending = fetch(src)
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        const context = new AudioContextClass()
        return context.decodeAudioData(buffer).finally(() => context.close())
      })
      .then((audioBuffer) => audioBuffer.getChannelData(0))
    // Let a failed decode be retried on the next play
    pending.catch(() => sampleCache.delete(src))
    sampleCache.set(src, pending)
  }
  return sampleCache.get(src)
}
