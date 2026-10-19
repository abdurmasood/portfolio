import { HeaderBar } from '@/components/rafeyos/wm/HeaderBar'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { SIDEBAR } from './logic/filesView'

/** Places list; the current location is highlighted unless a search is open. */
export const FilesSidebar = ({ path, searching, onGo, onMainMenu }) => (
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
      {SIDEBAR.map((place, i) =>
        place ? (
          <button
            key={place.path}
            type="button"
            className={place.path === path && !searching ? 'srow on' : 'srow'}
            onClick={() => onGo(place.path)}
          >
            <Sym name={place.icon} />
            <span>{place.label}</span>
          </button>
        ) : (
          <div key={`sep-${i}`} className="ssep" />
        ),
      )}
      <button type="button" className="srow" disabled>
        <Sym name="plus" />
        <span>Other Locations</span>
      </button>
    </div>
  </div>
)
