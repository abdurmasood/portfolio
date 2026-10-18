import { describe, expect, it, vi } from 'vitest'
import { createAudio } from '@/components/rafeyos/services/audio'

/** Stands in for HTMLAudioElement: the properties and methods the adapter uses. */
class FakeElement extends EventTarget {
  constructor(src) {
    super()
    this.src = src
    this.currentTime = 0
    this.duration = 158
    this.volume = 1
    this.preload = 'auto'
    this.play = vi.fn(() => Promise.resolve())
    this.pause = vi.fn()
    this.load = vi.fn()
    FakeElement.last = this
  }

  removeAttribute(name) {
    if (name === 'src') this.src = ''
  }
}

describe('audio adapter', () => {
  it('wraps the element without downloading up front', async () => {
    const audio = createAudio('/song.mp3', FakeElement)
    const element = FakeElement.last

    expect(element.src).toBe('/song.mp3')
    expect(element.preload).toBe('none')
    await expect(audio.play()).resolves.toBeUndefined()
    audio.pause()
    audio.seek(42)

    expect(element.play).toHaveBeenCalled()
    expect(element.pause).toHaveBeenCalled()
    expect(audio.currentTime()).toBe(42)
    expect(audio.duration()).toBe(158)
  })

  it('maps volume 0-100 to 0-1, clamped', () => {
    const audio = createAudio('/s.mp3', FakeElement)

    audio.setVolume(70)
    expect(FakeElement.last.volume).toBe(0.7)
    audio.setVolume(140)
    expect(FakeElement.last.volume).toBe(1)
    audio.setVolume(-5)
    expect(FakeElement.last.volume).toBe(0)
  })

  it('always returns a promise from play, rejecting on refusal or a throw', async () => {
    const audio = createAudio('/s.mp3', FakeElement)
    const refused = Object.assign(new Error('blocked'), { name: 'NotAllowedError' })

    FakeElement.last.play.mockReturnValueOnce(Promise.reject(refused))
    await expect(audio.play()).rejects.toBe(refused)
    FakeElement.last.play.mockImplementationOnce(() => {
      throw new Error('sync')
    })
    await expect(audio.play()).rejects.toThrow('sync')
    FakeElement.last.play.mockReturnValueOnce(undefined)
    await expect(audio.play()).resolves.toBeUndefined()
  })

  it('reports time updates and the end, until unsubscribed', () => {
    const audio = createAudio('/s.mp3', FakeElement)
    const element = FakeElement.last
    const onTime = vi.fn()
    const onEnded = vi.fn()
    const stopTime = audio.onTime(onTime)
    audio.onEnded(onEnded)

    element.currentTime = 12.5
    element.dispatchEvent(new Event('timeupdate'))
    element.dispatchEvent(new Event('ended'))
    stopTime()
    element.dispatchEvent(new Event('timeupdate'))

    expect(onTime).toHaveBeenCalledTimes(1)
    expect(onTime).toHaveBeenCalledWith(12.5)
    expect(onEnded).toHaveBeenCalledTimes(1)
  })

  it("reports the element's own play and pause, until unsubscribed", () => {
    const audio = createAudio('/s.mp3', FakeElement)
    const element = FakeElement.last
    const onPlay = vi.fn()
    const onPause = vi.fn()
    audio.onPlay(onPlay)
    const stopPause = audio.onPause(onPause)

    element.dispatchEvent(new Event('play'))
    element.dispatchEvent(new Event('pause'))
    stopPause()
    element.dispatchEvent(new Event('pause'))

    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(onPause).toHaveBeenCalledTimes(1)
  })

  it('destroy stops, unsubscribes everything and releases the source', () => {
    const audio = createAudio('/s.mp3', FakeElement)
    const element = FakeElement.last
    const onEnded = vi.fn()
    audio.onEnded(onEnded)

    audio.destroy()
    element.dispatchEvent(new Event('ended'))

    expect(element.pause).toHaveBeenCalled()
    expect(element.src).toBe('')
    expect(element.load).toHaveBeenCalled()
    expect(onEnded).not.toHaveBeenCalled()
  })
})
