import { HeaderBar } from '@/components/rafeyos/wm/HeaderBar'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { SIDEBAR, isShowable } from './logic/filesView'

/**
 * Places list; the current location is highlighted unless a search is open. A folder the shell deleted, or replaced
 * with a file, drops out (Recent, Starred and Trash always stay).
 * @param {{
 *   vfs: import('@/components/rafeyos/core/vfs/buildVfs').Vfs,
 *   path: string,
 *   searching: boolean,
 *   onGo: (path: string) => void,
 *   onMainMenu: (event: import('react').MouseEvent) => void,
 * }} props
 */
export const FilesSidebar = ({ vfs, path, searching, onGo, onMainMenu }) => (
  <div className="side">
    <HeaderBar
      title="Files"
      controls={false}
      end={
        <button type="button" className="flat" aria-label="Main Menu" onClick={onMainMenu}>
          <Sym name="menu" />
        </button>
      }
    />
    <div className="slist" role="navigation" aria-label="Places">
      {SIDEBAR.map((place, i) => {
        if (!place) return <div key={`sep-${i}`} className="ssep" />
        if (!isShowable(vfs, place.path)) return null
        return (
          <button
            key={place.path}
            type="button"
            className={place.path === path && !searching ? 'srow on' : 'srow'}
            onClick={() => onGo(place.path)}
          >
            <Sym name={place.icon} />
            <span>{place.label}</span>
          </button>
        )
      })}
      <button type="button" className="srow" disabled>
        <Sym name="plus" />
        <span>Other Locations</span>
      </button>
    </div>
  </div>
)
