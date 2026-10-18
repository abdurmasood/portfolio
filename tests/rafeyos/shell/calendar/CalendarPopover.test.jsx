// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { clickDock, renderDesktop, settle, windowsOf } from '@/components/rafeyos/testing/renderRafeyOS'
import { monthLabel } from '@/components/rafeyos/shell/calendar/CalendarPopover'

afterEach(cleanup)

const clock = () => screen.getByRole('button', { name: 'Date and time' })
const calendar = () => screen.queryByRole('dialog', { name: 'Calendar and notifications' })
const openCalendar = () => {
  fireEvent.click(clock())
  return within(calendar())
}
const shownMonth = () => calendar().querySelector('.cal-mh span').textContent

describe('calendar popover', () => {
  it("shows today's date and month with today marked", () => {
    renderDesktop()

    openCalendar()

    expect(calendar().querySelector('.dn').textContent).toBe('Saturday')
    expect(calendar().querySelector('.dd').textContent).toBe('October 17, 2026')
    expect(shownMonth()).toBe('October')
    expect(calendar().querySelector('.cal-g .today').textContent).toBe('17')
    expect(calendar().querySelectorAll('.cal-g span')).toHaveLength(42)
    expect(calendar().querySelector('.cal-ev').textContent).toBe('TodayNo Events')
    expect(calendar().querySelector('.cal-empty').textContent).toBe('No Notifications')
    expect(within(calendar()).getByRole('button', { name: 'Clear' }).disabled).toBe(true)
    expect(clock().className).toBe('tbb open')
  })

  it('pages through months, naming the year outside this one', () => {
    renderDesktop()
    const cal = openCalendar()

    fireEvent.click(cal.getByRole('button', { name: 'Next month' }))
    expect(shownMonth()).toBe('November')
    expect(calendar().querySelector('.cal-g .today')).toBeNull()
    fireEvent.click(cal.getByRole('button', { name: 'Next month' }))
    fireEvent.click(cal.getByRole('button', { name: 'Next month' }))
    expect(shownMonth()).toBe('January 2027')
    ;[0, 1, 2, 3].forEach(() => fireEvent.click(cal.getByRole('button', { name: 'Previous month' })))
    expect(shownMonth()).toBe('September')
  })

  it('is exclusive with Quick Settings and closes on a second click, Escape or outside', () => {
    renderDesktop()

    openCalendar()
    fireEvent.click(screen.getByRole('button', { name: 'System menu' }))
    expect(calendar()).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Quick settings' })).toBeTruthy()

    openCalendar()
    expect(screen.queryByRole('dialog', { name: 'Quick settings' })).toBeNull()
    fireEvent.click(clock())
    expect(calendar()).toBeNull()

    openCalendar()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(calendar()).toBeNull()

    openCalendar()
    fireEvent.pointerDown(screen.getByTestId('wallpaper'), { button: 0 })
    expect(calendar()).toBeNull()
  })

  it('shares Do Not Disturb with the Notifications page', () => {
    const { container } = renderDesktop()
    const cal = openCalendar()

    fireEvent.click(cal.getByRole('switch', { name: 'Do Not Disturb' }))
    expect(cal.getByRole('switch', { name: 'Do Not Disturb' }).getAttribute('aria-checked')).toBe('true')

    clickDock('Settings')
    const [settings] = windowsOf(container, 'settings')
    fireEvent.click(within(settings).getByRole('button', { name: 'Notifications' }))
    const pageSwitch = within(settings).getByRole('switch', { name: 'Do Not Disturb' })
    expect(pageSwitch.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(pageSwitch)
    openCalendar()
    expect(within(calendar()).getByRole('switch', { name: 'Do Not Disturb' }).className).toBe('sw')
  })

  it('shows a media card once the track has played, which controls playback', async () => {
    const { container, services } = renderDesktop()
    openCalendar()
    expect(calendar().querySelector('.media')).toBeNull()
    fireEvent.click(clock())

    clickDock('Music')
    fireEvent.click(within(windowsOf(container, 'music')[0]).getByRole('button', { name: 'Play' }))
    await settle()
    const cal = openCalendar()

    const media = calendar().querySelector('.media')
    expect(media.textContent).toBe('Storms AheadRamé Sivano')
    fireEvent.click(cal.getByRole('button', { name: 'Pause' }))
    expect(services.createAudio.last().pause).toHaveBeenCalledTimes(1)
    fireEvent.click(cal.getByRole('button', { name: 'Previous' }))
    expect(services.createAudio.last().seek).toHaveBeenLastCalledWith(0)
    fireEvent.click(cal.getByRole('button', { name: 'Play' }))
    await settle()
    fireEvent.click(cal.getByRole('button', { name: 'Next' }))
    expect(cal.getByRole('button', { name: 'Play' })).toBeTruthy()
  })

  it('labels months like GNOME', () => {
    const today = new Date(2026, 9, 17)

    expect(monthLabel({ year: 2026, month: 0 }, today)).toBe('January')
    expect(monthLabel({ year: 2025, month: 11 }, today)).toBe('December 2025')
  })
})
