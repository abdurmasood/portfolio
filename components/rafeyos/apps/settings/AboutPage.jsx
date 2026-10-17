import { useMemo } from 'react'
import { useVfs } from '../../state/contexts'
import { BoxedGroup, Page, ValueRow } from './SettingsRows'
import { ABOUT_TEXT, aboutRows } from './aboutData'

const Rows = ({ rows }) => rows.map((row) => <ValueRow key={row.title} title={row.title} value={row.value} />)

/** rafeyOS's About panel: Rafey described as hardware. */
export const AboutPage = () => {
  const { content } = useVfs()
  const { hardware, details } = useMemo(() => aboutRows(content), [content])
  return (
    <Page>
      <div className="about-hero">
        <div className="lg">
          rafey<b>OS</b>
        </div>
        <small>{ABOUT_TEXT.product}</small>
      </div>
      <BoxedGroup>
        <ValueRow title="Device Name" value={ABOUT_TEXT.deviceName} selectable />
      </BoxedGroup>
      <BoxedGroup>
        <Rows rows={hardware} />
      </BoxedGroup>
      <BoxedGroup title="System Details">
        <Rows rows={details} />
      </BoxedGroup>
    </Page>
  )
}
