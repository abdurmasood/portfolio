// Terminal output is structured data rendered by React: no HTML strings, no innerHTML.

export const LINE_TYPES = Object.freeze({
  PRE: 'pre',
  ERROR: 'error',
  DIM: 'dim',
  LINK: 'link',
  LS: 'ls',
  PROMPT: 'prompt',
})

export const ENTRY_KINDS = Object.freeze({ DIR: 'dir', LINK: 'link', FILE: 'file' })

/** @typedef {ReturnType<typeof pre | typeof error | typeof dim | typeof link | typeof ls | typeof prompt>} Line */

export const pre = (text) => ({ type: LINE_TYPES.PRE, text })
export const error = (text) => ({ type: LINE_TYPES.ERROR, text })
export const dim = (text) => ({ type: LINE_TYPES.DIM, text })
export const link = (text, href) => ({ type: LINE_TYPES.LINK, text, href })

/** @param {{ name: string, kind: 'dir'|'link'|'file' }[]} entries */
export const ls = (entries) => ({ type: LINE_TYPES.LS, entries: entries.map((entry) => ({ ...entry })) })

/** The echoed `visitor@rafey.ai:<cwd>$ <cmd>` row; exec() never emits it, the UI does. */
export const prompt = (cwd, cmd) => ({ type: LINE_TYPES.PROMPT, cwd, cmd })
