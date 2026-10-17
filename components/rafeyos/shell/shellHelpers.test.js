import { describe, expect, it } from 'vitest'
import { computeLayout, COMPACT_ICON_SIZE } from './layout'
import { formatClock } from './clockFormat'
import { POWER_DIALOGS } from './powerDialogs'
import { unavailableBanner } from './useOpenPath'
import { realVfs } from '../vfs/testVfs'

describe('layout', () => {
  it('puts the dock where settings say on wide screens', () => {
    const layout = computeLayout({ w: 1280, h: 800 }, { dockPos: 'left', iconSize: 40 })

    expect(layout).toMatchObject({ compact: false, dockPos: 'left', iconSize: 40, dockSize: 54 })
    expect(layout.area).toEqual({ x: 54, y: 28, w: 1226, h: 772 })
  })

  it('moves the dock to the bottom with smaller icons when compact', () => {
    const layout = computeLayout({ w: 400, h: 800 }, { dockPos: 'left', iconSize: 40 })

    expect(layout).toMatchObject({ compact: true, dockPos: 'bottom', iconSize: COMPACT_ICON_SIZE })
    expect(layout.area).toEqual({ x: 0, y: 28, w: 400, h: 724 })
  })
})

describe('shell text', () => {
  it('formats the clock like GNOME', () => {
    expect(formatClock(new Date(2026, 9, 7, 9, 5))).toBe('Oct 7  09:05')
  })

  it('counts down in the power dialogs', () => {
    expect(POWER_DIALOGS.logout.body(3)).toBe('You will return to the rafey.ai terminal in 3 seconds.')
    expect(POWER_DIALOGS.poweroff.body(9)).toBe('rafeyOS will power off and return to the terminal in 9 seconds.')
  })

  it('names the file and the missing app in the banner', () => {
    expect(unavailableBanner(realVfs, '~/Music/storms-ahead.mp3')).toMatchObject({
      appId: 'music',
      body: "Music isn't available yet.",
    })
    expect(unavailableBanner(realVfs, '~/contact/linkedin.desktop')).toEqual({
      appId: null,
      title: "Can't open “LinkedIn”",
      body: "Opening links isn't available yet.",
    })
  })
})
