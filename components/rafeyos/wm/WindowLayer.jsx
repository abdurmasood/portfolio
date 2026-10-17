import { useWindowsState } from '../state/contexts'
import { zIndexOf } from '../state/selectors'
import { Window } from './Window'

/** Windows in creation order (DOM nodes never move); stacking comes from z-index alone. */
export const WindowLayer = () => {
  const state = useWindowsState()
  const ids = Object.keys(state.byId).map(Number).sort((a, b) => a - b)
  return (
    <div className="layer wins">
      {ids.map((id) => (
        <Window key={id} win={state.byId[id]} zIndex={zIndexOf(state, id)} focused={state.focusedId === id} />
      ))}
    </div>
  )
}
