import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLayout, useShellDispatch, useShellState, useVfs, useWindowManager, useWindowsState } from '../../state/contexts'
import { getApp } from '../../apps/registry'
import { useOpenSettings } from '../../apps/settings/useOpenSettings'
import { AppIcon } from '../../icons/appIcons'
import { FileIcon } from '../../icons/FileIcon'
import { Sym } from '../../icons/symbols'
import { TOP_BAR_HEIGHT, overviewLabelPoint, overviewWorkspaceRect } from '../../wm/geometry'
import { OVERVIEW_MODES, overviewTargets, overviewWindows, spreadsWindows, workspaceTransform } from './js/overviewModel'
import { RESULT_KINDS, firstResult, hasResults, overviewApps, overviewResults } from './js/overviewSearch'
import { useOpenPath } from '../popups/js/useOpenPath'
import { useReturnFocus } from '../popups/js/useFocusTrap'

// The global keys focus this field when the visitor starts typing in the overview
export const OVERVIEW_SEARCH_ID = 'rafeyos-overview-search'

const windowIdAt = (target) => {
  const element = target.closest?.('.win')
  return element ? Number(element.dataset.windowId) : null
}

/** Leaves the overview, then opens what was picked. */
const useLaunch = () => {
  const shellDispatch = useShellDispatch()
  const windowManager = useWindowManager()
  const openPath = useOpenPath()
  const openSettings = useOpenSettings()
  return useCallback(
    (entry) => {
      shellDispatch({ type: 'closeOverview' })
      if (entry.kind === RESULT_KINDS.APP) windowManager.openApp(entry.id)
      else if (entry.kind === RESULT_KINDS.FILE) openPath(entry.path)
      else openSettings(entry.page)
    },
    [shellDispatch, windowManager, openPath, openSettings],
  )
}

/** A click on the grid or results' empty space leaves the overview (mockup drawOv). */
const useCloseOnEmpty = () => {
  const shellDispatch = useShellDispatch()
  return (event) => event.target === event.currentTarget && shellDispatch({ type: 'closeOverview' })
}

const AppTile = ({ appId, on, onLaunch }) => (
  <button type="button" className={on ? 'agi on' : 'agi'} onClick={() => onLaunch({ kind: RESULT_KINDS.APP, id: appId })}>
    <AppIcon name={appId} />
    <span>{getApp(appId).name}</span>
  </button>
)

const AppGrid = ({ onLaunch }) => (
  <div className="appgrid" role="group" aria-label="Applications" onClick={useCloseOnEmpty()}>
    {overviewApps().map((appId, i) => (
      <AppTile key={appId} appId={appId} on={i === 0} onLaunch={onLaunch} />
    ))}
  </div>
)

const ResultRow = ({ icon, title, subtitle, on, onClick }) => (
  <button type="button" className={on ? 'rrow on' : 'rrow'} onClick={onClick}>
    {icon}
    <span>
      <b>{title}</b>
      <small>{subtitle}</small>
    </span>
  </button>
)

const isFirst = (first, kind, value) => first?.kind === kind && (first.id ?? first.path ?? first.page) === value

/** Apps, then files, then Settings pages; the first result is highlighted and Enter opens it. */
const SearchResults = ({ results, onLaunch }) => {
  const { vfs } = useVfs()
  const first = firstResult(results)
  const { APP, FILE, SETTING } = RESULT_KINDS
  return (
    <div className="results" onClick={useCloseOnEmpty()}>
      {results.apps.length > 0 && (
        <div className="rgroup" role="group" aria-label="Apps">
          <div className="rapps">
            {results.apps.map((id) => <AppTile key={id} appId={id} on={isFirst(first, APP, id)} onLaunch={onLaunch} />)}
          </div>
        </div>
      )}
      {results.files.length > 0 && (
        <div className="rgroup" role="group" aria-label="Files">
          <div className="mhead">Files</div>
          {results.files.map((file) => (
            <ResultRow key={file.path} icon={<FileIcon vfs={vfs} path={file.path} />} title={file.name} subtitle={file.parent}
              on={isFirst(first, FILE, file.path)} onClick={() => onLaunch({ kind: FILE, path: file.path })} />
          ))}
        </div>
      )}
      {results.settings.length > 0 && (
        <div className="rgroup" role="group" aria-label="Settings">
          <div className="mhead">Settings</div>
          {results.settings.map((entry) => (
            <ResultRow key={entry.page} icon={<AppIcon name="settings" />} title={entry.label} subtitle="Settings"
              on={isFirst(first, SETTING, entry.page)} onClick={() => onLaunch({ kind: SETTING, page: entry.page })} />
          ))}
        </div>
      )}
      {!hasResults(results) && <div className="rnone">No results.</div>}
    </div>
  )
}

