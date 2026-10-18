import { describe, expect, it } from 'vitest'
import { projectForPath, projectIndexFor } from '@/components/rafeyos/core/vfs/projectPaths'
import { buildContent } from '@/components/rafeyos/core/vfs/content'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { fixtureContent } from '@/tests/rafeyos/helpers/testVfs'

describe('project paths', () => {
  it('finds a project by slug, or falls back to the first', () => {
    const projects = [{ slug: 'a' }, { slug: 'b' }]

    expect(projectIndexFor(projects, 'b')).toBe(1)
    expect(projectIndexFor(projects, 'nope')).toBe(0)
    expect(projectIndexFor(projects, undefined)).toBe(0)
  })

  it('knows which project a ~/projects file describes', () => {
    const content = buildContent()
    const vfs = buildVfs(content)
    const [first] = content.projects

    expect(projectForPath({ vfs, content }, `~/projects/${first.slug}.txt`)).toBe(first)
    expect(projectForPath({ vfs, content }, '~/bio.txt')).toBeNull()
    expect(projectForPath({ vfs, content }, '~/projects')).toBeNull()
    expect(projectForPath({ vfs, content }, '~/nope')).toBeNull()
  })

  it('matches by the project index buildVfs stores, not by position', () => {
    const vfs = buildVfs(fixtureContent)

    expect(projectForPath({ vfs, content: fixtureContent }, '~/projects/beta.txt')?.title).toBe('Beta')
  })
})
