import { useShellState } from '../state/contexts'
import { QuickSettings } from './QuickSettings'
import { PowerDialog } from './PowerDialog'
import { Banner } from './Banner'
import { SnapPreview } from '../wm/SnapPreview'

/** Popups, dialogs, banners and the snap preview, above windows and the dock. */
export const ShellLayer = () => {
  const { popup, dialog, banner } = useShellState()
  return (
    <div className="layer shell">
      <SnapPreview />
      {popup?.kind === 'qs' && <QuickSettings />}
      {banner && <Banner key={banner.title} banner={banner} />}
      {dialog && <PowerDialog key={dialog.kind} kind={dialog.kind} />}
    </div>
  )
}
