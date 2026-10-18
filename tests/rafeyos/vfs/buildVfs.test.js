import { describe, it, expect } from 'vitest'
import { buildVfs, HOME, TRASH } from '@/components/rafeyos/vfs/buildVfs'
import { fixtureContent, realContent, realVfs } from '@/tests/rafeyos/helpers/testVfs'

describe('buildVfs', () => {
  it('builds the mockup tree', () => {
    const vfs = buildVfs(fixtureContent)

    expect(Object.keys(vfs)).toEqual([
      '~', '~/Desktop', '~/Documents', '~/Music', '~/Music/song.mp3',
      '~/Music/story.txt', '~/blog', '~/blog/first-post.md', '~/contact', '~/contact/email.desktop',
      '~/contact/linkedin.desktop', '~/projects', '~/projects/alpha-project.txt', '~/projects/beta.txt',
      '~/bio.txt', '~/skills.txt', '~/README.txt', 'trash',
    ])
  })

  it('names home "visitor" and trash "Trash"', () => {
    const vfs = buildVfs(fixtureContent)

    expect(vfs[HOME].name).toBe('visitor')
    expect(vfs[TRASH]).toMatchObject({ type: 'dir', name: 'Trash' })
  })

  it('writes project files with an underline, description and optional case study', () => {
    const vfs = buildVfs(fixtureContent)

    expect(vfs['~/projects/alpha-project.txt']).toMatchObject({ type: 'text', projectIndex: 0 })
    expect(vfs['~/projects/alpha-project.txt'].text).toBe(
      'Alpha Project\n=============\n\none two three four five six seven eight\n\nCase study: https://a.example/\n',
    )
    expect(vfs['~/projects/beta.txt'].text).toBe('Beta\n====\n\nshort\n')
    expect(vfs['~/projects/beta.txt'].projectIndex).toBe(2)
  })

  it('writes music, story, blog and contact nodes', () => {
    const vfs = buildVfs(fixtureContent)

    expect(vfs['~/Music/song.mp3']).toMatchObject({ type: 'audio', sizeBytes: 2500000, durationSeconds: 120, src: '/song.mp3' })
    expect(vfs['~/Music/story.txt'].text).toBe('2000  Start\n2030  Album (upcoming)\n')
    expect(vfs['~/blog/first-post.md'].text).toBe('# First Post\n\n_2024-01-01_\n\nHello world\n')
    expect(vfs['~/contact/email.desktop']).toMatchObject({ type: 'mailto', display: 'Email Rafey', href: 'mailto:me@example.com' })
    expect(vfs['~/contact/linkedin.desktop']).toMatchObject({ type: 'weblink', display: 'LinkedIn', href: 'https://linkedin.example/me' })
    expect(vfs['~/contact/linkedin.desktop'].text).toContain('URL=https://linkedin.example/me')
    expect(vfs['~/README.txt']).toEqual(expect.objectContaining({ type: 'text', text: 'README\n' }))
    expect(vfs['~/README.txt'].small).toBeUndefined()
    expect(vfs['~/Documents']).toMatchObject({ type: 'dir', name: 'Documents' })
  })

  it('freezes the map and every node', () => {
    const vfs = buildVfs(fixtureContent)

    expect(Object.isFrozen(vfs)).toBe(true)
    Object.values(vfs).forEach((node) => expect(Object.isFrozen(node)).toBe(true))
  })

  it('from real content holds only visible projects and published posts, with the full post body', () => {
    const projectFiles = Object.keys(realVfs).filter((p) => p.startsWith('~/projects/'))

    expect(projectFiles).toHaveLength(realContent.projects.length)
    expect(projectFiles).not.toContain('~/projects/home-work.txt')
    expect(realVfs['~/Music/storms-ahead.mp3'].durationSeconds).toBe(158)
    const post = realContent.posts[0]
    expect(realVfs[`~/blog/${post.slug}.md`].text).toContain(post.content.trim().slice(-40))
  })
})
