import { describe, it, expect } from 'vitest'
import { buildVfs, HOME, RAFEY_HOME, ROOT, TRASH } from '@/components/rafeyos/core/vfs/buildVfs'
import { fixtureContent, realContent, realVfs } from '@/tests/rafeyos/helpers/testVfs'

describe('buildVfs', () => {
  it('builds the mockup tree', () => {
    const vfs = buildVfs(fixtureContent)

    expect(Object.keys(vfs)).toEqual([
      '/', '/home',
      '/home/rafey', '/home/rafey/Music', '/home/rafey/Music/song.mp3', '/home/rafey/Music/story.txt',
      '/home/rafey/blog', '/home/rafey/blog/first-post.md',
      '/home/rafey/contact', '/home/rafey/contact/email.desktop', '/home/rafey/contact/linkedin.desktop',
      '/home/rafey/projects', '/home/rafey/projects/alpha-project.txt', '/home/rafey/projects/beta.txt',
      '/home/rafey/bio.txt', '/home/rafey/skills.txt', '/home/rafey/README.txt',
      '/home/visitor',
      '/usr', '/usr/local', '/usr/local/bin',
      '/usr/local/bin/bio', '/usr/local/bin/projects', '/usr/local/bin/blog', '/usr/local/bin/music',
      '/usr/local/bin/contact', '/usr/local/bin/skills', '/usr/local/bin/help', '/usr/local/bin/os',
      '/etc', '/etc/hostname', '/etc/os-release', '/etc/passwd',
      '/tmp', 'trash',
    ])
  })

  it('names the root "/", the homes by their users and trash "Trash"', () => {
    const vfs = buildVfs(fixtureContent)

    expect(vfs[ROOT].name).toBe('/')
    expect(vfs[HOME].name).toBe('visitor')
    expect(vfs[RAFEY_HOME].name).toBe('rafey')
    expect(vfs[TRASH]).toMatchObject({ type: 'dir', name: 'Trash' })
  })

  it('ships the system files: hostname, os-release, passwd and one stub per command', () => {
    const vfs = buildVfs(fixtureContent)
    const commands = Object.keys(vfs).filter((path) => path.startsWith('/usr/local/bin/'))

    expect(vfs['/etc/hostname'].text).toBe('rafey.ai\n')
    expect(vfs['/etc/os-release'].text).toContain('PRETTY_NAME="rafeyOS 24.04 LTS"')
    expect(vfs['/etc/passwd'].text.split('\n').map((line) => line.split(':')[0])).toEqual(['root', 'rafey', 'visitor', ''])
    expect(commands.map((path) => path.slice('/usr/local/bin/'.length))).toEqual([
      'bio', 'projects', 'blog', 'music', 'contact', 'skills', 'help', 'os',
    ])
    commands.forEach((path) => expect(vfs[path]).toMatchObject({ type: 'text', text: expect.stringMatching(/^#!\/bin\/sh\n/) }))
    expect(vfs['/tmp']).toMatchObject({ type: 'dir', name: 'tmp' })
  })

  it('writes project files with an underline, description and optional case study', () => {
    const vfs = buildVfs(fixtureContent)

    expect(vfs['/home/rafey/projects/alpha-project.txt']).toMatchObject({ type: 'text', projectIndex: 0 })
    expect(vfs['/home/rafey/projects/alpha-project.txt'].text).toBe(
      'Alpha Project\n=============\n\none two three four five six seven eight\n\nCase study: https://a.example/\n',
    )
    expect(vfs['/home/rafey/projects/beta.txt'].text).toBe('Beta\n====\n\nshort\n')
    expect(vfs['/home/rafey/projects/beta.txt'].projectIndex).toBe(2)
  })

  it('writes music, story, blog and contact nodes', () => {
    const vfs = buildVfs(fixtureContent)

    expect(vfs['/home/rafey/Music/song.mp3']).toMatchObject({ type: 'audio', sizeBytes: 2500000, durationSeconds: 120, src: '/song.mp3' })
    expect(vfs['/home/rafey/Music/story.txt'].text).toBe('2000  Start\n2030  Album (upcoming)\n')
    expect(vfs['/home/rafey/blog/first-post.md'].text).toBe('# First Post\n\n_2024-01-01_\n\nHello world\n')
    expect(vfs['/home/rafey/contact/email.desktop']).toMatchObject({ type: 'mailto', display: 'Email Rafey', href: 'mailto:me@example.com' })
    expect(vfs['/home/rafey/contact/linkedin.desktop']).toMatchObject({ type: 'weblink', display: 'LinkedIn', href: 'https://linkedin.example/me' })
    expect(vfs['/home/rafey/contact/linkedin.desktop'].text).toContain('URL=https://linkedin.example/me')
    expect(vfs['/home/rafey/README.txt']).toEqual(expect.objectContaining({ type: 'text', text: 'README\n' }))
    expect(vfs['/home/rafey/README.txt'].small).toBeUndefined()
    // The visitor's folders come from fsState's seed, not the shipped tree
    expect(vfs['/home/visitor/Documents']).toBeUndefined()
  })

  it('freezes the map and every node', () => {
    const vfs = buildVfs(fixtureContent)

    expect(Object.isFrozen(vfs)).toBe(true)
    Object.values(vfs).forEach((node) => expect(Object.isFrozen(node)).toBe(true))
  })

  it('from real content holds only visible projects and published posts, with the full post body', () => {
    const projectFiles = Object.keys(realVfs).filter((p) => p.startsWith('/home/rafey/projects/'))

    expect(projectFiles).toHaveLength(realContent.projects.length)
    expect(projectFiles).not.toContain('/home/rafey/projects/home-work.txt')
    expect(realVfs['/home/rafey/projects/arrhythmia-detector.txt'].text).toContain('source: https://github.com/abdurmasood/arrhythmia-classification')
    expect(realVfs['/home/rafey/projects/leaf-line.txt'].text).toContain('Case study: https://leaf.space/leaf-line/')
    expect(realVfs['/home/rafey/Music/storms-ahead.mp3'].durationSeconds).toBe(158)
    const post = realContent.posts[0]
    expect(realVfs[`/home/rafey/blog/${post.slug}.md`].text).toContain(post.content.trim().slice(-40))
  })
})
