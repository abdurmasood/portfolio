import { Sym } from '../../icons/symbols'
import { BoxedGroup, Page, Row } from './SettingsRows'
import { SETTINGS_PAGES } from './logic/settingsPages'

const UNBUILT_BEFORE_ABOUT = Object.freeze(['Region & Language', 'Date & Time', 'Users', 'Remote Desktop', 'Secure Shell'])
const UNBUILT_AFTER_ABOUT = Object.freeze(['Software Updates'])

const DisabledRow = ({ title }) => (
  <Row title={title} className="row dis">
    <Sym name="chev" className="chev" />
  </Row>
)

/** System's panels; only About opens. */
export const SystemPage = ({ onGo }) => (
  <Page>
    <BoxedGroup>
      {UNBUILT_BEFORE_ABOUT.map((title) => (
        <DisabledRow key={title} title={title} />
      ))}
      <button type="button" className="row link" onClick={() => onGo(SETTINGS_PAGES.ABOUT)}>
        <span className="rt">
          About
          <small>Device name, system details and hardware</small>
        </span>
        <Sym name="chev" className="chev" />
      </button>
      {UNBUILT_AFTER_ABOUT.map((title) => (
        <DisabledRow key={title} title={title} />
      ))}
    </BoxedGroup>
  </Page>
)
