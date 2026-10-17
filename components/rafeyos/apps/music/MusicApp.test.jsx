// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import {
  chooseMenuItem,
  clickDock,
  menuLabels,
  openPowerMenu,
  renderDesktop,
  settle,
  windowsOf,
} from '../../testing/renderRafeyOS'
import { fakeAudioFactory } from '../../testing/fakeAudio'

afterEach(cleanup)

const openMusic = (overrides) => {
  const view = renderDesktop(overrides)
  clickDock('Music')
  const [win] = windowsOf(view.container, 'music')
  return { ...view, win, ui: within(win) }
}

const audioOf = (services) => services.createAudio.last()
const banner = () => screen.queryByRole('status')
const trackRow = (win) => win.querySelector('tr.trk')

describe('Music app', () => {
  it('shows the track and the library', () => {
    const { win, ui } = openMusic()

    expect(win.querySelector('.mu-now b').textContent).toBe('Storms Ahead')
    expect(win.querySelector('.mu-now small').textContent).toBe('by Ramé Sivano')
    expect([...trackRow(win).cells].map((cell) => cell.textContent)).toEqual(['1', 'Storms Ahead', 'Ramé Sivano', '2:38'])
    expect(win.querySelector('.artist')).toBeNull()
    expect(ui.getByRole('button', { name: 'Music' }).className).toBe('srow on')
    ;['Podcasts', 'Radio', 'My Top Rated', 'Recently Added'].forEach((name) => {
      expect(ui.getByRole('button', { name }).disabled).toBe(true)
    })
  })

  it('sums the real length and size in the status bar', () => {
    const { win } = openMusic()

    expect(win.querySelector('.statusbar').textContent).toBe('1 song, 3 minutes, 5.1 MB')
  })

  it('plays on a double-click of the track and marks it with a speaker', async () => {
    const { win, services } = openMusic()

    fireEvent.click(trackRow(win))
    expect(trackRow(win).className).toBe('trk sel')
    fireEvent.doubleClick(trackRow(win))
    await settle()

    expect(audioOf(services).play).toHaveBeenCalledTimes(1)
    expect(within(win).getByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(trackRow(win).cells[0].querySelector('svg')).toBeTruthy()
    expect(banner().textContent).toBe('Storms AheadRamé Sivano')
  })

  it('pauses, seeks with the slider and stops with Next', async () => {
    const { win, ui, services } = openMusic()
    fireEvent.click(ui.getByRole('button', { name: 'Play' }))
    await settle()
    const audio = audioOf(services)

    fireEvent.change(ui.getByRole('slider', { name: 'Position' }), { target: { value: '90' } })
    expect(audio.seek).toHaveBeenLastCalledWith(90)
    expect(win.querySelector('.mu-prog .t0').textContent).toBe('1:30')

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

  it('opens the volume popover, which leads to the Sound page', () => {
    const { container, ui } = openMusic()

    fireEvent.click(ui.getByRole('button', { name: 'Volume' }))
    expect(screen.getByRole('menu').textContent).toContain('Volume 70%')
    expect(menuLabels()).toEqual(['Open Sound Settings'])
    chooseMenuItem('Open Sound Settings')

    expect(windowsOf(container, 'settings')[0].getAttribute('aria-label')).toBe('Sound')
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
    const { win, ui, services } = openMusic({ createAudio: fakeAudioFactory({ refuse: true }) })

    fireEvent.click(ui.getByRole('button', { name: 'Play' }))
    await settle()

    expect(audioOf(services).play).toHaveBeenCalled()
    expect(ui.getByRole('button', { name: 'Play' })).toBeTruthy()
    expect(trackRow(win).cells[0].textContent).toBe('1')
    expect(banner()).toBeNull()
  })
})
