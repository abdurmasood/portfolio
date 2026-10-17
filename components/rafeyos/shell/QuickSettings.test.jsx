// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { clickDock, renderDesktop, windowsOf } from '../testing/renderRafeyOS'
import { sliderFill } from './controls'

afterEach(cleanup)

const openQuickSettings = () => {
  fireEvent.click(screen.getByRole('button', { name: 'System menu' }))
  return within(screen.getByRole('dialog', { name: 'Quick settings' }))
}
const tile = (qs, title) => qs.getAllByRole('button').find((button) => button.querySelector('b')?.textContent === title)
const root = (container) => container.querySelector('.rafeyos')
const topBarIcons = (container) => container.querySelector('.topbar .sti')

/** The symbol's last path, enough to tell wifi from wifioff and vol from vol0. */
const symbolOf = (element) => element.querySelector('path:last-of-type').getAttribute('d')

describe('quick settings', () => {
  it('shows the four toggles, Wi-Fi on with its network', () => {
    renderDesktop()
    const qs = openQuickSettings()

    const titles = [...document.querySelectorAll('.qt b')].map((b) => b.textContent)
    expect(titles).toEqual(['Wi-Fi', 'Bluetooth', 'Night Light', 'Dark Style'])
    expect(tile(qs, 'Wi-Fi').className).toBe('qt on')
    expect(tile(qs, 'Wi-Fi').querySelector('small').textContent).toBe('rafey.ai')
    expect(tile(qs, 'Bluetooth').className).toBe('qt')
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

  it('toggles Bluetooth', () => {
    renderDesktop()
    const qs = openQuickSettings()

    fireEvent.click(tile(qs, 'Bluetooth'))

    expect(tile(qs, 'Bluetooth').getAttribute('aria-pressed')).toBe('true')
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
