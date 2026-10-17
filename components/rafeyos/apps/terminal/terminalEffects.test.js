import { describe, expect, it, vi } from 'vitest'
import { applyTerminalEffects } from './terminalEffects'
import { realVfs } from '../../vfs/testVfs'

const handlers = (overrides = {}) => ({
  vfs: realVfs,
  windowManager: { openApp: vi.fn(() => true), openPath: vi.fn(() => true) },
  openExternal: vi.fn(),
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
        { type: 'closeSelf' },
        { type: 'logout' },
      ],
      deps,
    )

    expect(outcome).toEqual({ notes: [], clear: false })
    expect(deps.windowManager.openApp).toHaveBeenCalledWith('files', { path: '~' })
    expect(deps.openExternal).toHaveBeenCalledWith('https://x')
    expect(deps.closeSelf).toHaveBeenCalled()
    expect(deps.logout).toHaveBeenCalled()
  })

  it('notes apps and file types that have no UI yet', () => {
    const deps = handlers({ windowManager: { openApp: () => false, openPath: () => false } })

    const { notes } = applyTerminalEffects(
      [{ type: 'openApp', app: 'mail' }, { type: 'openPath', path: '~/Music/story.txt' }, { type: 'play' }],
      deps,
    )

    expect(notes.map((line) => line.text)).toEqual([
      "Mail isn't available yet",
      "Text Editor isn't available yet",
      "Music isn't available yet",
    ])
  })

  it('flags clear', () => {
    expect(applyTerminalEffects([{ type: 'clear' }], handlers()).clear).toBe(true)
  })

  it('rejects effects it does not know', () => {
    expect(() => applyTerminalEffects([{ type: 'beep' }], handlers())).toThrow('Unknown terminal effect: beep')
  })
})