const SearchField = ({ query, autoFocus, onQuery, onEnter }) => {
  const inputRef = useRef(null)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true })
  }, [autoFocus])
  return (
    <div className="ovsearch">
      <Sym name="search" />
      <input
        ref={inputRef}
        id={OVERVIEW_SEARCH_ID}
        value={query}
        placeholder="Type to search"
        aria-label="Type to search"
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          onEnter()
        }}
      />
    </div>
  )
}

/** Each window's title, centred below it; shown while the pointer is over that window. */
const WindowLabels = ({ workspace, hovered }) => {
  const windows = useWindowsState()
  const { area } = useLayout()
  const targets = useMemo(() => overviewTargets(windows, area), [windows, area])
  return overviewWindows(windows).map((win) => {
    const point = overviewLabelPoint(workspace, win.rect, targets.get(win.id))
    return (
      <div
        key={win.id}
        className={hovered === win.id ? 'ovlab on' : 'ovlab'}
        style={{ left: point.x, top: point.y - TOP_BAR_HEIGHT }}
        aria-hidden="true"
      >
        {win.title}
      </div>
    )
  })
}

/** The search field and whatever sits under it: nothing (windows), the app grid, or results. */
const OverviewUi = ({ overview, workspace, hovered }) => {
  const { vfs } = useVfs()
  const { compact } = useLayout()
  const shellDispatch = useShellDispatch()
  const launch = useLaunch()
  useReturnFocus({ onlyIfLost: true })
  const results = useMemo(() => overviewResults(vfs, overview.query), [vfs, overview.query])
  const searching = Boolean(overview.query.trim())
  const appGrid = !searching && overview.mode === OVERVIEW_MODES.APPS
  const onEnter = () => {
    const entry = searching || appGrid ? firstResult(results, { appGrid }) : null
    if (entry) launch(entry)
  }
  return (
    <div className="ovui" role="region" aria-label="Activities overview">
      {/* Phones skip the autofocus: it would raise the on-screen keyboard over the overview */}
      <SearchField query={overview.query} autoFocus={!compact} onEnter={onEnter}
        onQuery={(query) => shellDispatch({ type: 'setOverviewQuery', query })} />
      <div className="ovbody">
        {searching && <SearchResults results={results} onLaunch={launch} />}
        {appGrid && <AppGrid onLaunch={launch} />}
      </div>
      {spreadsWindows(overview) && <WindowLabels workspace={workspace} hovered={hovered} />}
    </div>
  )
}

/** Overview presses on the workspace pick a window (restoring it if minimized) or leave. */
const useWorkspacePointer = (overview, setHovered) => {
  const shellDispatch = useShellDispatch()
  const windowManager = useWindowManager()
  const windows = useWindowsState()
  const pick = (id) => (windows.byId[id]?.minimized ? windowManager.restore(id) : windowManager.focus(id))
  return {
    onPointerDownCapture: (event) => {
      if (!overview) return
      // Nothing inside (window chrome, the wallpaper's rubber band) sees the press
      event.stopPropagation()
      const id = windowIdAt(event.target)
      setHovered(null)
      shellDispatch({ type: 'closeOverview' })
      if (id !== null) pick(id)
    },
    onPointerOver: (event) => overview && setHovered(windowIdAt(event.target)),
    onPointerLeave: () => setHovered(null),
  }
}

/**
 * The workspace (wallpaper, icons, windows) and, while the Activities overview is open, the
 * overview UI above it. The workspace shrinks into a card; CSS transitions the transform.
 */
export const OverviewStage = ({ children }) => {
  const { overview } = useShellState()
  const { viewport, area } = useLayout()
  const [hovered, setHovered] = useState(null)
  const pointer = useWorkspacePointer(overview, setHovered)
  const workspace = overview ? overviewWorkspaceRect(viewport, area) : null
  return (
    <>
      <div className="ws" style={workspace ? { transform: workspaceTransform(workspace) } : undefined} {...pointer}>
        {children}
      </div>
      {overview && <OverviewUi overview={overview} workspace={workspace} hovered={hovered} />}
    </>
  )
}
