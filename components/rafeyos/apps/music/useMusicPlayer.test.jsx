// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { clickDock, fakeServices, openTerminal, renderDesktop, settle, typeCommand, windowsOf } from '../../testing/renderRafeyOS'
import { fakeAudioFactory } from '../../testing/fakeAudio'
import { ServicesContext, ShellDispatchContext, VfsContext, useMusic, useMusicControls } from '../../state/contexts'
import { SettingsProvider } from '../../state/SettingsProvider'
import { buildContent } from '../../vfs/content'
import { MusicProvider } from './MusicProvider'

afterEach(cleanup)

const openMusic = (overrides) => {
  const view = renderDesktop(overrides)
  clickDock('Music')
  const [win] = windowsOf(view.container, 'music')
  return { ...view, win, ui: within(win) }
}

const play = async (ui) => {
  fireEvent.click(ui.getByRole('button', { name: 'Play' }))
  await settle()
}

/** The player alone, with a probe that exposes its state and controls. */
const renderPlayer = (overrides = {}) => {
  const services = fakeServices(overrides)
  const latest = {}
  const Probe = () => {
    latest.music = useMusic()
    latest.controls = useMusicControls()
    return null
  }
  render(
    <ServicesContext.Provider value={services}>
      <VfsContext.Provider value={{ content: buildContent(), vfs: {} }}>
        <SettingsProvider>
          <ShellDispatchContext.Provider value={vi.fn()}>
            <MusicProvider>
              <Probe />
            </MusicProvider>
          </ShellDispatchContext.Provider>
        </SettingsProvider>
      </VfsContext.Provider>
    </ServicesContext.Provider>,
  )
  return { controls: () => latest.controls, music: () => latest.music, createAudio: services.createAudio }
}

const elapsed = (win) => win.querySelector('.np-elapsed').textContent
const openQuickSettings = () => fireEvent.click(screen.getByRole('button', { name: 'System menu' }))
const setQuickVolume = (value) => {
  fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: String(value) } })
}

