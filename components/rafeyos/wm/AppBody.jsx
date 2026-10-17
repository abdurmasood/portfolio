import { memo } from 'react'
import { APP_COMPONENTS } from '../apps/appComponents'

/** Memoised apart from the window, so focus, z-order and geometry changes don't re-render the app. */
export const AppBody = memo(function AppBody({ appId, windowId, arg }) {
  const App = APP_COMPONENTS[appId]
  if (!App) throw new Error(`No component for app: ${appId}`)
  return <App windowId={windowId} arg={arg} />
})
