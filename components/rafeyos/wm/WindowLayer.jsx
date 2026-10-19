import { useMemo } from 'react'
import { useLayout, useShellState, useWindowsState } from '@/components/rafeyos/state/logic/contexts'
import { zIndexOf } from '@/components/rafeyos/state/logic/selectors'
import { overviewTargets, spreadsWindows } from '@/components/rafeyos/wm/logic/overviewModel'
import { Window } from './Window'

/** Windows in creation order (DOM nodes never move); stacking comes from z-index alone. */
export const WindowLayer = () => {
  const state = useWindowsState()
  const { overview } = useShellState()
  const { area } = useLayout()
  const spread = spreadsWindows(overview)
  const targets = useMemo(() => (spread ? overviewTargets(state, area) : null), [spread, state, area])
  const ids = Object.keys(state.byId).map(Number).sort((a, b) => a - b)
  return (
    <div className="layer wins">
      {ids.map((id) => (
        <Window
          key={id}
          win={state.byId[id]}
          zIndex={zIndexOf(state, id)}
          focused={state.focusedId === id}
          overviewTarget={targets?.get(id) ?? null}
        />
      ))}
    </div>
  )
}
