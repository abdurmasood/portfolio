import { SessionDispatchContext, useServices } from '../state/contexts'
import { SESSION_EVENTS, SESSION_STATES } from './sessionMachine'
import { useSession } from './useSession'
import { BootSplash } from './BootSplash'
import { DesktopProvider } from '../state/DesktopProvider'
import { Desktop } from '../shell/Desktop'

const GoneScreen = () => <div className="rafeyos-boot" aria-hidden="true" />

/** Boot splash, then the desktop. The desktop's state lives below, so leaving resets it. */
export const SessionGate = () => {
  const services = useServices()
  const { state, dispatch } = useSession(services)
  if (state === SESSION_STATES.BOOT) return <BootSplash onSkip={() => dispatch(SESSION_EVENTS.SKIP)} />
  if (state === SESSION_STATES.EXITED) return <GoneScreen />
  return (
    <SessionDispatchContext.Provider value={dispatch}>
      <DesktopProvider>
        <Desktop />
      </DesktopProvider>
    </SessionDispatchContext.Provider>
  )
}
