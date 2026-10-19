import { useEffect, useState } from 'react'
import { useShellDispatch } from '@/components/rafeyos/state/logic/contexts'
import { AppIcon } from '@/components/rafeyos/ui/icons/appIcons'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'
import { APP } from '@/components/rafeyos/core/catalog/apps'

export const BANNER_MS = 4200

/** A notification banner that slides in and dismisses itself. */
export const Banner = ({ banner }) => {
  const shellDispatch = useShellDispatch()
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true))
    const timer = setTimeout(() => shellDispatch({ type: SHELL_ACTIONS.HIDE_BANNER }), BANNER_MS)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [banner, shellDispatch])
  return (
    <div className={shown ? 'banner on' : 'banner'} role="status" aria-live="polite">
      <AppIcon name={banner.appId ?? APP.FILES} />
      <span>
        <b>{banner.title}</b>
        <small>{banner.body}</small>
      </span>
    </div>
  )
}
