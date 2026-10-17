/**
 * Splits a command line on whitespace. Words starting with "-" are flags; the rest are args.
 * `words` keeps every token after the name in order (echo needs flags verbatim).
 * @returns {{ name: string, args: string[], flags: string[], words: string[] }}
 */
export const parse = (raw) => {
  const tokens = String(raw ?? '').trim().split(/\s+/).filter(Boolean)
  const [name = '', ...words] = tokens
  return {
    name,
    args: words.filter((word) => !word.startsWith('-')),
    flags: words.filter((word) => word.startsWith('-')),
    words,
  }
}
