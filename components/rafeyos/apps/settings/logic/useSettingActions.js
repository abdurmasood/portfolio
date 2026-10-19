import { useMemo } from 'react'
import { useSettingsDispatch } from '@/components/rafeyos/state/logic/contexts'
import { SETTINGS_ACTIONS } from '@/components/rafeyos/state/logic/settingsReducer'

/** settingsReducer's set and toggle as plain calls, stable for the desktop's lifetime. */
export const useSettingActions = () => {
  const dispatch = useSettingsDispatch()
  return useMemo(
    () => ({
      set: (key, value) => dispatch({ type: SETTINGS_ACTIONS.SET, key, value }),
      toggle: (key) => dispatch({ type: SETTINGS_ACTIONS.TOGGLE, key }),
    }),
    [dispatch],
  )
}
