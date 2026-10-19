// Transient shell UI: at most one popup or menu at a time, plus dialog, banner and overview.
import { createReducer } from '@/components/rafeyos/state/logic/createReducer'

export const SHELL_ACTIONS = Object.freeze({
  OPEN_POPUP: 'openPopup',
  TOGGLE_POPUP: 'togglePopup',
  CLOSE_POPUP: 'closePopup',
  OPEN_MENU: 'openMenu',
  CLOSE_MENU: 'closeMenu',
  CLOSE_TRANSIENTS: 'closeTransients',
  OPEN_DIALOG: 'openDialog',
  CLOSE_DIALOG: 'closeDialog',
  SHOW_BANNER: 'showBanner',
  HIDE_BANNER: 'hideBanner',
  OPEN_OVERVIEW: 'openOverview',
  SET_OVERVIEW_QUERY: 'setOverviewQuery',
  CLOSE_OVERVIEW: 'closeOverview',
  RESET: 'reset',
})

export const initialShell = Object.freeze({ popup: null, menu: null, dialog: null, banner: null, overview: null })

const withoutTransients = (state) => ({ ...state, popup: null, menu: null })

// Top-bar popups leave the Activities overview, as GNOME's do
const openPopup = (state, { kind, anchor = null }) => ({ ...withoutTransients(state), popup: { kind, anchor }, overview: null })

/** Top-bar buttons: a second click on the same button closes its popup. */
const togglePopup = (state, action) =>
  state.popup?.kind === action.kind ? { ...state, popup: null } : openPopup(state, action)

/** shell: the dark shell style (dock) rather than the app-themed popover; anchorBottom: y is the menu's bottom edge. */
const openMenu = (state, { items, x, y, shell = false, anchorBottom = false }) => ({
  ...withoutTransients(state),
  menu: { items, x, y, shell, anchorBottom },
})

const openDialog = (state, { kind }) => ({ ...withoutTransients(state), dialog: { kind } })

const showBanner = (state, { banner }) => ({ ...state, banner: { ...banner } })

const openOverview = (state, { mode = 'windows', query = '' }) => ({ ...withoutTransients(state), overview: { mode, query } })

const setOverviewQuery = (state, { query }) =>
  state.overview ? { ...state, overview: { ...state.overview, query } } : state

const close = (field) => (state) => (state[field] === null ? state : { ...state, [field]: null })

const HANDLERS = Object.freeze({
  [SHELL_ACTIONS.OPEN_POPUP]: openPopup,
  [SHELL_ACTIONS.TOGGLE_POPUP]: togglePopup,
  [SHELL_ACTIONS.CLOSE_POPUP]: close('popup'),
  [SHELL_ACTIONS.OPEN_MENU]: openMenu,
  [SHELL_ACTIONS.CLOSE_MENU]: close('menu'),
  [SHELL_ACTIONS.CLOSE_TRANSIENTS]: (state) => (state.popup || state.menu ? withoutTransients(state) : state),
  [SHELL_ACTIONS.OPEN_DIALOG]: openDialog,
  [SHELL_ACTIONS.CLOSE_DIALOG]: close('dialog'),
  [SHELL_ACTIONS.SHOW_BANNER]: showBanner,
  [SHELL_ACTIONS.HIDE_BANNER]: close('banner'),
  [SHELL_ACTIONS.OPEN_OVERVIEW]: openOverview,
  [SHELL_ACTIONS.SET_OVERVIEW_QUERY]: setOverviewQuery,
  [SHELL_ACTIONS.CLOSE_OVERVIEW]: close('overview'),
  [SHELL_ACTIONS.RESET]: () => initialShell,
})

export const shellReducer = createReducer('shell', HANDLERS)
