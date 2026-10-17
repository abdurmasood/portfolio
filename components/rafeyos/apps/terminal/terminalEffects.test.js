import { describe, expect, it, vi } from 'vitest'
import { applyTerminalEffects } from './terminalEffects'
import { realVfs } from '../../vfs/testVfs'

const handlers = (overrides = {}) => ({
  vfs: realVfs,
  windowManager: { openApp: vi.fn(() => true), openPath: vi.fn(() => true) },
  openExternal: vi.fn(),
  openLink: vi.fn(),
  play: vi.fn(),
  closeSelf: vi.fn(),
  logout: vi.fn(),
  ...overrides,
})

describe('terminal effects', () => {
  it('runs window and browser effects without notes', () => {
    const deps = handlers()

    const outcome = applyTerminalEffects(
      [
        { type: 'openApp', app: 'files', path: '~' },
        { type: 'openPath', path: '~/blog' },
        { type: 'openLink', href: 'https://x' },
        { type: 'openExternal', href: '/journey' },
        { type: 'closeSelf' },
        { type: 'logout' },
      ],
      deps,
    )

    expect(outcome).toEqual({ notes: [], clear: false })
    expect(deps.windowManager.openApp).toHaveBeenCalledWith('files', { path: '~' })
    expect(deps.openLink).toHaveBeenCalledTimes(1)
    expect(deps.openExternal).toHaveBeenCalledWith('/journey')
    expect(deps.closeSelf).toHaveBeenCalled()
    expect(deps.logout).toHaveBeenCalled()
  })

  it('notes apps and file types that have no UI yet', () => {
    const deps = handlers({ windowManager: { openApp: () => false, openPath: () => false } })

    const { notes } = applyTerminalEffects(
      [{ type: 'openApp', app: 'projects' }, { type: 'openPath', path: '~/Desktop/bio.txt' }],
      deps,
    )

    expect(notes.map((line) => line.text)).toEqual(["Projects isn't available yet", "Text Editor isn't available yet"])
  })

  it('plays without a window, and plays an opened audio file as Music opens', () => {
    const deps = handlers()

    const quiet = applyTerminalEffects([{ type: 'play' }], deps)
    expect(quiet.notes).toEqual([])
    expect(deps.play).toHaveBeenCalledTimes(1)
    expect(deps.windowManager.openApp).not.toHaveBeenCalled()

    applyTerminalEffects([{ type: 'openPath', path: '~/Music/storms-ahead.mp3' }], deps)
    expect(deps.play).toHaveBeenCalledTimes(2)
    expect(deps.windowManager.openPath).toHaveBeenCalledWith('~/Music/storms-ahead.mp3')
  })

  it('asks before opening a web link file', () => {
    const deps = handlers()

    const { notes } = applyTerminalEffects([{ type: 'openPath', path: '~/contact/linkedin.desktop' }], deps)

    expect(notes).toEqual([])
    expect(deps.openLink).toHaveBeenCalledTimes(1)
    expect(deps.windowManager.openPath).not.toHaveBeenCalled()
  })

  it('flags clear', () => {
    expect(applyTerminalEffects([{ type: 'clear' }], handlers()).clear).toBe(true)
  })

  it('rejects effects it does not know', () => {
    expect(() => applyTerminalEffects([{ type: 'beep' }], handlers())).toThrow('Unknown terminal effect: beep')
  })
})
