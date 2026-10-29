// Terminal output is structured data rendered by React: no HTML strings, no innerHTML.

export const LINE_TYPES = Object.freeze({
  PRE: 'pre',
  ERROR: 'error',
  DIM: 'dim',
  LINK: 'link',
  LS: 'ls',
  PROMPT: 'prompt',
  PANEL: 'panel',
})

export const ENTRY_KINDS = Object.freeze({ DIR: 'dir', LINK: 'link', FILE: 'file' })

/** @typedef {ReturnType<typeof pre | typeof error | typeof dim | typeof link | typeof ls | typeof prompt | typeof panel>} Line */

export const pre = (text) => ({ type: LINE_TYPES.PRE, text })
export const error = (text) => ({ type: LINE_TYPES.ERROR, text })
export const dim = (text) => ({ type: LINE_TYPES.DIM, text })
export const link = (text, href) => ({ type: LINE_TYPES.LINK, text, href })

/** @param {{ name: string, kind: 'dir'|'link'|'file' }[]} entries */
export const ls = (entries) => ({ type: LINE_TYPES.LS, entries: entries.map((entry) => ({ ...entry })) })

/** The echoed `visitor@rafey.ai:<cwd>$ <cmd>` row; exec() never emits it, the UI does. */
export const prompt = (cwd, cmd) => ({ type: LINE_TYPES.PROMPT, cwd, cmd })

/**
 * A rich block the terminal draws itself (a project card, a player). It is screen-only, so it never reaches a pipe or
 * file. A `foreground` panel takes the keyboard until it closes.
 * @param {string} kind
 * @param {Record<string, unknown>} props
 * @param {{ foreground?: boolean }} [options]
 */
export const panel = (kind, props, { foreground = false } = {}) => ({ type: LINE_TYPES.PANEL, kind, props, foreground })
