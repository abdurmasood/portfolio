import { Fragment, useEffect, useRef } from 'react'
import { HeaderBar } from '../../wm/HeaderBar'
import { Sym } from '../../icons/symbols'
import { HOME } from '../../vfs/buildVfs'
import { FILE_VIEWS } from './filesReducer'
import { PLACES, locationLabel, pathSegments } from './filesView'

const Pathbar = ({ vfs, path, onGo }) => {
  const place = PLACES[path]
  if (place) {
    return (
      <div className="pathbar nodrag">
        <button type="button" className="cur">
          <Sym name={place.icon} />
          <span>{place.label}</span>
        </button>
      </div>
    )
  }
  const segments = pathSegments(path)
  return (
    <div className="pathbar nodrag" aria-label="Location">
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
    <div className="searchbar nodrag">
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

/** Back/forward, pathbar (or search field), search and view toggles, window controls. */
export const FilesHeader = ({ vfs, state, dispatch }) => {
  const searching = state.search !== null
  const go = (path) => dispatch({ type: 'go', path })
  const onSearch = (query) => dispatch({ type: 'setSearch', query })
  const isGrid = state.view === FILE_VIEWS.GRID
  return (
    <HeaderBar
      start={
        <>
          <button type="button" className="flat" aria-label="Back" disabled={!state.back.length} onClick={() => dispatch({ type: 'back' })}>
            <Sym name="back" />
          </button>
          <button type="button" className="flat" aria-label="Forward" disabled={!state.fwd.length} onClick={() => dispatch({ type: 'forward' })}>
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
            onClick={() => dispatch({ type: 'setView', view: isGrid ? FILE_VIEWS.LIST : FILE_VIEWS.GRID })}
          >
            <Sym name={isGrid ? 'list' : 'grid'} />
          </button>
          <button type="button" className="flat" aria-label="View options" disabled>
            <Sym name="down" />
          </button>
        </>
      }
    />
  )
}
