// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { chooseMenuItem, clickDock, renderDesktop, rightClick, settle, windowsOf } from '../../testing/renderRafeyOS'
import { buildContent } from '../../vfs/content'
import { age } from '../../../../lib/descriptions'
import { ABOUT_TEXT, aboutRows } from './aboutData'
import { PAGE_TITLES, isSettingsPage, sidebarPageOf } from './settingsPages'

afterEach(cleanup)

const openSettings = () => {
  const view = renderDesktop()
  clickDock('Settings')
  const [win] = windowsOf(view.container, 'settings')
  const ui = within(win)
  const go = (name) => fireEvent.click(ui.getByRole('button', { name }))
  return { ...view, win, ui, go }
}

const rowsOf = (win) =>
  [...win.querySelectorAll('.sbody .row')].map((row) => [row.querySelector('.rt').firstChild.textContent, row.querySelector('.rv')?.textContent])

describe('Settings app', () => {
  it('opens on Appearance with the five sidebar pages', () => {
    const { win, ui } = openSettings()

    expect(win.getAttribute('aria-label')).toBe('Appearance')
    const pages = within(ui.getByRole('navigation', { name: 'Settings pages' })).getAllByRole('button')
    expect(pages.map((page) => page.textContent)).toEqual(['Appearance', 'Ubuntu Desktop', 'Sound', 'Notifications', 'System'])
    expect(ui.getByRole('button', { name: 'Appearance' }).getAttribute('aria-current')).toBe('page')
    expect(ui.getByRole('button', { name: 'Search' }).disabled).toBe(true)
  })

  it('navigates between pages, retitling the window', () => {
    const { win, go } = openSettings()

    go('Sound')

    expect(win.getAttribute('aria-label')).toBe('Sound')
    expect(win.querySelector('.main .hb .ttl b').textContent).toBe('Sound')
  })

  it('lists System entries, only About opens, and Back returns', () => {
    const { win, ui, go } = openSettings()
    go('System')

    const disabled = [...win.querySelectorAll('.row.dis')].map((row) => row.textContent)
    expect(disabled).toEqual(['Region & Language', 'Date & Time', 'Users', 'Remote Desktop', 'Secure Shell', 'Software Updates'])
    fireEvent.click(ui.getByRole('button', { name: /^About/ }))

    expect(win.getAttribute('aria-label')).toBe('About')
    expect(ui.getByRole('button', { name: 'System' }).className).toBe('srow on')
    go('Back')
    expect(win.getAttribute('aria-label')).toBe('System')
    expect(ui.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('describes Rafey on About, from content', () => {
    const { win, ui, go } = openSettings()
    go('System')
    fireEvent.click(ui.getByRole('button', { name: /^About/ }))
    const content = buildContent()

    expect(win.querySelector('.about-hero').textContent).toBe('rafeyOSrafeyOS 24.04 LTS')
    expect(rowsOf(win)).toEqual([
      ['Device Name', 'rafey'],
      ['Hardware Model', 'A. Rafey Masood · built 1997, Islamabad'],
      ['Memory', `${age()} years`],
      ['Processor', 'Self-taught full-stack developer'],
      ['Graphics', 'Ramé Sivano (music)'],
      ['Disk Capacity', `${content.projects.length} projects · ${content.posts.length} post${content.posts.length === 1 ? '' : 's'}`],
      ['Education', "Computer Science, then AI (2024), King's College London"],
      ['Company', 'Founded 2024'],
      ['Studio', 'Record label and studio, East London'],
      ['Windowing System', 'Wayland'],
    ])
  })

  it('stays one window and turns to the page it is opened on', () => {
    const { container, win, go } = openSettings()
    go('Sound')

    rightClick(screen.getByTestId('wallpaper'))
    chooseMenuItem('Change Background…')
    expect(windowsOf(container, 'settings')).toEqual([win])
    expect(win.getAttribute('aria-label')).toBe('Appearance')

    rightClick(screen.getByTestId('wallpaper'))
    chooseMenuItem('Desktop Icons Settings')
    expect(win.getAttribute('aria-label')).toBe('Ubuntu Desktop')
  })

  it('opens Appearance from Change Background… with no window yet', () => {
    const { container } = renderDesktop()

    rightClick(screen.getByTestId('wallpaper'))
    chooseMenuItem('Change Background…')

    expect(windowsOf(container, 'settings')[0].getAttribute('aria-label')).toBe('Appearance')
  })

  it('shows what Music is playing on the Sound page', async () => {
    const { container, win, go } = openSettings()
    go('Sound')
    const musicRow = () => [...win.querySelectorAll('.row')].find((row) => row.textContent.startsWith('Music'))
    expect(musicRow().textContent).toBe('MusicNot playing')

    clickDock('Music')
    fireEvent.click(within(windowsOf(container, 'music')[0]).getByRole('button', { name: 'Play' }))
    await settle()

    expect(musicRow().textContent).toBe('MusicStorms Ahead · Ramé SivanoPlaying')
    expect(rowsOf(win)[0]).toEqual(['Output Device', 'Speakers – Built-in Audio'])
  })

  it('lists notifying apps and keeps the lock screen switch on', () => {
    const { win, ui, go } = openSettings()
    go('Notifications')
    const lockScreen = ui.getByRole('switch', { name: 'Lock Screen Notifications' })

    fireEvent.click(lockScreen)

    expect(lockScreen.getAttribute('aria-checked')).toBe('true')
    expect(rowsOf(win).slice(2)).toEqual([['Files', 'On'], ['Music', 'On'], ['Terminal', 'On'], ['Text Editor', 'On']])
  })
})

describe('settings data', () => {
  it('derives About from content and keeps fixed wording in one place', () => {
    const content = { profile: { age: 30 }, music: { track: { artist: 'X' } }, projects: [1], posts: [1, 2] }

    const { hardware, details } = aboutRows(content)

    expect(hardware.map((row) => row.value)).toEqual([ABOUT_TEXT.hardwareModel, '30 years', ABOUT_TEXT.processor, 'X (music)', '1 project · 2 posts'])
    expect(details).toHaveLength(4)
    expect(Object.isFrozen(ABOUT_TEXT)).toBe(true)
  })

  it('knows its pages and keeps About under System', () => {
    expect(PAGE_TITLES).toMatchObject({ ubuntu: 'Ubuntu Desktop', about: 'About' })
    expect(sidebarPageOf('about')).toBe('system')
    expect(sidebarPageOf('sound')).toBe('sound')
    expect(isSettingsPage('display')).toBe(false)
  })
})
