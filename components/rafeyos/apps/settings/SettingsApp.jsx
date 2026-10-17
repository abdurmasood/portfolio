import { useEffect, useState } from 'react'
import { useWindowManager } from '../../state/contexts'
import { HeaderBar } from '../../wm/HeaderBar'
import { Sym } from '../../icons/symbols'
import { SidebarToggle, splitClassName, useSidebarToggle } from '../../wm/SidebarToggle'
import { PAGE_TITLES, SETTINGS_PAGES, SIDEBAR_PAGES, isSettingsPage, sidebarPageOf } from './settingsPages'
import { AppearancePage } from './AppearancePage'
import { DesktopPage } from './DesktopPage'
import { SoundPage } from './SoundPage'
import { NotificationsPage } from './NotificationsPage'
import { SystemPage } from './SystemPage'
import { AboutPage } from './AboutPage'

const PAGE_COMPONENTS = Object.freeze({
  [SETTINGS_PAGES.APPEARANCE]: AppearancePage,
  [SETTINGS_PAGES.DESKTOP]: DesktopPage,
  [SETTINGS_PAGES.SOUND]: SoundPage,
  [SETTINGS_PAGES.NOTIFICATIONS]: NotificationsPage,
  [SETTINGS_PAGES.SYSTEM]: SystemPage,
  [SETTINGS_PAGES.ABOUT]: AboutPage,
})

/** A missing page means Appearance; an unknown one is a bug in the caller. */
const pageFrom = (init) => {
  const page = init?.page ?? SETTINGS_PAGES.APPEARANCE
  if (!isSettingsPage(page)) throw new Error(`Unknown settings page: ${page}`)
  return page
}

const SettingsSidebar = ({ page, onGo }) => (
  <div className="side">
    <HeaderBar
      title="Settings"
      controls={false}
      start={
        <button type="button" className="flat" aria-label="Search" disabled>
          <Sym name="search" />
        </button>
      }
      end={
        <button type="button" className="flat" aria-label="Main Menu" disabled>
          <Sym name="menu" />
        </button>
      }
    />
    <div className="slist" role="navigation" aria-label="Settings pages">
      {SIDEBAR_PAGES.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={sidebarPageOf(page) === entry.id ? 'srow on' : 'srow'}
          aria-current={sidebarPageOf(page) === entry.id ? 'page' : undefined}
          onClick={() => onGo(entry.id)}
        >
          <Sym name={entry.icon} />
          <span>{entry.title}</span>
        </button>
      ))}
    </div>
  </div>
)

const BackButton = ({ onGo }) => (
  <button type="button" className="flat" aria-label="Back" onClick={() => onGo(SETTINGS_PAGES.SYSTEM)}>
    <Sym name="back" />
  </button>
)

/** GNOME Settings: one window, sidebar plus page. Opening it again with a page turns to that page. */
export const SettingsApp = ({ windowId, init }) => {
  const windowManager = useWindowManager()
  const [page, setPage] = useState(() => pageFrom(init))
  const sidebar = useSidebarToggle()
  useEffect(() => {
    if (init?.page) setPage(pageFrom(init))
  }, [init])
  const title = PAGE_TITLES[page]
  useEffect(() => windowManager.setTitle(windowId, title), [windowManager, windowId, title])
  const Page = PAGE_COMPONENTS[page]
  return (
    <div className={splitClassName(sidebar)}>
      <SettingsSidebar
        page={page}
        onGo={(next) => {
          sidebar.close()
          setPage(next)
        }}
      />
      <div className="main">
        <HeaderBar
          start={
            <>
              <SidebarToggle sidebar={sidebar} />
              {page === SETTINGS_PAGES.ABOUT && <BackButton onGo={setPage} />}
            </>
          }
          title={title}
        />
        {/* Keyed so each page opens scrolled to the top */}
        <div key={page} className="scroll sbody" data-page={page}>
          <Page onGo={setPage} />
        </div>
      </div>
    </div>
  )
}
