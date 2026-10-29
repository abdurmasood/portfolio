import { describe, expect, it } from 'vitest'
import { createSettingsStore } from '@/components/rafeyos/core/settings/settingsStore'
import { settingsView } from '@/components/rafeyos/core/settings/settingsView'
import { memoryStorage } from '@/tests/rafeyos/helpers/renderRafeyOS'

const APPEARANCE_DEFAULTS = { accent: '#E95420', wall: 0, dockPos: 'bottom', iconSize: 40, showHome: true, corner: 'tl' }

const viewWith = (dark) => {
  const os = { dark }
  const view = settingsView({ store: createSettingsStore({ storage: memoryStorage() }), prefersDark: () => os.dark })
  return { view, os }
}

describe('settings view', () => {
  it('shows the appearance defaults, with the style the OS prefers while none is saved', () => {
    const { view, os } = viewWith(false)

    expect(view.effective()).toEqual({ ...APPEARANCE_DEFAULTS, style: 'light' })
    os.dark = true
    expect(view.get('style')).toBe('dark')
  })

  it('reads a value back straight after setting it, without waiting on a render', () => {
    const { view, os } = viewWith(true)

    expect(view.set('style', 'light').ok).toBe(true)
    view.set('dockPos', 'left')

    expect(view.get('style')).toBe('light')
    os.dark = false
    view.set('style', 'dark')
    expect(view.effective()).toEqual({ ...APPEARANCE_DEFAULTS, dockPos: 'left', style: 'dark' })
  })

  it('follows the OS again after a reset', () => {
    const { view } = viewWith(false)
    view.set('style', 'dark')
    view.set('accent', '#0073E5')

    expect(view.reset().ok).toBe(true)

    expect(view.effective()).toEqual({ ...APPEARANCE_DEFAULTS, style: 'light' })
  })
})
