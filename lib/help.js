// Help text for the home terminal. Rows are HTML (rendered with dangerouslySetInnerHTML)

// Descriptions start at this column so every row lines up
const DESCRIPTION_COLUMN = 14
const INDENT = '  '

export const helpRow = (name, description) =>
  `${INDENT}${name.padEnd(DESCRIPTION_COLUMN - INDENT.length)}${description}`

const MUSIC_ROW = helpRow('music', 'production')

const COMMAND_ROWS = Object.freeze([
  helpRow('bio', 'biography'),
  helpRow('skills', 'toolkit'),
  helpRow('projects', 'body of work'),
  helpRow('blog', 'thoughts'),
  MUSIC_ROW,
  helpRow('contact', 'get in touch'),
])

// The site help list hides music; typing the command still works.
const HOME_COMMAND_ROWS = COMMAND_ROWS.filter((row) => row !== MUSIC_ROW)

const HEADER = 'Available commands:'

/** The shared command list; rafeyOS's own terminal shows exactly this. */
export const HELP_LINES = Object.freeze([HEADER, '', ...COMMAND_ROWS, ''])

export const HELP_HINT = "<span class='grey'>Use ↑ for history, tab to autocomplete, 'clear' to reset.</span>"

export const RAFEYOS_HELP_LINE = helpRow('os', 'operating system')

/** The home terminal's list: shared rows without music, plus os as the last row (startx stays hidden). */
export const HOME_HELP_LINES = Object.freeze([HEADER, '', ...HOME_COMMAND_ROWS, RAFEYOS_HELP_LINE, ''])
