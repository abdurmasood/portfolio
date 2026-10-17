import { describe, it, expect } from 'vitest'
import { HELP_LINES, HELP_HINT, HOME_HELP_LINES, RAFEYOS_HELP_LINE, helpRow } from './help.js'

// Copied verbatim from components/home/Terminal.jsx before the extraction (HEAD)
const ORIGINAL_HELP = [
  'Available commands:',
  '',
  '  bio         background &amp; education',
  '  projects    body of work',
  "  blog        Rafey's latest thoughts",
  "  skills      tools he's worked with",
  '  music       his journey as a producer',
  '  contact     get in touch',
  '',
  "<span class='grey'>Use ↑ for history, tab to autocomplete, 'clear' to reset.</span>",
].join('\n')

describe('help text', () => {
  it('renders exactly the help block the terminal showed before extraction', () => {
    const rendered = [...HELP_LINES, HELP_HINT].join('\n')

    expect(rendered).toBe(ORIGINAL_HELP)
  })

  it('aligns the rafeyos row with the existing description column', () => {
    const contactRow = HELP_LINES.find((line) => line.includes('contact'))
    const column = contactRow.indexOf('get in touch')

    expect(RAFEYOS_HELP_LINE).toBe('  rafeyos     point-and-click version of this site')
    expect(RAFEYOS_HELP_LINE.indexOf('point-and-click')).toBe(column)
  })

  it('keeps the rafeyos row out of the shared list that rafeyOS itself shows', () => {
    expect(HELP_LINES).not.toContain(RAFEYOS_HELP_LINE)
  })

  it('adds rafeyos to the home list as the last command row, before the blank line', () => {
    expect(HOME_HELP_LINES.at(-2)).toBe(RAFEYOS_HELP_LINE)
    expect(HOME_HELP_LINES.at(-1)).toBe('')
  })

  it('leaves every other home help row exactly as it was', () => {
    const withoutRafeyos = HOME_HELP_LINES.filter((line) => line !== RAFEYOS_HELP_LINE)

    expect([...withoutRafeyos, HELP_HINT].join('\n')).toBe(ORIGINAL_HELP)
  })

  it('never lists the hidden startx alias', () => {
    expect(HOME_HELP_LINES.join('\n')).not.toContain('startx')
  })

  it('pads every command name to the same column', () => {
    expect(helpRow('x', 'y').indexOf('y')).toBe(helpRow('contact', 'y').indexOf('y'))
  })
})
