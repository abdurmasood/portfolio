// Transient shell UI: at most one popup or menu at a time, plus dialog, banner and overview.

export const initialShell = Object.freeze({ popup: null, menu: null, dialog: null, banner: null, overview: null })

const withoutTransients = (state) => ({ ...state, popup: null, menu: null })

const openPopup = (state, { kind, anchor = null }) => ({ ...withoutTransients(state), popup: { kind, anchor } })

/** Top-bar buttons: a second click on the same button closes its popup. */
const togglePopup = (state, action) =>
  state.popup?.kind === action.kind ? { ...state, popup: null } : openPopup(state, action)

const openMenu = (state, { items, x, y, shell = false }) => ({ ...withoutTransients(state), menu: { items, x, y, shell } })

const openDialog = (state, { kind }) => ({ ...withoutTransients(state), dialog: { kind } })

const showBanner = (state, { banner }) => ({ ...state, banner: { ...banner } })

const openOverview = (state, { mode = 'windows', query = '' }) => ({ ...withoutTransients(state), overview: { mode, query } })

const setOverviewQuery = (state, { query }) =>
  state.overview ? { ...state, overview: { ...state.overview, query } } : state

const close = (field) => (state) => (state[field] === null ? state : { ...state, [field]: null })

const HANDLERS = Object.freeze({
  openPopup,
  togglePopup,
  closePopup: close('popup'),
  openMenu,
  closeMenu: close('menu'),
  closeTransients: (state) => (state.popup || state.menu ? withoutTransients(state) : state),
  openDialog,
  closeDialog: close('dialog'),
  showBanner,
  hideBanner: close('banner'),
  openOverview,
  setOverviewQuery,
  closeOverview: close('overview'),
  reset: () => initialShell,
})

export const shellReducer = (state, action) => {
  const handler = HANDLERS[action.type]
  return handler ? handler(state, action) : state
}
