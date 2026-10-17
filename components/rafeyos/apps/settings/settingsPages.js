// Settings' pages: ids, sidebar entries and header titles (mockup order and wording)

export const SETTINGS_PAGES = Object.freeze({
  APPEARANCE: 'appearance',
  DESKTOP: 'ubuntu',
  SOUND: 'sound',
  NOTIFICATIONS: 'notifications',
  SYSTEM: 'system',
  ABOUT: 'about',
})

const { APPEARANCE, DESKTOP, SOUND, NOTIFICATIONS, SYSTEM, ABOUT } = SETTINGS_PAGES

export const SIDEBAR_PAGES = Object.freeze([
  Object.freeze({ id: APPEARANCE, title: 'Appearance', icon: 'palette' }),
  Object.freeze({ id: DESKTOP, title: 'Ubuntu Desktop', icon: 'dock' }),
  Object.freeze({ id: SOUND, title: 'Sound', icon: 'vol' }),
  Object.freeze({ id: NOTIFICATIONS, title: 'Notifications', icon: 'bell' }),
  Object.freeze({ id: SYSTEM, title: 'System', icon: 'info' }),
])

export const PAGE_TITLES = Object.freeze({
  ...Object.fromEntries(SIDEBAR_PAGES.map((page) => [page.id, page.title])),
  [ABOUT]: 'About',
})

/** About lives under System, which stays highlighted in the sidebar. */
export const sidebarPageOf = (page) => (page === ABOUT ? SYSTEM : page)

export const isSettingsPage = (page) => Object.hasOwn(PAGE_TITLES, page)
