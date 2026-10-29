// @ts-check
// Command-line options the way GNU's getopt reads them: short flags combine (`-la`), a valued option takes the rest
// of its word or the next one (`-n5`, `-n 5`), long options take `=value` or the next word, options may come after
// operands, and `--` ends them. Each command declares what it accepts; anything else is a usage error.

/**
 * @typedef {{
 *   name: string,
 *   flags?: string,
 *   values?: string,
 *   long?: Readonly<Record<string, string>>,
 *   numeric?: string,
 *   usageCode?: number,
 * }} OptionSpec `flags`: short letters with no value; `values`: short letters that take one; `long`: each long name
 *   -> the short letter it stands for; `numeric`: the valued letter a bare `-5` sets (head, tail); `usageCode`: the exit
 *   code for a usage error, 1 unless the command says otherwise (ls and grep use 2)
 * @typedef {{ flags: Record<string, true>, values: Record<string, string>, operands: string[] }} ParsedOptions `values`
 *   lists its letters in the order they were last given, so a command can tell which of two came last (head -c, -n)
 * @typedef {{ error: string[], code: number }} OptionError the stderr lines to print and the code to exit with
 * @typedef {{ consumed: 0 | 1 } | OptionError} OptionStep how many following words an option used, or why it failed
 */

const BARE_NUMBER = /^-\d+$/
const DEFAULT_USAGE_CODE = 1

/**
 * @param {OptionSpec} spec
 * @param {string} message
 * @returns {OptionError}
 */
const usageError = (spec, message) => ({
  error: [`${spec.name}: ${message}`, `Try '${spec.name} --help' for more information.`],
  code: spec.usageCode ?? DEFAULT_USAGE_CODE,
})

/** @param {OptionSpec} spec @param {string} letter */
const takesValue = (spec, letter) => Boolean(spec.values?.includes(letter))

/** A value given again moves to the end of `values`. @param {ParsedOptions} out @param {string} letter @param {string} value */
const setValue = (out, letter, value) => {
  delete out.values[letter]
  out.values[letter] = value
}

/**
 * One `-abc` word: flags until a valued letter, which takes the rest of the word or the next one.
 * @param {string} arg
 * @param {string | undefined} next the word after it
 * @param {OptionSpec} spec
 * @param {ParsedOptions} out
 * @returns {OptionStep}
 */
const readShort = (arg, next, spec, out) => {
  if (spec.numeric && BARE_NUMBER.test(arg)) {
    setValue(out, spec.numeric, arg.slice(1))
    return { consumed: 0 }
  }
  for (let index = 1; index < arg.length; index += 1) {
    const letter = arg[index]
    if (takesValue(spec, letter)) {
      const rest = arg.slice(index + 1)
      if (rest) {
        setValue(out, letter, rest)
        return { consumed: 0 }
      }
      if (next === undefined) return usageError(spec, `option requires an argument -- '${letter}'`)
      setValue(out, letter, next)
      return { consumed: 1 }
    }
    if (!spec.flags?.includes(letter)) return usageError(spec, `invalid option -- '${letter}'`)
    out.flags[letter] = true
  }
  return { consumed: 0 }
}

/**
 * One `--name` or `--name=value` word.
 * @param {string} arg
 * @param {string | undefined} next the word after it
 * @param {OptionSpec} spec
 * @param {ParsedOptions} out
 * @returns {OptionStep}
 */
const readLong = (arg, next, spec, out) => {
  const equals = arg.indexOf('=')
  const name = equals < 0 ? arg.slice(2) : arg.slice(2, equals)
  const letter = spec.long && Object.hasOwn(spec.long, name) ? spec.long[name] : undefined
  if (!letter) return usageError(spec, `unrecognized option '${arg}'`)
  if (takesValue(spec, letter)) {
    if (equals >= 0) {
      setValue(out, letter, arg.slice(equals + 1))
      return { consumed: 0 }
    }
    if (next === undefined) return usageError(spec, `option '--${name}' requires an argument`)
    setValue(out, letter, next)
    return { consumed: 1 }
  }
  if (equals >= 0) return usageError(spec, `option '--${name}' doesn't allow an argument`)
  out.flags[letter] = true
  return { consumed: 0 }
}

/**
 * Splits a command's arguments (its name not included) into options and operands.
 * @param {readonly string[]} argv
 * @param {OptionSpec} spec
 * @returns {ParsedOptions | OptionError}
 */
export const parseOptions = (argv, spec) => {
  /** @type {ParsedOptions} */
  const out = { flags: {}, values: {}, operands: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') {
      out.operands.push(...argv.slice(index + 1))
      break
    }
    if (arg === '-' || !arg.startsWith('-')) {
      out.operands.push(arg)
      continue
    }
    const read = arg.startsWith('--') ? readLong : readShort
    const step = read(arg, argv[index + 1], spec, out)
    if ('error' in step) return step
    index += step.consumed
  }
  return out
}
