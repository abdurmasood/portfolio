import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { useWindowChrome } from './logic/WindowChromeContext'

/** Minimize, maximize/restore and close, as in GNOME's header bars. */
export const WindowControls = () => {
  const { minimize, toggleMax, close, isMax } = useWindowChrome()
  return (
    <div className="wctl">
      <button type="button" aria-label="Minimize" onClick={minimize}>
        <Sym name="min" />
      </button>
      <button type="button" aria-label={isMax ? 'Restore' : 'Maximize'} onClick={toggleMax}>
        <Sym name={isMax ? 'unmax' : 'max'} />
      </button>
      <button type="button" aria-label="Close" onClick={close}>
        <Sym name="close" />
      </button>
    </div>
  )
}
