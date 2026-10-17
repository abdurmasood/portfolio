// Help text for the home terminal. Rows are HTML (rendered with dangerouslySetInnerHTML)

// Descriptions start at this column so every row lines up
const DESCRIPTION_COLUMN = 14
const INDENT = '  '

export const helpRow = (name, description) =>
  `${INDENT}${name.padEnd(DESCRIPTION_COLUMN - INDENT.length)}${description}`

export const HELP_LINES = Object.freeze([
  'Available commands:',
  '',
  helpRow('bio', 'background &amp; education'),
  helpRow('projects', 'body of work'),
  helpRow('blog', "Rafey's latest thoughts"),
  helpRow('skills', "tools he's worked with"),
  helpRow('music', 'his journey as a producer'),
  helpRow('contact', 'get in touch'),
  '',
])

export const HELP_HINT = "<span class='grey'>Use ↑ for history, tab to autocomplete, 'clear' to reset.</span>"

// Not rendered yet: the rafeyos command ships in P1
export const RAFEYOS_HELP_LINE = helpRow('rafeyos', 'point-and-click version of this site')
