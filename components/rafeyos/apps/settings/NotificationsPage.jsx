import { useSettings } from '@/components/rafeyos/state/logic/contexts'
import { Switch } from '@/components/rafeyos/ui/controls/Switch'
import { BoxedGroup, Page, Row, ValueRow } from './SettingsRows'
import { useSettingActions } from './logic/useSettingActions'

const NOTIFYING_APPS = Object.freeze(['Files', 'Music', 'Terminal', 'Text Editor'])

/** Do Not Disturb (shared with the calendar), the lock screen switch and the apps that notify. */
export const NotificationsPage = () => {
  const { dnd } = useSettings()
  const { toggle } = useSettingActions()
  return (
    <Page>
      <BoxedGroup>
        <Row title="Do Not Disturb">
          <Switch on={dnd} label="Do Not Disturb" onToggle={() => toggle('dnd')} />
        </Row>
        <Row title="Lock Screen Notifications">
          {/* Cosmetic, as in the mockup: the lock screen never shows notifications */}
          <Switch on label="Lock Screen Notifications" />
        </Row>
      </BoxedGroup>
      <BoxedGroup title="Apps">
        {NOTIFYING_APPS.map((app) => (
          <ValueRow key={app} title={app} value="On" />
        ))}
      </BoxedGroup>
    </Page>
  )
}
