// @ts-check
// gsettings over the visitor's saved appearance (Claude's calls 1-2): GNOME's own schemas and keys, values in
// GVariant text, and GNOME's wording for errors. Wi-Fi, Bluetooth, volume, Do Not Disturb and Night Light live only in
// memory, so they have no key. The wallpapers are gradients: their picture-uri files exist nowhere in the tree.
import { errnoText, failureErrno } from '@/components/rafeyos/core/commands/errors'
import { ICON_SIZE_RANGE } from '@/components/rafeyos/core/settings/settingsSchema'
import { createSettingsStore } from '@/components/rafeyos/core/settings/settingsStore'
import { settingsView } from '@/components/rafeyos/core/settings/settingsView'
import { ACCENTS } from '@/components/rafeyos/core/theme/accents'
import { WALLS } from '@/components/rafeyos/core/theme/walls'

/**
 * @import { SavedKey } from '@/components/rafeyos/core/settings/settingsSchema'
 * @import { SettingsResult } from '@/components/rafeyos/core/settings/settingsStore'
 * @import { SettingsView } from '@/components/rafeyos/core/settings/settingsView'
 * @import { CommandContext, CommandOutput } from './result'
 */

/**
 * One key: the setting it shows, the value it reads as now, and what typed text sets. `parse` gives undefined for text
 * that isn't one of its values, and null for the one that means "follow the default" (color-scheme's 'default').
 * @typedef {{
 *   setting: SavedKey,
 *   show: (settings: SettingsView) => string,
 *   parse: (typed: string) => unknown,
 * }} Key
 */

const FAILURE = 1
const BACKGROUNDS = 'file:///usr/share/backgrounds/rafeyos'
const QUOTED = /^'([^']*)'$|^"([^"]*)"$/
const INTEGER = /^-?\d+$/

/** GVariant's text for a string. @param {string} text */
const quote = (text) => `'${text}'`

/** A string as typed: GVariant's quotes are optional, as gsettings takes a bare word for a string key. @param {string} typed */
const unquote = (typed) => {
  const quoted = QUOTED.exec(typed)
  return quoted ? quoted[1] ?? quoted[2] : typed
}

/**
 * @typedef {readonly (readonly [text: string, value: unknown])[]} Pairs each GNOME value's text and the setting value
 *   it stands for
 */

/** The text standing for `value`, matching hex colours in any case. @param {Pairs} pairs @param {unknown} value */
const textOf = (pairs, value) => pairs.find(([, choice]) => String(choice).toLowerCase() === String(value).toLowerCase())?.[0] ?? ''

/** The value `text` stands for; undefined when it is none of them. @param {Pairs} pairs @param {string} text */
const valueOf = (pairs, text) => pairs.find(([choice]) => choice === text)?.[1]

/**
 * A string key whose GNOME values each stand for one setting value.
 * @param {SavedKey} setting
 * @param {Pairs} pairs
 * @returns {Key}
 */
const choiceKey = (setting, pairs) => ({
  setting,
  show: (settings) => quote(textOf(pairs, settings.get(setting))),
  parse: (typed) => valueOf(pairs, unquote(typed)),
})

// 'default' is no preference: rafeyOS follows the OS
/** @type {Pairs} */
const SCHEMES = Object.freeze([['default', null], ['prefer-light', 'light'], ['prefer-dark', 'dark']])

/** @type {Key} */
const COLOR_SCHEME = {
  setting: 'style',
  show: (settings) => quote(textOf(SCHEMES, settings.getState().style ?? null)),
  parse: (typed) => valueOf(SCHEMES, unquote(typed)),
}

/** @param {number} size a dock icon size the Settings slider can reach */
const onSlider = (size) => size >= ICON_SIZE_RANGE.min && size <= ICON_SIZE_RANGE.max && (size - ICON_SIZE_RANGE.min) % ICON_SIZE_RANGE.step === 0

/** @type {Key} */
const ICON_SIZE = {
  setting: 'iconSize',
  show: (settings) => String(settings.get('iconSize')),
  parse: (typed) => (INTEGER.test(typed) && onSlider(Number(typed)) ? Number(typed) : undefined),
}

/** @type {Pairs} */
const BOOLEANS = Object.freeze([['true', true], ['false', false]])

/** @type {Key} */
const SHOW_HOME = {
  setting: 'showHome',
  show: (settings) => textOf(BOOLEANS, settings.get('showHome')),
  parse: (typed) => valueOf(BOOLEANS, typed),
}

const WALLPAPER = choiceKey('wall', WALLS.map(({ name }, index) => [`${BACKGROUNDS}/${name.toLowerCase()}.png`, index]))

/** @type {Readonly<Record<string, Readonly<Record<string, Key>>>>} */
const SCHEMAS = Object.freeze({
  'org.gnome.desktop.background': { 'picture-uri': WALLPAPER, 'picture-uri-dark': WALLPAPER },
  'org.gnome.desktop.interface': {
    'accent-color': choiceKey('accent', ACCENTS.map(({ name, hex }) => [name.toLowerCase().replace(' ', '-'), hex])),
    'color-scheme': COLOR_SCHEME,
  },
  'org.gnome.shell.extensions.dash-to-dock': {
    'dash-max-icon-size': ICON_SIZE,
    'dock-position': choiceKey('dockPos', [['LEFT', 'left'], ['BOTTOM', 'bottom'], ['RIGHT', 'right']]),
  },
  'org.gnome.shell.extensions.ding': {
    'show-home': SHOW_HOME,
    'start-corner': choiceKey('corner', [['top-left', 'tl'], ['top-right', 'tr'], ['bottom-left', 'bl'], ['bottom-right', 'br']]),
  },
})

