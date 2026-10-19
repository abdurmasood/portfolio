import { useShellState } from '@/components/rafeyos/state/logic/contexts'
import { QuickSettings } from '@/components/rafeyos/shell/popups/QuickSettings'
import { PowerDialog } from '@/components/rafeyos/shell/popups/PowerDialog'
import { isPowerDialog } from '@/components/rafeyos/shell/popups/logic/powerDialogs'
import { OPEN_LINK_DIALOG, OpenLinkDialog } from '@/components/rafeyos/ui/popups/OpenLinkDialog'
import { ContextMenu } from '@/components/rafeyos/shell/menus/ContextMenu'
import { Banner } from '@/components/rafeyos/shell/popups/Banner'
import { CalendarPopover } from '@/components/rafeyos/shell/calendar/CalendarPopover'
import { CALENDAR_POPUP, QUICK_SETTINGS_POPUP } from '@/components/rafeyos/shell/logic/shellIds'
import { SnapPreview } from '@/components/rafeyos/wm/SnapPreview'

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
