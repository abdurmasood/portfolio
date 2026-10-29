// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('components/rafeyos/styles/window.css', 'utf8')

/** Hover rules that paint the flat wash. `:hover` is stripped so jsdom can match them. */
const hoverWashSelectors = () =>
  [...css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)]
    .filter(([, selector, body]) => selector.includes('.srow:hover') && /background\s*:\s*var\(--btn\)/.test(body))
    .map(([_, selector]) => selector.replaceAll(':hover', '').trim())

describe('sidebar row', () => {
  it('keeps the selected fill when the pointer is over that row', () => {
    const root = document.createElement('div')
    root.className = 'rafeyos'
    const selected = document.createElement('button')
    selected.className = 'srow on'
    root.append(selected)
    document.body.append(root)

    const selectors = hoverWashSelectors()
    expect(selectors.length).toBeGreaterThan(0)
    for (const selector of selectors) expect(selected.matches(selector)).toBe(false)
  })
})