describe('music player', () => {
  it('creates the audio on the first play only, at the current volume', async () => {
    const { ui, services } = openMusic()
    expect(services.createAudio).not.toHaveBeenCalled()

    await play(ui)
    fireEvent.click(ui.getByRole('button', { name: 'Pause' }))
    await play(ui)

    expect(services.createAudio).toHaveBeenCalledTimes(1)
    expect(services.createAudio.last().volume).toBe(70)
    expect(services.createAudio.last().play).toHaveBeenCalledTimes(2)
  })

  it("moves the position with the element's time updates, in whole seconds", async () => {
    const { win, ui, services } = openMusic()
    await play(ui)

    act(() => services.createAudio.last().emitTime(65.8))

    expect(elapsed(win)).toBe('1:05')
    expect(ui.getByRole('slider', { name: 'Position' }).value).toBe('65')
  })

  it('goes back to the start and stops when the track ends', async () => {
    const { win, ui, services } = openMusic()
    await play(ui)
    const audio = services.createAudio.last()
    act(() => audio.emitTime(150))

    act(() => audio.emitEnded())

    expect(elapsed(win)).toBe('0:00')
    expect(audio.seek).toHaveBeenLastCalledWith(0)
    expect(ui.getByRole('button', { name: 'Play' })).toBeTruthy()
  })

  it('starts from a position chosen before the first play', async () => {
    const { ui, services } = openMusic()

    fireEvent.change(ui.getByRole('slider', { name: 'Position' }), { target: { value: '30' } })
    await play(ui)

    expect(services.createAudio.last().seek).toHaveBeenCalledWith(30)
  })

  it('follows the shared volume setting', async () => {
    const { ui, services } = openMusic()
    await play(ui)

    openQuickSettings()
    setQuickVolume(25)

    expect(services.createAudio.last().setVolume).toHaveBeenLastCalledWith(25)
  })

  it('shows no banner with Do Not Disturb on', async () => {
    const { ui } = openMusic()
    fireEvent.click(screen.getByRole('button', { name: 'Date and time' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Do Not Disturb' }))

    await play(ui)

    expect(ui.getByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('ignores a play that finishes after the visitor already paused', async () => {
    const { ui, services } = openMusic()
    fireEvent.click(ui.getByRole('button', { name: 'Play' }))
    fireEvent.click(ui.getByRole('button', { name: 'Pause' }))
    await settle()

    expect(services.createAudio.last().play).toHaveBeenCalledTimes(1)
    expect(ui.getByRole('button', { name: 'Play' })).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('does not restart a track that is already playing', async () => {
    const { container, ui, services } = openMusic()
    await play(ui)
    const { input } = openTerminal(container)

    typeCommand(input, 'music play')
    await settle()

    expect(services.createAudio.last().play).toHaveBeenCalledTimes(1)
  })

  it('stays paused and rethrows playback errors other than a refusal', async () => {
    const broken = Object.assign(new Error('no such file'), { name: 'NotSupportedError' })
    const { controls, music, createAudio } = renderPlayer()
    createAudio.mockImplementationOnce((src) => {
      const audio = fakeAudioFactory()(src)
      audio.play.mockReturnValue(Promise.reject(broken))
      return audio
    })

    await act(async () => {
      await expect(controls().play()).rejects.toBe(broken)
    })

    expect(music()).toEqual({ playing: false, position: 0, played: false, repeat: false })
  })

  it('follows a pause from outside rafeyOS (a media key, the browser controls)', async () => {
    const { ui, services } = openMusic()
    await play(ui)
    const audio = services.createAudio.last()

    act(() => audio.emitPause())

    expect(ui.getByRole('button', { name: 'Play' })).toBeTruthy()
    await play(ui)
    expect(audio.play).toHaveBeenCalledTimes(2)
  })

  it('follows a play from outside rafeyOS', async () => {
    const { ui, services } = openMusic()
    await play(ui)
    fireEvent.click(ui.getByRole('button', { name: 'Pause' }))
    const audio = services.createAudio.last()

    act(() => audio.emitPlay())

    expect(ui.getByRole('button', { name: 'Pause' })).toBeTruthy()
    fireEvent.click(ui.getByRole('button', { name: 'Pause' }))
    expect(audio.pause).toHaveBeenCalledTimes(2)
  })

  it("ignores the element's echo of its own play and pause", async () => {
    const { music, controls, createAudio } = renderPlayer()
    await act(async () => {
      await controls().play()
    })
    const audio = createAudio.last()

    act(() => audio.emitPlay())
    expect(music().playing).toBe(true)
    act(() => controls().pause())
    act(() => audio.emitPause())

    expect(music().playing).toBe(false)
  })

  it('cancels a pending play when paused from outside', async () => {
    const { music, controls, createAudio } = renderPlayer()
    let finish
    createAudio.mockImplementationOnce((src) => {
      const audio = fakeAudioFactory()(src)
      audio.play.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      return audio
    })
    let pending
    act(() => {
      pending = controls().play()
    })

    act(() => createAudio.mock.results[0].value.emitPause())
    await act(async () => {
      finish()
      await expect(pending).resolves.toBe(false)
    })

    expect(music().playing).toBe(false)
  })

  it('resolves false when the browser refuses, and true when already playing', async () => {
    const refused = renderPlayer({ createAudio: fakeAudioFactory({ refuse: true }) })
    await act(async () => {
      await expect(refused.controls().play()).resolves.toBe(false)
    })
    cleanup()

    const { controls, createAudio } = renderPlayer()
    await act(async () => {
      await expect(controls().play()).resolves.toBe(true)
      await expect(controls().play()).resolves.toBe(true)
    })
    expect(createAudio.last().play).toHaveBeenCalledTimes(1)
  })

})

describe('media session', () => {
  const fakeSession = () => {
    const session = { setHandlers: vi.fn(() => session.remove), remove: vi.fn(), setMetadata: vi.fn(), setPlaybackState: vi.fn() }
    return session
  }

  it('wires the OS media controls to the player, and unwires them with the desktop', async () => {
    const mediaSession = fakeSession()
    const view = renderPlayer({ mediaSession })
    const [[handlers]] = mediaSession.setHandlers.mock.calls

    await act(async () => {
      await handlers.play()
    })
    expect(view.music().playing).toBe(true)
    act(() => handlers.pause())
    expect(view.music().playing).toBe(false)
    expect(handlers.previoustrack).toBe(view.controls().prev)
    expect(handlers.nexttrack).toBe(view.controls().next)

    cleanup()
    expect(mediaSession.remove).toHaveBeenCalled()
  })

  it('shows the track and its state once it has played', async () => {
    const mediaSession = fakeSession()
    const { controls } = renderPlayer({ mediaSession })
    expect(mediaSession.setMetadata).not.toHaveBeenCalled()

    await act(async () => {
      await controls().play()
    })
    act(() => controls().pause())

    expect(mediaSession.setMetadata).toHaveBeenCalledWith(expect.objectContaining({ title: expect.any(String) }))
    expect(mediaSession.setPlaybackState).toHaveBeenCalledWith(true)
    expect(mediaSession.setPlaybackState).toHaveBeenLastCalledWith(false)
  })
})
