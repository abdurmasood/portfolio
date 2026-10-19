import { Fragment, useEffect, useRef } from 'react'
import { HeaderBar } from '@/components/rafeyos/wm/HeaderBar'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { FILE_VIEWS, FILES_ACTIONS } from './logic/filesReducer'
import { PLACES, locationLabel, pathSegments } from './logic/filesView'
import { NO_DRAG_PROPS } from '@/components/rafeyos/ui/logic/domHooks'

const Pathbar = ({ vfs, path, onGo }) => {
  const place = PLACES[path]
  if (place) {
    return (
      <div className="pathbar" {...NO_DRAG_PROPS}>
        <button type="button" className="cur">
          <Sym name={place.icon} />
          <span>{place.label}</span>
        </button>
      </div>
    )
  }
  const segments = pathSegments(path)
  return (
    <div className="pathbar" {...NO_DRAG_PROPS} aria-label="Location">
      {segments.map((segment, i) => (
        <Fragment key={segment}>
          {i > 0 && <span className="sl">/</span>}
          <button type="button" className={i === segments.length - 1 ? 'cur' : undefined} onClick={() => onGo(segment)}>
            {segment === HOME && <Sym name="home" />}
            <span>{locationLabel(vfs, segment)}</span>
          </button>
        </Fragment>
      ))}
    </div>
  )
}

const SearchBar = ({ query, onSearch }) => {
  const inputRef = useRef(null)
  useEffect(() => inputRef.current?.focus({ preventScroll: true }), [])
  return (
    <div className="searchbar" {...NO_DRAG_PROPS}>
      <Sym name="search" />
      <input
        ref={inputRef}
        value={query}
        placeholder="Search everywhere"
        aria-label="Search files"
        onChange={(event) => onSearch(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && onSearch(null)}
      />
    </div>
  )
}

/**
 * Back/forward, pathbar (or search field), search and view toggles, window controls.
 * sidebarToggle: shown first, for narrow windows where the places sidebar is hidden.
 * @param {{
 *   vfs: import('@/components/rafeyos/core/vfs/buildVfs').Vfs,
 *   state: import('./logic/filesReducer').FilesState,
 *   dispatch: import('react').Dispatch<import('./logic/filesReducer').FilesAction>,
 *   onViewOptions: (event: import('react').MouseEvent) => void,
 *   sidebarToggle?: import('react').ReactNode,
 * }} props
 */
export const FilesHeader = ({ vfs, state, dispatch, onViewOptions, sidebarToggle = null }) => {
  const searching = state.search !== null
  const go = (path) => dispatch({ type: FILES_ACTIONS.GO, path })
  const onSearch = (query) => dispatch({ type: FILES_ACTIONS.SET_SEARCH, query })
  const isGrid = state.view === FILE_VIEWS.GRID
  return (
    <HeaderBar
      className="files-hb"
      start={
        <>
          {sidebarToggle}
          <button type="button" className="flat" aria-label="Back" disabled={!state.back.length} onClick={() => dispatch({ type: FILES_ACTIONS.BACK })}>
            <Sym name="back" />
          </button>
          <button type="button" className="flat" aria-label="Forward" disabled={!state.fwd.length} onClick={() => dispatch({ type: FILES_ACTIONS.FORWARD })}>
            <Sym name="fwd" />
          </button>
        </>
      }
      center={searching ? <SearchBar query={state.search} onSearch={onSearch} /> : <Pathbar vfs={vfs} path={state.path} onGo={go} />}
      end={
        <>
          <button type="button" className={searching ? 'flat on' : 'flat'} aria-label="Search" onClick={() => onSearch(searching ? null : '')}>
            <Sym name="search" />
          </button>
          <button
            type="button"
            className="flat"
            aria-label={isGrid ? 'List view' : 'Grid view'}
            onClick={() => dispatch({ type: FILES_ACTIONS.SET_VIEW, view: isGrid ? FILE_VIEWS.LIST : FILE_VIEWS.GRID })}
          >
            <Sym name={isGrid ? 'list' : 'grid'} />
          </button>
          <button type="button" className="flat" aria-label="View options" onClick={onViewOptions}>
            <Sym name="down" />
          </button>
        </>
      }
    />
  )
}
