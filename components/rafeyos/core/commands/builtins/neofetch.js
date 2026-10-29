// @ts-check
// neofetch (Claude's call 6): the approved logo beside real fields. The OS comes from /etc/os-release and uname, the
// uptime from when the shell started, the theme from the saved appearance, and the rest from Settings → About.
// It ignores its arguments. On screen the terminals colour the logo and labels; in a pipe it is plain text.
import { ABOUT_TEXT, aboutRows } from '@/components/rafeyos/core/catalog/about'
import { fetchLine, fetchRows } from '@/components/rafeyos/core/commands/lines'
import { ENV } from '@/components/rafeyos/core/commands/run'
import { DEFAULT_SETTINGS, STYLES } from '@/components/rafeyos/core/settings/settingsSchema'
import { ACCENTS } from '@/components/rafeyos/core/theme/accents'
import { NODE_TYPES } from '@/components/rafeyos/core/vfs/buildVfs'
import { neofetchUptime, UNAME_FIELDS } from './system'

/**
 * @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs'
 * @import { CommandContext, CommandOutput } from './result'
 */

// The approved logo: an r in a ring
const LOGO = Object.freeze(["   .-'''-.", '  /  .-.  \\', ' |  ( r )  |', "  \\  '-'  /", "   '-...-'"])
const OS_RELEASE = '/etc/os-release'
const PRETTY_NAME = /^PRETTY_NAME="?([^"\n]*)"?$/m
const MS_PER_SECOND = 1000

/** One of uname's fields, by its flag letter. @param {string} letter */
const unameField = (letter) => UNAME_FIELDS.find(([flag]) => flag === letter)?.[1] ?? ''

/** The distribution's own name for itself, as neofetch reads it. @param {Vfs} vfs */
const prettyName = (vfs) => {
  const node = vfs[OS_RELEASE]
  return (node?.type === NODE_TYPES.TEXT && PRETTY_NAME.exec(node.text)?.[1]) || ''
}

/** "Dark · Orange accent": the style and accent in effect, or the defaults where there is no saved appearance. @param {CommandContext['settings']} settings */
const themeOf = (settings) => {
  const { style, accent } = settings?.effective() ?? DEFAULT_SETTINGS
  const name = ACCENTS.find(({ hex }) => hex.toLowerCase() === accent.toLowerCase())?.name ?? accent
  return `${style === STYLES.LIGHT ? 'Light' : 'Dark'} · ${name} accent`
}

/** @param {CommandContext} context */
const fieldsOf = ({ fs, content, settings, now, startedAt }) => {
  const memory = aboutRows(content).hardware.find(({ title }) => title === 'Memory')?.value ?? ''
  const seconds = Math.max(0, Math.floor((now().getTime() - startedAt.getTime()) / MS_PER_SECOND))
  return [
    { label: 'OS', value: `${prettyName(fs.vfs())} ${unameField('m')}` },
    { label: 'Host', value: ABOUT_TEXT.hardwareModel },
    { label: 'Kernel', value: unameField('r') },
    { label: 'Uptime', value: neofetchUptime(seconds) },
    { label: 'Shell', value: ENV.SHELL.slice(ENV.SHELL.lastIndexOf('/') + 1) },
    { label: 'DE', value: `GNOME · ${ABOUT_TEXT.windowingSystem}` },
    { label: 'Theme', value: themeOf(settings) },
    { label: 'CPU', value: ABOUT_TEXT.processor },
    { label: 'Memory', value: memory },
  ]
}

/** The same rows as plain text, for a pipe or a file. @param {ReturnType<typeof fetchLine>} line */
const plainText = (line) =>
  fetchRows(line)
    .map(({ logo, label, text }) => `${`${logo}${label === undefined ? '' : `${label}: `}${text}`.trimEnd()}\n`)
    .join('')

/** @param {CommandContext} context @returns {CommandOutput} */
const neofetch = (context) => {
  const line = fetchLine(LOGO, `${ENV.USER}@${ENV.HOSTNAME}`, fieldsOf(context))
  return { stdout: plainText(line), display: [line] }
}

export const neofetchCommands = Object.freeze({ neofetch })
