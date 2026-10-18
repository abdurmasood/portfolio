import { useEffect, useMemo, useState } from 'react'
import { WifiLinkContext, useServices } from './logic/contexts'

// The arc changes at a fixed pace. A reconnect lasts longer or shorter by repeating that sweep.
export const WIFI_STEP_MS = 200
export const WIFI_SWEEPS_MIN = 2
export const WIFI_SWEEPS_MAX = 4
// Must match the number of arcs drawn in icons/symbols (WIFI_ARCS); state can't import UI.
export const WIFI_ARC_COUNT = 3

const rollSweeps = () =>
  WIFI_SWEEPS_MIN + Math.floor(Math.random() * (WIFI_SWEEPS_MAX - WIFI_SWEEPS_MIN + 1))

/**
 * The reconnect sweep. It starts only when Wi-Fi flips from off to on, so a load
 * that is already connected stays on the full icon. Reduced motion skips it.
 */
export const WifiLinkProvider = ({ wifi, children }) => {
  const { reducedMotion } = useServices()
  // State, not a ref: StrictMode replays the render and would drop the setState that a ref write had scheduled.
  const [prevWifi, setPrevWifi] = useState(wifi)
  const [searching, setSearching] = useState(false)
  const [arc, setArc] = useState(0)

  if (wifi !== prevWifi) {
    setPrevWifi(wifi)
    const next = wifi && !prevWifi && !reducedMotion()
    setSearching(next)
    if (next) setArc(0)
  }

  useEffect(() => {
    if (!searching) return undefined
    const steps = WIFI_ARC_COUNT * rollSweeps()
    let step = 0
    const id = setInterval(() => {
      step += 1
      if (step >= steps) {
        clearInterval(id)
        setSearching(false)
        return
      }
      setArc(step % WIFI_ARC_COUNT)
    }, WIFI_STEP_MS)
    return () => clearInterval(id)
  }, [searching])

  const value = useMemo(() => ({ searching, arc }), [searching, arc])
  return <WifiLinkContext.Provider value={value}>{children}</WifiLinkContext.Provider>
}
