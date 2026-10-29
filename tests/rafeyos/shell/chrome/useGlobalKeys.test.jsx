// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { openPowerMenu, openTerminal, renderDesktop, rightClick, windowsOf } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { KEY_ACTIONS, isTextField, keyDownAction } from '@/components/rafeyos/shell/chrome/logic/useGlobalKeys'
import { OVERVIEW_SEARCH_ID } from '@/components/rafeyos/shell/logic/shellIds'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const overview = () => screen.queryByRole('region', { name: 'Activities overview' })

const tapMeta = (target = document.body, key = 'Meta') => {
  fireEvent.keyDown(target, { key, metaKey: true })
  fireEvent.keyUp(target, { key })
}

const element = (html) => {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  return wrapper.firstChild
}

describe('keyDownAction', () => {
  const body = document.body

  it('maps the shell keys', () => {
    expect(keyDownAction({ key: 'Meta' }, { overviewOpen: false, target: body })).toBe(KEY_ACTIONS.ARM_META)
    expect(keyDownAction({ key: 'OS' }, { overviewOpen: false, target: body })).toBe(KEY_ACTIONS.ARM_META)
    expect(keyDownAction({ key: 'Escape' }, { overviewOpen: false, target: body })).toBe(KEY_ACTIONS.ESCAPE)
    expect(keyDownAction({ key: 't', ctrlKey: true, altKey: true }, { target: body })).toBe(KEY_ACTIONS.OPEN_TERMINAL)
    expect(keyDownAction({ key: 'a' }, { overviewOpen: false, target: body })).toBeNull()
  })

  it('knows Ctrl+Option+T on macOS by the physical key', () => {
    expect(keyDownAction({ key: '†', code: 'KeyT', ctrlKey: true, altKey: true }, { target: body })).toBe(KEY_ACTIONS.OPEN_TERMINAL)
  })

  it('sends plain typing in the overview to its search field', () => {
    expect(keyDownAction({ key: 'b' }, { overviewOpen: true, target: body })).toBe(KEY_ACTIONS.FOCUS_SEARCH)
    expect(keyDownAction({ key: 'b', ctrlKey: true }, { overviewOpen: true, target: body })).toBeNull()
    expect(keyDownAction({ key: 'Tab' }, { overviewOpen: true, target: body })).toBeNull()
  })

  it('leaves text fields alone, except for Esc and the overview search', () => {
    const input = element('<input>')
    const search = element(`<input id="${OVERVIEW_SEARCH_ID}">`)

    expect(isTextField(input)).toBe(true)
    expect(isTextField(element('<textarea></textarea>'))).toBe(true)
    expect(isTextField(search)).toBe(false)
    expect(isTextField(body)).toBe(false)
    expect(isTextField(null)).toBe(false)
    expect(keyDownAction({ key: 'Meta' }, { target: input })).toBeNull()
    expect(keyDownAction({ key: 't', ctrlKey: true, altKey: true }, { target: input })).toBeNull()
    expect(keyDownAction({ key: 'Escape' }, { target: input })).toBe(KEY_ACTIONS.ESCAPE)
    expect(keyDownAction({ key: 'Meta' }, { target: search })).toBe(KEY_ACTIONS.ARM_META)
    expect(keyDownAction({ key: 'b' }, { overviewOpen: true, target: search })).toBeNull()
  })
})

