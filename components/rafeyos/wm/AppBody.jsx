import { memo } from 'react'
import { useAppComponents } from '@/components/rafeyos/state/logic/contexts'

/** Memoised apart from the window, so focus, z-order and geometry changes don't re-render the app. */
export const AppBody = memo(function AppBody({ appId, windowId, arg, init }) {
  const App = useAppComponents()[appId]
  if (!App) throw new Error(`No component for app: ${appId}`)
  return <App windowId={windowId} arg={arg} init={init} />
})
