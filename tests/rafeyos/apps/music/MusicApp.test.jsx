// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import {
  clickDock,
  openPowerMenu,
  renderDesktop,
  settle,
  windowsOf,
} from '@/components/rafeyos/testing/renderRafeyOS'
import { fakeAudioFactory } from '@/components/rafeyos/testing/fakeAudio'

afterEach(cleanup)

const openMusic = (overrides) => {
  const view = renderDesktop(overrides)
  clickDock('Music')
  const [win] = windowsOf(view.container, 'music')
  return { ...view, win, ui: within(win) }
}

const audioOf = (services) => services.createAudio.last()
const banner = () => screen.queryByRole('status')

describe('Music app', () => {
  it('shows the one track as a now-playing player, not a library', () => {
    const { win, ui } = openMusic()

    expect(win.querySelector('.np-info').textContent).toBe('Storms AheadRamé Sivano')
    expect(win.querySelector('.np-art svg')).toBeTruthy()
    expect(ui.getByRole('slider', { name: 'Position' })).toBeTruthy()
    expect(win.querySelector('.np-remaining').textContent).toBe('−2:38')
    expect(win.querySelector('.side')).toBeNull()
    expect(win.querySelector('table')).toBeNull()
    expect(win.querySelector('.statusbar')).toBeNull()
  })

  it('draws the decoded waveform and lights the bars already played', async () => {
    const { win, ui } = openMusic()
    const bars = () => [...win.querySelectorAll('.np-bars i')]
    await settle()

    expect(bars()).toHaveLength(48)
    // The fake samples rise steadily, so the last bar is the loudest
    expect(bars().at(-1).style.height).toBe('100%')
    expect(bars()[0].style.height).toBe('12%')

    fireEvent.change(ui.getByRole('slider', { name: 'Position' }), { target: { value: '79' } })
    expect(bars().filter((bar) => bar.className === 'on')).toHaveLength(24)
  })

  it('keeps flat bars when the audio cannot be decoded', async () => {
    const { win } = openMusic({ loadAudioSamples: () => Promise.reject(new Error('EncodingError')) })
    await settle()

    const heights = [...win.querySelectorAll('.np-bars i')].map((bar) => bar.style.height)
    expect(new Set(heights)).toEqual(new Set(['12%']))
  })

  it('plays from the play button and announces the track', async () => {
    const { win, ui, services } = openMusic()

    fireEvent.click(ui.getByRole('button', { name: 'Play' }))
    await settle()

    expect(audioOf(services).play).toHaveBeenCalledTimes(1)
    expect(within(win).getByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(banner().textContent).toBe('Storms AheadRamé Sivano')
  })

  it('pauses, seeks with the waveform and stops with Next', async () => {
    const { win, ui, services } = openMusic()
    fireEvent.click(ui.getByRole('button', { name: 'Play' }))
    await settle()
    const audio = audioOf(services)

    fireEvent.change(ui.getByRole('slider', { name: 'Position' }), { target: { value: '90' } })
    expect(audio.seek).toHaveBeenLastCalledWith(90)
    expect(win.querySelector('.np-elapsed').textContent).toBe('1:30')
    expect(win.querySelector('.np-remaining').textContent).toBe('−1:08')

    fireEvent.click(ui.getByRole('button', { name: 'Pause' }))
    expect(audio.pause).toHaveBeenCalledTimes(1)
    expect(ui.getByRole('button', { name: 'Play' })).toBeTruthy()

    fireEvent.click(ui.getByRole('button', { name: 'Previous' }))
    expect(audio.seek).toHaveBeenLastCalledWith(0)
    fireEvent.change(ui.getByRole('slider', { name: 'Position' }), { target: { value: '40' } })
    fireEvent.click(ui.getByRole('button', { name: 'Next' }))
    expect(audio.seek).toHaveBeenLastCalledWith(0)
    expect(ui.getByRole('slider', { name: 'Position' }).value).toBe('0')
  })

  it('loops the track with repeat on, without announcing it again', async () => {
    const { ui, services } = openMusic()
    const repeat = ui.getByRole('button', { name: 'Repeat' })
    fireEvent.click(repeat)
    expect(repeat.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(ui.getByRole('button', { name: 'Play' }))
    await settle()
    const audio = audioOf(services)

    act(() => audio.emitEnded())
    await settle()

    expect(audio.seek).toHaveBeenLastCalledWith(0)
    expect(audio.play).toHaveBeenCalledTimes(2)
    expect(ui.getByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('sets the shared output volume from its own slider', async () => {
    const { ui, services } = openMusic()
    fireEvent.click(ui.getByRole('button', { name: 'Play' }))
    await settle()

    fireEvent.change(ui.getByRole('slider', { name: 'Player volume' }), { target: { value: '30' } })

    expect(audioOf(services).setVolume).toHaveBeenLastCalledWith(30)
    expect(ui.getByRole('slider', { name: 'Player volume' }).value).toBe('30')
  })

  it('keeps playing when its window closes', async () => {
    const { container, ui, services } = openMusic()
    fireEvent.click(ui.getByRole('button', { name: 'Play' }))
    await settle()

    fireEvent.click(ui.getByRole('button', { name: 'Close' }))

    expect(windowsOf(container, 'music')).toHaveLength(0)
    expect(audioOf(services).pause).not.toHaveBeenCalled()
    expect(audioOf(services).destroy).not.toHaveBeenCalled()
  })

  it('stops and releases the audio on logout', async () => {
    const { ui, services } = openMusic()
    fireEvent.click(ui.getByRole('button', { name: 'Play' }))
    await settle()

    openPowerMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Log Out…' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Log Out' })).getByRole('button', { name: 'Log Out' }))

    expect(audioOf(services).destroy).toHaveBeenCalledTimes(1)
    expect(services.navigate).toHaveBeenCalledWith('/')
  })

  it('stops and releases the audio when the route unmounts', async () => {
    const { ui, services, unmount } = openMusic()
    fireEvent.click(ui.getByRole('button', { name: 'Play' }))
    await settle()

    unmount()

    expect(audioOf(services).destroy).toHaveBeenCalledTimes(1)
  })

  it('stays paused, silently, when the browser refuses to play', async () => {
    const { ui, services } = openMusic({ createAudio: fakeAudioFactory({ refuse: true }) })

    fireEvent.click(ui.getByRole('button', { name: 'Play' }))
    await settle()

    expect(audioOf(services).play).toHaveBeenCalled()
    expect(ui.getByRole('button', { name: 'Play' })).toBeTruthy()
    expect(banner()).toBeNull()
  })
})
