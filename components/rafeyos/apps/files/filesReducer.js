export const FILE_VIEWS = Object.freeze({ GRID: 'grid', LIST: 'list' })

/** search is null when the search bar is closed, a string (possibly empty) while open. */
export const initialFilesState = (path = '~', selection = []) =>
  Object.freeze({ path, back: [], fwd: [], view: FILE_VIEWS.GRID, selection: [...selection], search: null })

const go = (state, { path, fromHistory = false }) => {
  if (path === state.path && state.search === null) return state
  const history = fromHistory ? {} : { back: [...state.back, state.path], fwd: [] }
  return { ...state, ...history, path, search: null, selection: [] }
}

const back = (state) => {
  if (!state.back.length) return state
  const target = state.back[state.back.length - 1]
  const moved = { ...state, back: state.back.slice(0, -1), fwd: [...state.fwd, state.path] }
  return go(moved, { path: target, fromHistory: true })
}

const forward = (state) => {
  if (!state.fwd.length) return state
  const target = state.fwd[state.fwd.length - 1]
  const moved = { ...state, fwd: state.fwd.slice(0, -1), back: [...state.back, state.path] }
  return go(moved, { path: target, fromHistory: true })
}

const setView = (state, { view }) => {
  if (!Object.values(FILE_VIEWS).includes(view)) throw new Error(`Unknown view: ${view}`)
  return { ...state, view }
}

const SELECTORS = Object.freeze({
  single: (selection, path) => [path],
  toggle: (selection, path) =>
    selection.includes(path) ? selection.filter((other) => other !== path) : [...selection, path],
  clear: () => [],
})

/** mode: 'single' replaces, 'toggle' adds/removes (Ctrl+click), 'clear' empties. */
const select = (state, { path, mode = 'single' }) => {
  const pick = SELECTORS[mode]
  if (!pick) throw new Error(`Unknown selection mode: ${mode}`)
  return { ...state, selection: pick(state.selection, path) }
}

const setSearch = (state, { query }) => ({ ...state, search: query, selection: [] })

const HANDLERS = Object.freeze({ go, back, forward, setView, select, setSearch })

export const filesReducer = (state, action) => {
  const handler = HANDLERS[action.type]
  return handler ? handler(state, action) : state
}
