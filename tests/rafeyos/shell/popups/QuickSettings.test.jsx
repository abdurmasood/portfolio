// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { clickDock, flushTimers, renderDesktop, windowsOf } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { WIFI_STEP_MS, WIFI_SWEEPS_MAX, WIFI_SWEEPS_MIN } from '@/components/rafeyos/state/WifiLink'
import { sliderFill } from '@/components/rafeyos/controls/Slider'
// Inner, then middle, then outer: the reconnect sweep, one band at a time
import { WIFI_ARCS } from '@/components/rafeyos/icons/symbols'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const openQuickSettings = () => {
  fireEvent.click(screen.getByRole('button', { name: 'System menu' }))
  return within(screen.getByRole('dialog', { name: 'Quick settings' }))
}
const tile = (qs, title) => qs.getAllByRole('button').find((button) => button.querySelector('b')?.textContent === title)
const root = (container) => container.querySelector('.rafeyos')
const topBarIcons = (container) => container.querySelector('.topbar .sti')

/** The symbol's last path, enough to tell wifi from wifioff and vol from vol0. */
const symbolOf = (element) => element.querySelector('path:last-of-type').getAttribute('d')

const WIFI_OFF = 'M2 2l12 12'
const wifiPaths = (element) => [...element.querySelector('svg').querySelectorAll('path')].map((path) => path.getAttribute('d'))
const visibleArcs = (element) =>
  [...element.querySelector('svg').querySelectorAll('path')]
    .filter((path) => path.style.opacity !== '0')
    .map((path) => path.getAttribute('d'))

