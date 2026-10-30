import { describe, expect, it, vi } from 'vitest'
import { backgroundMenuItems, mainMenuItems, viewOptionsItems } from '@/components/rafeyos/apps/files/logic/filesMenus'
import { filesReducer, initialFilesState } from '@/components/rafeyos/apps/files/logic/filesReducer'

describe('Files menus', () => {
  it('disables the terminal in Trash only', () => {
    const actions = { selectAll: vi.fn(), openTerminal: vi.fn(), properties: vi.fn() }
    const terminal = (inTrash) => backgroundMenuItems({ ...actions, inTrash }).find((item) => item.label === 'Open in Terminal')

    expect(terminal(true).disabled).toBe(true)
    expect(terminal(false).disabled).toBe(false)
    const empty = (inTrash, action) => backgroundMenuItems({ ...actions, inTrash, emptyTrash: action }).find((item) => item.label === 'Empty Trash')
    expect(empty(false, vi.fn())).toBeUndefined()
    expect(empty(true, null).disabled).toBe(true)
    const run = vi.fn()
    empty(true, run).action()
    expect(run).toHaveBeenCalled()
  })

  it('offers New Folder only when given one', () => {
    const actions = { inTrash: false, selectAll: vi.fn(), openTerminal: vi.fn(), properties: vi.fn() }
    const newFolder = vi.fn()

    expect(backgroundMenuItems(actions).find((item) => item.label === 'New Folder…').disabled).toBe(true)
    backgroundMenuItems({ ...actions, newFolder }).find((item) => item.label === 'New Folder…').action()
    expect(newFolder).toHaveBeenCalled()
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
    const state = filesReducer(initialFilesState('/home/visitor'), { type: 'selectAll', paths: ['/home/visitor/a', '/home/visitor/b'] })

    expect(state.selection).toEqual(['/home/visitor/a', '/home/visitor/b'])
  })
})
