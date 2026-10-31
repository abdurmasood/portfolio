// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SkillRows } from '@/components/home/SkillsOutput'
import { skillsDescription } from '@/lib/descriptions'

afterEach(cleanup)

const rowsOf = (container) => {
  const grid = container.querySelector('.skill-rows')
  return {
    categories: [...grid.querySelectorAll(':scope > .dim')].map((cell) => cell.textContent.trim()),
    links: [...grid.querySelectorAll('a.skill')].map((link) => [link.textContent, link.getAttribute('href'), link.target, link.rel]),
    // Cell by cell: the padding and newlines between cells in the HTML don't show in the grid
    cells: [...grid.children].map((cell) => cell.textContent.trim()),
  }
}

describe('SkillRows', () => {
  // skillsDescription still makes skills.txt's text, so the two must list the same tools
  it('draws the same categories, tools and links as skillsDescription', () => {
    const fromComponent = render(<SkillRows />).container
    const fromHtml = render(<div dangerouslySetInnerHTML={{ __html: skillsDescription }} />).container

    expect(rowsOf(fromComponent)).toEqual(rowsOf(fromHtml))
    expect(rowsOf(fromComponent).links.length).toBeGreaterThan(0)
  })
})
