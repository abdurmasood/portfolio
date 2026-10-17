import { useEffect, useState } from 'react'
import { useShellDispatch } from '../state/contexts'
import { AppIcon } from '../icons/appIcons'

export const BANNER_MS = 4200

/** A notification banner that slides in and dismisses itself. */
export const Banner = ({ banner }) => {
  const shellDispatch = useShellDispatch()
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true))
    const timer = setTimeout(() => shellDispatch({ type: 'hideBanner' }), BANNER_MS)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [banner, shellDispatch])
  return (
    <div className={shown ? 'banner on' : 'banner'} role="status" aria-live="polite">
      <AppIcon name={banner.appId ?? 'files'} />
      <span>
        <b>{banner.title}</b>
        <small>{banner.body}</small>
      </span>
    </div>
  )
}