describe('Meta (Super)', () => {
  it('toggles the overview when pressed and released alone', () => {
    renderDesktop()

    tapMeta()
    expect(overview()).toBeTruthy()
    tapMeta()
    expect(overview()).toBeNull()
  })

  it('works from the overview search field, and with the OS key name', () => {
    renderDesktop()
    tapMeta(document.body, 'OS')

    tapMeta(screen.getByLabelText('Type to search'))

    expect(overview()).toBeNull()
  })

  it('does nothing as part of a shortcut or a click', () => {
    renderDesktop()

    fireEvent.keyDown(document.body, { key: 'Meta', metaKey: true })
    fireEvent.keyDown(document.body, { key: 'c', metaKey: true })
    fireEvent.keyUp(document.body, { key: 'Meta' })
    expect(overview()).toBeNull()

    fireEvent.keyDown(document.body, { key: 'Meta', metaKey: true })
    fireEvent.pointerDown(document.body)
    fireEvent.keyUp(document.body, { key: 'Meta' })
    expect(overview()).toBeNull()

    fireEvent.keyDown(document.body, { key: 'Meta', metaKey: true })
    fireEvent.blur(window)
    fireEvent.keyUp(document.body, { key: 'Meta' })
    expect(overview()).toBeNull()
  })

  it('is ignored while typing in a terminal', () => {
    const { container } = renderDesktop()
    const { input } = openTerminal(container)

    tapMeta(input)

    expect(overview()).toBeNull()
  })
})

describe('Ctrl+Alt+T', () => {
  it('opens a Terminal in Rafey\'s home', () => {
    const { container } = renderDesktop()

    fireEvent.keyDown(document.body, { key: 't', ctrlKey: true, altKey: true })

    const [terminal] = windowsOf(container, 'terminal')
    expect(terminal.getAttribute('aria-label')).toBe('visitor@rafey: /home/rafey')
  })

  it('opens another each time, leaving the overview first', () => {
    const { container } = renderDesktop()
    tapMeta()

    fireEvent.keyDown(document.body, { key: '†', code: 'KeyT', ctrlKey: true, altKey: true })
    fireEvent.keyDown(document.body, { key: 'T', ctrlKey: true, altKey: true, shiftKey: true })

    expect(overview()).toBeNull()
    expect(windowsOf(container, 'terminal')).toHaveLength(2)
  })

  it('is ignored inside a text field', () => {
    const { container } = renderDesktop()
    const { input } = openTerminal(container)

    fireEvent.keyDown(input, { key: 't', ctrlKey: true, altKey: true })

    expect(windowsOf(container, 'terminal')).toHaveLength(1)
  })
})

describe('Esc', () => {
  it('closes an open popup, even from a text field', () => {
    const { container } = renderDesktop()
    const { input } = openTerminal(container)
    fireEvent.click(screen.getByRole('button', { name: 'System menu' }))

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Quick settings' })).toBeNull()
  })

  it('closes a context menu', () => {
    renderDesktop()
    rightClick(screen.getByTestId('wallpaper'))

    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('cancels a power dialog', () => {
    renderDesktop()
    openPowerMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Log Out…' }))

    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Log Out' })).toBeNull()
  })
})

describe('global key listeners', () => {
  it('are off while the desktop is suspended', () => {
    const { container } = renderDesktop()
    openPowerMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }))

    fireEvent.keyDown(document.body, { key: 't', ctrlKey: true, altKey: true })
    tapMeta()
    expect(windowsOf(container, 'terminal')).toHaveLength(0)

    fireEvent.click(screen.getByRole('dialog', { name: 'Suspended' }))
    fireEvent.keyDown(document.body, { key: 't', ctrlKey: true, altKey: true })
    expect(windowsOf(container, 'terminal')).toHaveLength(1)
    expect(overview()).toBeNull()
  })

  it('are all removed when rafeyOS unmounts, so the home terminal keeps its keys', () => {
    const added = vi.spyOn(window, 'addEventListener')
    const removed = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderDesktop()
    const keyListeners = added.mock.calls.filter(([type]) => ['keydown', 'keyup', 'blur', 'pointerdown'].includes(type))
    expect(keyListeners.length).toBeGreaterThanOrEqual(4)

    act(() => unmount())

    const removedPairs = removed.mock.calls.map(([type, handler]) => `${type}:${handler === undefined}`)
    keyListeners.forEach(([type, handler, options]) => {
      const match = removed.mock.calls.find(([t, h, o]) => t === type && h === handler && Boolean(o) === Boolean(options))
      expect(match, `${type} listener left behind (${removedPairs.length} removals)`).toBeTruthy()
    })
  })
})
