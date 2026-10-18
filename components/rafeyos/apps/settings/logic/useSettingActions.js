import { useMemo } from 'react'
import { useSettingsDispatch } from '../../../state/logic/contexts'

/** settingsReducer's set and toggle as plain calls, stable for the desktop's lifetime. */
export const useSettingActions = () => {
  const dispatch = useSettingsDispatch()
  return useMemo(
    () => ({
      set: (key, value) => dispatch({ type: 'set', key, value }),
      toggle: (key) => dispatch({ type: 'toggle', key }),
    }),
    [dispatch],
  )
}
