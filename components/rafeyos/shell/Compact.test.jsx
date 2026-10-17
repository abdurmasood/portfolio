// @vitest-environment jsdom
// Phone widths (under 760px): bottom dock with 34px icons, maximized windows, narrow sidebars, taps
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { clickDock, dock, flushTimers, renderDesktop, windowsOf } from '../testing/renderRafeyOS'
import { RESIZE_DEBOUNCE_MS } from './useViewport'

const WIDE = { w: window.innerWidth, h: window.innerHeight }

const setViewport = (w, h) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: w })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: h })
}

const resizeTo = (w, h) => {
  setViewport(w, h)
  act(() => window.dispatchEvent(new Event('resize')))
  flushTimers(RESIZE_DEBOUNCE_MS)
}

/** Some code asks matchMedia (the real services do); answer as a phone would. */
const phoneMatchMedia = (query) => ({ matches: query.includes('max-width'), media: query, addEventListener() {}, removeEventListener() {} })

beforeEach(() => {
  setViewport(390, 844)
  window.matchMedia = vi.fn(phoneMatchMedia)
})

afterEach(() => {
  cleanup()
  setViewport(WIDE.w, WIDE.h)
  delete window.matchMedia
  vi.useRealTimers()
})

const root = (container) => container.querySelector('.rafeyos')

describe('compact layout', () => {
  it('puts the dock at the bottom with 34px icons', () => {
    const { container } = renderDesktop()

    expect(dock().classList.contains('bottom')).toBe(true)
    expect(root(container).style.getPropertyValue('--icon')).toBe('34px')
    expect(root(container).classList.contains('compact')).toBe(true)
  })

  it('opens windows maximized over the whole work area', () => {
    const { container } = renderDesktop()

    clickDock('Files')

    const [files] = windowsOf(container, 'files')
    expect(files.classList.contains('max')).toBe(true)
    expect(files.style.width).toBe('390px')
    expect(files.style.top).toBe('28px')
    expect(files.style.height).toBe(`${844 - 28 - 48}px`)
  })

  it('maximizes open windows when the screen narrows, and refits them as it turns', () => {
    vi.useFakeTimers()
    setViewport(1280, 800)
    const { container } = renderDesktop()
    clickDock('Terminal')
    const [terminal] = windowsOf(container, 'terminal')
    expect(terminal.classList.contains('max')).toBe(false)

    resizeTo(390, 844)
    expect(terminal.classList.contains('max')).toBe(true)
    expect(dock().classList.contains('bottom')).toBe(true)

    resizeTo(700, 390)
    expect(terminal.style.width).toBe('700px')
    expect(terminal.style.height).toBe(`${390 - 28 - 48}px`)
  })

  it('gives split views a sidebar toggle; picking a place closes the sidebar again', () => {
    const { container } = renderDesktop()
    clickDock('Files')
    const [files] = windowsOf(container, 'files')
    const split = files.querySelector('.split')
    const toggle = within(files).getByRole('button', { name: 'Show sidebar' })

    fireEvent.click(toggle)
    expect(split.classList.contains('side-open')).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(within(files).getByRole('button', { name: 'Music' }))

    expect(split.classList.contains('side-open')).toBe(false)
    expect(files.getAttribute('aria-label')).toBe('Music')
  })

  it('does the same in Settings and Projects', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { container } = renderDesktop()
    clickDock('Settings')
    const [settings] = windowsOf(container, 'settings')

    fireEvent.click(within(settings).getByRole('button', { name: 'Show sidebar' }))
    expect(settings.querySelector('.split').classList.contains('side-open')).toBe(true)
    fireEvent.click(within(settings).getByRole('button', { name: 'Sound' }))
    expect(settings.querySelector('.split').classList.contains('side-open')).toBe(false)
    expect(settings.getAttribute('aria-label')).toBe('Sound')

    clickDock('Projects')
    const [projects] = windowsOf(container, 'projects')
    fireEvent.click(within(projects).getByRole('button', { name: 'Show sidebar' }))
    fireEvent.click(within(projects).getByRole('button', { name: 'Hide sidebar' }))
    expect(projects.querySelector('.split').classList.contains('side-open')).toBe(false)
  })
})

describe('touch', () => {
  it('opens Files items with a tap', () => {
    const { container } = renderDesktop()
    clickDock('Files')
    const [files] = windowsOf(container, 'files')
    const music = files.querySelector('[data-path="~/Music"]')

    fireEvent.pointerDown(music, { pointerType: 'touch' })
    fireEvent.click(music)

    expect(files.getAttribute('aria-label')).toBe('Music')
  })

  it('picks a window in the overview with a tap', () => {
    const { container } = renderDesktop()
    clickDock('Files')
    clickDock('Terminal')
    fireEvent.click(screen.getByRole('button', { name: 'Activities' }))

    fireEvent.pointerDown(windowsOf(container, 'files')[0], { pointerType: 'touch', button: 0 })

    expect(screen.queryByRole('region', { name: 'Activities overview' })).toBeNull()
    expect(windowsOf(container, 'files')[0].classList.contains('backdrop')).toBe(false)
  })

  it('does not raise the keyboard by focusing the overview search on a phone', () => {
    renderDesktop()
    fireEvent.click(screen.getByRole('button', { name: 'Activities' }))

    expect(document.activeElement).not.toBe(screen.getByLabelText('Type to search'))
  })
})
