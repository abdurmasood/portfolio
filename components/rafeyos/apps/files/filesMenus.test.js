import { describe, expect, it, vi } from 'vitest'
import { backgroundMenuItems, mainMenuItems, viewOptionsItems } from './filesMenus'
import { filesReducer, initialFilesState } from './filesReducer'

describe('Files menus', () => {
  it('disables the terminal in Trash only', () => {
    const actions = { selectAll: vi.fn(), openTerminal: vi.fn(), properties: vi.fn() }
    const terminal = (inTrash) => backgroundMenuItems({ ...actions, inTrash }).find((item) => item.label === 'Open in Terminal')

    expect(terminal(true).disabled).toBe(true)
    expect(terminal(false).disabled).toBe(false)
  })

  it('sets the view from View options', () => {
    const setView = vi.fn()
    const [grid, list] = viewOptionsItems(setView)

    grid.action()
    list.action()

    expect(setView.mock.calls).toEqual([['grid'], ['list']])
  })

  it('opens a new window from the main menu', () => {
    const newWindow = vi.fn()

    mainMenuItems(newWindow)[0].action()

    expect(newWindow).toHaveBeenCalled()
  })

  it('selects every listed item', () => {
    const state = filesReducer(initialFilesState('~'), { type: 'selectAll', paths: ['~/a', '~/b'] })

    expect(state.selection).toEqual(['~/a', '~/b'])
  })
})
