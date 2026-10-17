import { describe, it, expect } from 'vitest'
import { shellReducer, initialShell } from './shellReducer'
import { deepFreeze } from '../vfs/content'

const reduce = (state, ...actions) => actions.reduce((s, a) => shellReducer(deepFreeze(s), a), state)
const menu = { type: 'openMenu', items: [{ label: 'Open' }], x: 10, y: 20 }

describe('shellReducer', () => {
  it('starts with everything closed', () => {
    expect(initialShell).toEqual({ popup: null, menu: null, dialog: null, banner: null, overview: null })
  })

  it('opening a popup closes any menu', () => {
    const state = reduce(initialShell, menu, { type: 'openPopup', kind: 'quickSettings', anchor: { x: 1, y: 2 } })

    expect(state.popup).toEqual({ kind: 'quickSettings', anchor: { x: 1, y: 2 } })
    expect(state.menu).toBeNull()
  })

  it('opening a menu closes any popup', () => {
    const state = reduce(initialShell, { type: 'openPopup', kind: 'calendar' }, menu)

    expect(state.popup).toBeNull()
    expect(state.menu).toEqual({ items: [{ label: 'Open' }], x: 10, y: 20, shell: false, anchorBottom: false })
  })

  it('shell menus can hang from their bottom edge', () => {
    const state = reduce(initialShell, { ...menu, shell: true, anchorBottom: true })

    expect(state.menu).toMatchObject({ shell: true, anchorBottom: true })
  })

  it('togglePopup closes the same popup and switches to another', () => {
    const opened = reduce(initialShell, { type: 'togglePopup', kind: 'calendar' })

    expect(opened.popup.kind).toBe('calendar')
    expect(reduce(opened, { type: 'togglePopup', kind: 'calendar' }).popup).toBeNull()
    expect(reduce(opened, { type: 'togglePopup', kind: 'quickSettings' }).popup.kind).toBe('quickSettings')
  })

  it('dialogs and the overview close transient popups and menus', () => {
    const dialog = reduce(initialShell, { type: 'openPopup', kind: 'quickSettings' }, { type: 'openDialog', kind: 'logout' })
    const overview = reduce(initialShell, menu, { type: 'openOverview', mode: 'apps' })

    expect(dialog).toMatchObject({ popup: null, dialog: { kind: 'logout' } })
    expect(overview).toMatchObject({ menu: null, overview: { mode: 'apps', query: '' } })
  })

  it('overview defaults to windows mode and tracks the query', () => {
    const state = reduce(initialShell, { type: 'openOverview' }, { type: 'setOverviewQuery', query: 'term' })

    expect(state.overview).toEqual({ mode: 'windows', query: 'term' })
  })

  it('setOverviewQuery without an overview is a no-op', () => {
    expect(shellReducer(initialShell, { type: 'setOverviewQuery', query: 'x' })).toBe(initialShell)
  })

  it('shows and hides banners', () => {
    const shown = reduce(initialShell, { type: 'showBanner', banner: { title: 'Storms Ahead', body: 'Artist' } })

    expect(shown.banner).toEqual({ title: 'Storms Ahead', body: 'Artist' })
    expect(reduce(shown, { type: 'hideBanner' }).banner).toBeNull()
  })

  it('close actions clear their field and are no-ops when already closed', () => {
    const open = reduce(initialShell, { type: 'openDialog', kind: 'x' }, { type: 'openOverview' }, { type: 'openPopup', kind: 'p' })

    expect(reduce(open, { type: 'closeDialog' }, { type: 'closeOverview' }, { type: 'closePopup' })).toEqual(initialShell)
    expect(shellReducer(initialShell, { type: 'closeMenu' })).toBe(initialShell)
    expect(reduce(initialShell, menu, { type: 'closeMenu' }).menu).toBeNull()
  })

  it('a top-bar popup leaves the overview', () => {
    const state = reduce(initialShell, { type: 'openOverview', mode: 'apps' }, { type: 'togglePopup', kind: 'calendar' })

    expect(state.overview).toBeNull()
    expect(state.popup.kind).toBe('calendar')
  })

  it('closeTransients clears popup and menu only', () => {
    const state = reduce(initialShell, { type: 'openDialog', kind: 'x' }, menu, { type: 'closeTransients' })

    expect(state).toMatchObject({ menu: null, popup: null, dialog: { kind: 'x' } })
    expect(shellReducer(initialShell, { type: 'closeTransients' })).toBe(initialShell)
  })

  it('reset returns to the initial state; unknown actions are ignored', () => {
    expect(reduce(initialShell, menu, { type: 'reset' })).toBe(initialShell)
    expect(shellReducer(initialShell, { type: 'nope' })).toBe(initialShell)
  })
})