describe('quick settings', () => {
  it('shows the four toggles, Wi-Fi on with its network', () => {
    renderDesktop()
    const qs = openQuickSettings()

    const titles = [...document.querySelectorAll('.qt b')].map((b) => b.textContent)
    expect(titles).toEqual(['Wi-Fi', 'Bluetooth', 'Night Light', 'Dark Style'])
    expect(tile(qs, 'Wi-Fi').className).toBe('qt on')
    expect(tile(qs, 'Wi-Fi').querySelector('small').textContent).toBe('rafey.ai')
    expect(tile(qs, 'Bluetooth').className).toBe('qt dim')
    expect(tile(qs, 'Dark Style').getAttribute('aria-pressed')).toBe('true')
  })

  it('turns Wi-Fi off: no network, and the top bar shows wifi-off', () => {
    const { container } = renderDesktop()
    const qs = openQuickSettings()
    const wifiOn = symbolOf(topBarIcons(container))

    fireEvent.click(tile(qs, 'Wi-Fi'))

    expect(tile(qs, 'Wi-Fi').className).toBe('qt')
    expect(tile(qs, 'Wi-Fi').querySelector('small')).toBeNull()
    expect(symbolOf(topBarIcons(container))).not.toBe(wifiOn)
    expect(symbolOf(tile(qs, 'Wi-Fi'))).toBe(symbolOf(topBarIcons(container)))
  })

  it('reconnects one arc at a time, then shows the network', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { container } = renderDesktop({ reducedMotion: () => false })
    const qs = openQuickSettings()
    const wifi = () => tile(qs, 'Wi-Fi')

    expect(visibleArcs(wifi())).toEqual([...WIFI_ARCS])
    expect(wifi().querySelector('small').textContent).toBe('rafey.ai')

    fireEvent.click(wifi())
    fireEvent.click(wifi())

    expect(wifi().className).toBe('qt on')
    expect(wifi().querySelector('small')).toBeNull()
    expect(visibleArcs(wifi())).toEqual([WIFI_ARCS[0]])
    expect(visibleArcs(topBarIcons(container))).toEqual([WIFI_ARCS[0]])
    expect(wifi().querySelector('svg').classList.contains('wifi-live')).toBe(true)

    flushTimers(WIFI_STEP_MS - 1)
    expect(visibleArcs(wifi())).toEqual([WIFI_ARCS[0]])

    flushTimers(1)
    expect(visibleArcs(wifi())).toEqual([WIFI_ARCS[1]])
    expect(visibleArcs(topBarIcons(container))).toEqual([WIFI_ARCS[1]])

    flushTimers(WIFI_STEP_MS)
    expect(visibleArcs(wifi())).toEqual([WIFI_ARCS[2]])
    expect(visibleArcs(topBarIcons(container))).toEqual([WIFI_ARCS[2]])

    flushTimers(WIFI_STEP_MS)
    expect(visibleArcs(wifi())).toEqual([WIFI_ARCS[0]])

    flushTimers(WIFI_STEP_MS * 3)
    expect(visibleArcs(wifi())).toEqual([...WIFI_ARCS])
    expect(visibleArcs(topBarIcons(container))).toEqual([...WIFI_ARCS])
    expect(wifi().querySelector('small').textContent).toBe('rafey.ai')

    fireEvent.click(wifi())
    fireEvent.click(wifi())
    flushTimers(WIFI_STEP_MS)
    fireEvent.click(wifi())

    expect(wifi().className).toBe('qt')
    expect(wifi().querySelector('small')).toBeNull()
    expect(wifiPaths(wifi())).toContain(WIFI_OFF)
    expect(wifiPaths(topBarIcons(container))).toContain(WIFI_OFF)

    flushTimers(WIFI_STEP_MS * WIFI_ARCS.length * WIFI_SWEEPS_MAX)
    expect(wifiPaths(topBarIcons(container))).toContain(WIFI_OFF)
    expect(wifi().querySelector('small')).toBeNull()
  })

  it('keeps the same arc pace and varies how long the search lasts', () => {
    vi.useFakeTimers()
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    const { container } = renderDesktop({ reducedMotion: () => false })
    const qs = openQuickSettings()
    const wifi = () => tile(qs, 'Wi-Fi')
    const shortMs = WIFI_STEP_MS * WIFI_ARCS.length * WIFI_SWEEPS_MIN
    const longMs = WIFI_STEP_MS * WIFI_ARCS.length * WIFI_SWEEPS_MAX

    fireEvent.click(wifi())
    fireEvent.click(wifi())
    flushTimers(WIFI_STEP_MS)
    expect(visibleArcs(topBarIcons(container))).toEqual([WIFI_ARCS[1]])
    flushTimers(shortMs - WIFI_STEP_MS)
    expect(wifi().querySelector('small').textContent).toBe('rafey.ai')

    fireEvent.click(wifi())
    random.mockReturnValue(0.999999)
    fireEvent.click(wifi())

    flushTimers(WIFI_STEP_MS)
    expect(visibleArcs(wifi())).toEqual([WIFI_ARCS[1]])
    expect(visibleArcs(topBarIcons(container))).toEqual([WIFI_ARCS[1]])
    flushTimers(shortMs - WIFI_STEP_MS)
    expect(wifi().querySelector('small')).toBeNull()
    expect(visibleArcs(wifi())).toEqual([WIFI_ARCS[0]])

    flushTimers(longMs - shortMs)
    expect(wifi().querySelector('small').textContent).toBe('rafey.ai')
    expect(visibleArcs(topBarIcons(container))).toEqual([...WIFI_ARCS])
  })

  it('reconnects immediately when motion is reduced', () => {
    const { container } = renderDesktop()
    const qs = openQuickSettings()

    fireEvent.click(tile(qs, 'Wi-Fi'))
    fireEvent.click(tile(qs, 'Wi-Fi'))

    expect(tile(qs, 'Wi-Fi').querySelector('small').textContent).toBe('rafey.ai')
    expect(wifiPaths(tile(qs, 'Wi-Fi'))).toEqual([...WIFI_ARCS])
    expect(wifiPaths(topBarIcons(container))).toEqual([...WIFI_ARCS])
  })

  it('leaves Bluetooth off when clicked', () => {
    renderDesktop()
    const qs = openQuickSettings()
    const bluetooth = tile(qs, 'Bluetooth')

    fireEvent.click(bluetooth)

    expect(bluetooth.disabled).toBe(false)
    expect(bluetooth.className).toBe('qt dim')
    expect(bluetooth.getAttribute('aria-pressed')).toBe('false')
  })

  it('washes the screen warm with Night Light', () => {
    renderDesktop()
    const qs = openQuickSettings()
    expect(screen.getByTestId('night-light').className).toBe('night')

    fireEvent.click(tile(qs, 'Night Light'))

    expect(screen.getByTestId('night-light').className).toBe('night on')
  })

  it('switches the whole desktop between dark and light', () => {
    const { container } = renderDesktop()
    const qs = openQuickSettings()
    expect(root(container).className).toBe('rafeyos')

    fireEvent.click(tile(qs, 'Dark Style'))
    expect(root(container).className).toBe('rafeyos light')
    fireEvent.click(tile(qs, 'Dark Style'))
    expect(root(container).className).toBe('rafeyos')
  })

  it('shares the volume with Settings, muting the icons at zero', () => {
    const { container } = renderDesktop()
    const qs = openQuickSettings()
    const slider = qs.getByRole('slider', { name: 'Volume' })
    const loud = symbolOf(container.querySelector('.qs-sl .vi'))

    fireEvent.change(slider, { target: { value: '0' } })

    expect(slider.style.getPropertyValue('--p')).toBe('0%')
    expect(symbolOf(container.querySelector('.qs-sl .vi'))).not.toBe(loud)
    const [, volumeIcon] = topBarIcons(container).querySelectorAll('svg')
    expect(volumeIcon.querySelector('path:last-of-type').getAttribute('d')).toBe('M11 6l3 4M14 6l-3 4')
    clickDock('Settings')
    const [settings] = windowsOf(container, 'settings')
    fireEvent.click(within(settings).getByRole('button', { name: 'Sound' }))
    expect(within(settings).getByRole('slider', { name: 'Output volume' }).value).toBe('0')

    fireEvent.change(within(settings).getByRole('slider', { name: 'Output volume' }), { target: { value: '40' } })
    expect(openQuickSettings().getByRole('slider', { name: 'Volume' }).value).toBe('40')
  })

  it('closes on Escape', () => {
    renderDesktop()
    openQuickSettings()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Quick settings' })).toBeNull()
  })
})

describe('slider fill', () => {
  it('is the share of the range, and empty for a degenerate one', () => {
    expect(sliderFill(40, 28, 56)).toBe(`${(12 / 28) * 100}%`)
    expect(sliderFill(5, 5, 5)).toBe('0%')
  })
})
