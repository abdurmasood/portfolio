import { useShellState } from '../../state/contexts'
import { QuickSettings } from './QuickSettings'
import { PowerDialog } from './PowerDialog'
import { isPowerDialog } from './js/powerDialogs'
import { OPEN_LINK_DIALOG, OpenLinkDialog } from './OpenLinkDialog'
import { ContextMenu } from '../menus/ContextMenu'
import { Banner } from './Banner'
import { CALENDAR_POPUP, CalendarPopover } from '../calendar/CalendarPopover'
import { QUICK_SETTINGS_POPUP } from '../chrome/TopBar'
import { SnapPreview } from '../../wm/SnapPreview'

const ShellDialog = ({ kind }) => {
  if (isPowerDialog(kind)) return <PowerDialog kind={kind} />
  if (kind === OPEN_LINK_DIALOG) return <OpenLinkDialog />
  throw new Error(`Unknown dialog: ${kind}`)
}

/** Popups, menus, dialogs, banners and the snap preview, above windows and the dock. */
export const ShellLayer = () => {
  const { popup, menu, dialog, banner } = useShellState()
  return (
    <div className="layer shell">
      <SnapPreview />
      {popup?.kind === QUICK_SETTINGS_POPUP && <QuickSettings />}
      {popup?.kind === CALENDAR_POPUP && <CalendarPopover />}
      {menu && <ContextMenu menu={menu} />}
      {banner && <Banner key={banner.title} banner={banner} />}
      {dialog && <ShellDialog key={dialog.kind} kind={dialog.kind} />}
    </div>
  )
}