// Each command's arguments, as its usage line names them
/** @type {Readonly<Record<string, readonly string[]>>} */
const ARGUMENTS = Object.freeze({
  'list-schemas': [],
  'list-keys': ['SCHEMA'],
  'list-recursively': ['[SCHEMA]'],
  get: ['SCHEMA', 'KEY'],
  set: ['SCHEMA', 'KEY', 'VALUE'],
  reset: ['SCHEMA', 'KEY'],
})

const USAGE = Object.freeze([
  'Usage:',
  '  gsettings COMMAND [ARGS…]',
  '',
  'Commands:',
  '  list-schemas              List installed schemas',
  '  list-keys                 List keys in a schema',
  '  list-recursively          List keys and values, recursively',
  '  get                       Get the value of a key',
  '  set                       Set the value of a key',
  '  reset                     Reset the value of a key',
])

/** @param {string[]} stderr @returns {CommandOutput} */
const refuse = (stderr) => ({ stderr, code: FAILURE })

/** @param {readonly string[]} lines @returns {CommandOutput} */
const print = (lines) => ({ stdout: lines.map((line) => `${line}\n`).join('') })

/** @param {string} command */
const commandUsage = (command) => refuse(['Usage:', `  ${['gsettings', command, ...ARGUMENTS[command]].join(' ')}`])

/** @param {string} schema @returns {{ keys: Readonly<Record<string, Key>> } | { error: CommandOutput }} */
const schemaNamed = (schema) =>
  Object.hasOwn(SCHEMAS, schema) ? { keys: SCHEMAS[schema] } : { error: refuse([`No such schema “${schema}”`]) }

/** @param {string} schema @param {string} key @returns {{ key: Key } | { error: CommandOutput }} */
const keyNamed = (schema, key) => {
  const found = schemaNamed(schema)
  if ('error' in found) return found
  return Object.hasOwn(found.keys, key) ? { key: found.keys[key] } : { error: refuse([`No such key “${key}”`]) }
}

/** @param {Readonly<Record<string, unknown>>} record */
const sortedNames = (record) => Object.keys(record).sort()

/** Every key of `schemas` with its value now, as `SCHEMA KEY VALUE`. @param {string[]} schemas @param {SettingsView} settings */
const listing = (schemas, settings) =>
  schemas.flatMap((schema) => sortedNames(SCHEMAS[schema]).map((key) => `${schema} ${key} ${SCHEMAS[schema][key].show(settings)}`))

/**
 * Nothing on success. A write storage refused still applies for this session (Claude's call 2), but is reported.
 * @param {SettingsResult} saved
 * @returns {CommandOutput}
 */
const reported = (saved) => (saved.ok ? {} : refuse([`gsettings: error writing settings: ${errnoText(failureErrno(saved))}`]))

/**
 * Saves what `typed` stands for.
 * @param {SettingsView} settings @param {string} name the key's GNOME name @param {Key} key @param {string} typed
 * @returns {CommandOutput}
 */
const setKey = (settings, name, key, typed) => {
  const value = key.parse(typed)
  if (value === undefined) return refuse([`\`${typed}' is not a valid value for key “${name}”`])
  return reported(value === null ? settings.reset(key.setting) : settings.set(key.setting, value))
}

/**
 * One subcommand with the right number of arguments.
 * @param {string} command @param {string[]} args @param {SettingsView} settings
 * @returns {CommandOutput}
 */
const runCommand = (command, args, settings) => {
  if (command === 'list-schemas') return print(sortedNames(SCHEMAS))
  if (command === 'list-recursively' && !args.length) return print(listing(sortedNames(SCHEMAS), settings))
  if (command === 'list-keys' || command === 'list-recursively') {
    const found = schemaNamed(args[0])
    if ('error' in found) return found.error
    return print(command === 'list-keys' ? sortedNames(found.keys) : listing([args[0]], settings))
  }
  const [schema, name, typed] = args
  const found = keyNamed(schema, name)
  if ('error' in found) return found.error
  if (command === 'get') return print([found.key.show(settings)])
  if (command === 'reset') return reported(settings.reset(found.key.setting))
  return setKey(settings, name, found.key, typed)
}

/** Whether `command` takes `count` arguments: list-recursively's SCHEMA is optional. @param {string} command @param {number} count */
const takes = (command, count) => (command === 'list-recursively' ? count <= 1 : count === ARGUMENTS[command].length)

/** With no settings to hand, as when storage is unavailable: the defaults, and writes that can't be saved. */
const unsavedSettings = () => settingsView({ store: createSettingsStore({ storage: null }), prefersDark: () => true })

/** @param {CommandContext} context @returns {CommandOutput} */
const gsettings = ({ argv, settings = unsavedSettings() }) => {
  const [command, ...args] = argv
  if (command === undefined) return refuse([...USAGE])
  if (!Object.hasOwn(ARGUMENTS, command)) return refuse([`Unknown command ${command}`, '', ...USAGE])
  if (!takes(command, args.length)) return commandUsage(command)
  return runCommand(command, args, settings)
}

export const gsettingsCommands = Object.freeze({ gsettings })
