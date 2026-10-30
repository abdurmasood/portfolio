// @ts-check
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

/**
 * @typedef {{ kind: string, anchor?: object | null, prompt?: object | null }} PopupPayload prompt: what a popup that asks
 *   for input (the name popover) asks, and what it does with the answer
 * @typedef {{ items: readonly object[], x: number, y: number, shell?: boolean, anchorBottom?: boolean, dockKey?: string | null }} MenuPayload
 * @typedef {{ appId?: string, title: string, body: string }} Banner
 */

/**
 * Payload of each shell action, by type.
 * @typedef {{
 *   [SHELL_ACTIONS.OPEN_POPUP]: PopupPayload,
 *   [SHELL_ACTIONS.TOGGLE_POPUP]: PopupPayload,
 *   [SHELL_ACTIONS.CLOSE_POPUP]: {},
 *   [SHELL_ACTIONS.OPEN_MENU]: MenuPayload,
 *   [SHELL_ACTIONS.CLOSE_MENU]: {},
 *   [SHELL_ACTIONS.CLOSE_TRANSIENTS]: {},
 *   [SHELL_ACTIONS.OPEN_DIALOG]: { kind: string },
 *   [SHELL_ACTIONS.CLOSE_DIALOG]: {},
 *   [SHELL_ACTIONS.SHOW_BANNER]: { banner: Banner },
 *   [SHELL_ACTIONS.HIDE_BANNER]: {},
 *   [SHELL_ACTIONS.OPEN_OVERVIEW]: { mode?: string, query?: string },
 *   [SHELL_ACTIONS.SET_OVERVIEW_QUERY]: { query: string },
 *   [SHELL_ACTIONS.CLOSE_OVERVIEW]: {},
 *   [SHELL_ACTIONS.RESET]: {},
 * }} ShellPayloads
 */

/** @typedef {import('./createReducer').ActionOf<ShellPayloads>} ShellAction */

/**
 * @typedef {{
 *   popup: { kind: string, anchor: object | null, prompt?: object } | null,
 *   menu: Required<MenuPayload> | null,
 *   dialog: { kind: string } | null,
 *   banner: Banner | null,
 *   overview: { mode: string, query: string } | null,
 * }} ShellState
 */

/**
 * @template {keyof ShellPayloads} T
 * @typedef {(state: ShellState, action: ShellPayloads[T]) => ShellState} ShellHandler
 */

/** @type {Readonly<ShellState>} */
export const initialShell = Object.freeze({ popup: null, menu: null, dialog: null, banner: null, overview: null })

/** @param {ShellState} state */
const withoutTransients = (state) => ({ ...state, popup: null, menu: null })

// Top-bar popups leave the Activities overview, as GNOME's do
/** @type {ShellHandler<typeof SHELL_ACTIONS.OPEN_POPUP>} */
const openPopup = (state, { kind, anchor = null, prompt = null }) => ({
  ...withoutTransients(state),
  popup: prompt ? { kind, anchor, prompt } : { kind, anchor },
  overview: null,
})

/** @type {ShellHandler<typeof SHELL_ACTIONS.TOGGLE_POPUP>} Top-bar buttons: a second click on the same button closes its popup. */
const togglePopup = (state, action) =>
  state.popup?.kind === action.kind ? { ...state, popup: null } : openPopup(state, action)

/**
 * @type {ShellHandler<typeof SHELL_ACTIONS.OPEN_MENU>} shell: the dark shell style (dock) rather than the app-themed
 * popover; anchorBottom: y is the menu's bottom edge; dockKey: the dock icon it came from, held magnified while it's open.
 */
const openMenu = (state, { items, x, y, shell = false, anchorBottom = false, dockKey = null }) => ({
  ...withoutTransients(state),
  menu: { items, x, y, shell, anchorBottom, dockKey },
})

/** @type {ShellHandler<typeof SHELL_ACTIONS.OPEN_DIALOG>} */
const openDialog = (state, { kind }) => ({ ...withoutTransients(state), dialog: { kind } })

/** @type {ShellHandler<typeof SHELL_ACTIONS.SHOW_BANNER>} */
const showBanner = (state, { banner }) => ({ ...state, banner: { ...banner } })

/** @type {ShellHandler<typeof SHELL_ACTIONS.OPEN_OVERVIEW>} */
const openOverview = (state, { mode = 'windows', query = '' }) => ({ ...withoutTransients(state), overview: { mode, query } })

/** @type {ShellHandler<typeof SHELL_ACTIONS.SET_OVERVIEW_QUERY>} */
const setOverviewQuery = (state, { query }) =>
  state.overview ? { ...state, overview: { ...state.overview, query } } : state

/**
 * @param {'popup' | 'menu' | 'dialog' | 'banner' | 'overview'} field
 * @returns {(state: ShellState) => ShellState}
 */
const close = (field) => (state) => (state[field] === null ? state : { ...state, [field]: null })

/** @type {import('./createReducer').HandlerMap<ShellState, ShellPayloads>} */
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
