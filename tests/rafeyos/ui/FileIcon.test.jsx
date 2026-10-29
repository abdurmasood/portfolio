// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { FileIcon } from '@/components/rafeyos/ui/icons/FileIcon'
import { HOME, NODE_TYPES } from '@/components/rafeyos/core/vfs/buildVfs'
import { visitorVfs } from '@/tests/rafeyos/helpers/testVfs'

afterEach(cleanup)

const vfs = visitorVfs()
const textFile = Object.keys(vfs).find((path) => vfs[path].type === NODE_TYPES.TEXT)
const audioFile = Object.keys(vfs).find((path) => vfs[path].type === NODE_TYPES.AUDIO)

const gradientIds = (svg) => [...svg.querySelectorAll('linearGradient')].map((gradient) => gradient.id)
const fillTargets = (svg) =>
  [...svg.querySelectorAll('[fill^="url("]')].map((element) => element.getAttribute('fill').slice(5, -1))

describe('file icons', () => {
  it('gives each folder its own gradients, so a grid of folders shades every one', () => {
    const { container } = render(
      <>
        <FileIcon vfs={vfs} path={HOME} />
        <FileIcon vfs={vfs} path="/home/visitor/Desktop" />
      </>,
    )

    const [home, desktop] = container.querySelectorAll('svg')

    expect(gradientIds(home).some((id) => gradientIds(desktop).includes(id))).toBe(false)
    expect(fillTargets(home).every((id) => gradientIds(home).includes(id))).toBe(true)
    expect(fillTargets(desktop).every((id) => gradientIds(desktop).includes(id))).toBe(true)
  })

  it('shades folders from the accent colour', () => {
    const { container } = render(<FileIcon vfs={vfs} path={HOME} />)

    const stops = [...container.querySelectorAll('stop')].map((stop) => stop.getAttribute('style'))

    expect(stops.length).toBeGreaterThan(0)
    expect(stops.every((style) => style.includes('var(--accent)'))).toBe(true)
  })

  it('keeps the house glyph on the Home folder', () => {
    const { container } = render(<FileIcon vfs={vfs} path={HOME} />)

    expect(container.querySelector('g[transform^="translate(22 29)"] path')).not.toBeNull()
  })

  it('draws a shaded page for a text file', () => {
    const { container } = render(<FileIcon vfs={vfs} path={textFile} />)

    const svg = container.querySelector('svg')

    expect(gradientIds(svg)).toHaveLength(2)
    expect(fillTargets(svg).every((id) => gradientIds(svg).includes(id))).toBe(true)
  })

  it('draws the audio note in the accent colour, so it follows a changed accent', () => {
    const { container } = render(<FileIcon vfs={vfs} path={audioFile} />)

    const note = container.querySelector('g[transform^="translate(20 24)"]')

    expect(note.style.stroke).toBe('var(--accent)')
    expect(container.innerHTML).not.toMatch(/#E95420/i)
  })
})
