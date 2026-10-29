import { describe, it, expect } from 'vitest'
import { exec, COMMANDS, COMPLETION_COMMANDS } from '@/components/rafeyos/core/commands/exec'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { fixtureContent, realContent, realVfs, visitorVfs } from '@/tests/rafeyos/helpers/testVfs'

const vfs = visitorVfs(fixtureContent)
const run = (raw, cwd = '/home/rafey', content = fixtureContent) => exec(raw, { vfs: content === fixtureContent ? vfs : realVfs, cwd, content })
const texts = (out) => out.lines.map((line) => line.text)

describe('exec basics', () => {
  it('does nothing for blank input', () => {
    expect(run('   ', '/home/rafey/Music')).toEqual({ lines: [], effects: [], cwd: '/home/rafey/Music' })
  })

  it('reports unknown commands with the original spelling', () => {
    expect(run('Frobnicate now').lines).toEqual([{ type: 'error', text: "Command not found: 'Frobnicate'" }])
  })

  it('does not treat object prototype keys as commands', () => {
    expect(run('constructor').lines[0].type).toBe('error')
  })

  it('matches command names case-insensitively', () => {
    expect(texts(run('WHOAMI'))).toEqual(['visitor'])
  })

  it('keeps startx runnable but out of completion', () => {
    expect(COMMANDS.startx).toBeDefined()
    expect(COMPLETION_COMMANDS).not.toContain('startx')
    expect(COMPLETION_COMMANDS).toContain('help')
  })
})

describe('content commands', () => {
  it('help prints the help block and a dim hint', () => {
    const out = run('help', '/home/rafey', realContent)

    expect(out.lines[0].text).toBe(
      "Available commands:\n\n  bio         biography\n  skills      toolkit\n" +
        "  projects    body of work\n  blog        thoughts\n" +
        '  music       production\n  contact     get in touch\n',
    )
    expect(out.lines[1]).toEqual({ type: 'dim', text: "Use ↑ for history, tab to autocomplete, 'clear' to reset." })
  })

  it('bio and skills print their text', () => {
    expect(texts(run('bio'))).toEqual(['Bio text\n'])
    expect(texts(run('skills'))).toEqual(['Skills text\n'])
  })

  it('projects lists titles with a seven-word summary and a hint', () => {
    const out = run('projects')

    expect(out.lines[0].text).toBe(
      `  ${'Alpha Project'.padEnd(22)}one two three four five six seven…\n  ${'Beta'.padEnd(22)}short…`,
    )
    expect(out.lines[1]).toEqual({ type: 'dim', text: 'Open one with: xdg-open projects/alpha-project.txt   ·   3D view: projects --3d' })
    expect(out.effects).toEqual([])
  })

  it('projects prefers leaf-line in the hint, as the mockup does', () => {
    expect(run('projects', '/home/rafey', realContent).lines[1].text).toBe(
      'Open one with: xdg-open projects/leaf-line.txt   ·   3D view: projects --3d',
    )
  })

  it('projects without any projects only mentions the 3D view', () => {
    const empty = { ...fixtureContent, projects: [] }

    expect(exec('projects', { vfs, cwd: '/home/rafey', content: empty }).lines[1].text).toBe('3D view: projects --3d')
  })

  it('projects --3d opens the Projects app', () => {
    const out = run('projects --3d')

    expect(texts(out)).toEqual(['Opening Projects…'])
    expect(out.effects).toEqual([{ type: 'openApp', app: 'projects' }])
  })

  it('blog lists posts with reading time and a hint', () => {
    const out = run('blog')

    expect(out.lines[0].text).toBe('total 1\n2024-01-01   1 min   First Post')
    expect(out.lines[1].text).toBe('Read it: xdg-open blog/first-post.md')
  })

  it('blog with no posts prints total 0 and no hint', () => {
    const out = exec('blog', { vfs, cwd: '/home/rafey', content: { ...fixtureContent, posts: [] } })

    expect(texts(out)).toEqual(['total 0'])
  })

  it('music prints usage and the artist blurb', () => {
    const out = run('music')

    expect(out.lines[0].text).toBe(
      'Usage: music <command>\n\n  story      his journey as a producer\n  play       play Song\n',
    )
    expect(out.lines[1]).toEqual({ type: 'dim', text: 'Blurb.' })
  })

  it('music with an unknown subcommand falls back to usage', () => {
    expect(run('music dance').lines[0].text).toMatch(/^Usage: music/)
  })

  it('music play starts playback', () => {
    const out = run('music play')

    expect(texts(out)).toEqual(['▶ playing   Song · Artist'])
    expect(out.effects).toEqual([{ type: 'play' }])
  })

  it('music story prints the story file', () => {
    expect(texts(run('music story'))).toEqual(['2000  Start\n2030  Album (upcoming)\n'])
  })

  it('contact prints email, linkedin and usage', () => {
    expect(texts(run('contact'))).toEqual(['email: me@example.com\nlinkedin: Me\n\nUsage: open <contact-option> (e.g. open email)'])
  })
})

describe('fs commands', () => {
  it('ls lists the cwd with kinds', () => {
    const out = run('ls', '/home/visitor/Desktop')

    expect(out.lines).toEqual([])
  })

  it('ls marks folders and files', () => {
    const entries = run('ls').lines[0].entries

    expect(entries[0]).toEqual({ name: 'blog', kind: 'dir' })
    expect(entries.at(-1)).toEqual({ name: 'skills.txt', kind: 'file' })
  })

  it('ls on a file prints just that file; on an empty folder prints nothing', () => {
    expect(run('ls bio.txt').lines).toEqual([{ type: 'ls', entries: [{ name: 'bio.txt', kind: 'file' }] }])
    expect(run('ls /home/visitor/../../trash').lines[0].type).toBe('error')
  })

  it('ls follows the music.txt alias', () => {
    expect(run('ls projects').lines[0].entries.map((e) => e.name)).toEqual(['alpha-project.txt', 'beta.txt'])
    expect(run('ls music.txt').lines[0].entries.map((e) => e.name)).toEqual(['song.mp3', 'story.txt'])
  })

  it('ls quotes names with spaces', () => {
    const spaced = buildVfs({ ...fixtureContent, projects: [{ ...fixtureContent.projects[1], slug: 'two words' }] })

    const out = exec('ls projects', { vfs: spaced, cwd: '/home/rafey', content: fixtureContent })

    expect(out.lines[0].entries).toEqual([{ name: "'two words.txt'", kind: 'file' }])
  })

  it('ls of a missing path is an error', () => {
    expect(texts(run('ls nope'))).toEqual(["ls: cannot access 'nope': No such file or directory"])
  })

  it('ls of an empty folder prints nothing', () => {
    const noPosts = buildVfs({ ...fixtureContent, posts: [] })

    expect(exec('ls blog', { vfs: noPosts, cwd: '/home/rafey', content: fixtureContent }).lines).toEqual([])
  })

  it('cd changes cwd; bare cd goes home', () => {
    expect(run('cd Music').cwd).toBe('/home/rafey/Music')
    expect(run('cd projects').cwd).toBe('/home/rafey/projects')
    expect(run('cd', '/home/rafey/Music').cwd).toBe('/home/visitor')
    expect(run('cd ..', '/home/rafey/Music').cwd).toBe('/home/rafey')
  })

  it('cd reports missing paths and files', () => {
    expect(run('cd nope')).toEqual({ lines: [{ type: 'error', text: 'bash: cd: nope: No such file or directory' }], effects: [], cwd: '/home/rafey' })
    expect(texts(run('cd bio.txt'))).toEqual(['bash: cd: bio.txt: Not a directory'])
  })

  it('pwd prints the absolute path', () => {
    expect(texts(run('pwd', '/home/rafey/Music'))).toEqual(['/home/rafey/Music'])
    expect(texts(run('pwd', '/home/visitor'))).toEqual(['/home/visitor'])
  })

  it('cat prints files', () => {
    expect(texts(run('cat bio.txt'))).toEqual(['Bio text\n'])
    expect(texts(run('cat /etc/hostname'))).toEqual(['rafey.ai\n'])
  })

  it('ls / lists the system folders, and .. climbs from Rafey\'s home to the visitor\'s', () => {
    expect(run('ls /').lines[0].entries.map((e) => e.name)).toEqual(['etc', 'home', 'tmp', 'usr'])
    expect(run('cd ../visitor').cwd).toBe('/home/visitor')
  })

  it('cat without a file prints usage', () => {
    expect(texts(run('cat'))).toEqual(['Usage: cat <file-name>'])
  })

  it('cat projects.txt and music.txt give the home terminal messages', () => {
    expect(texts(run('cat projects.txt'))).toEqual(['Use the command "projects" for all project details'])
    expect(texts(run('cat music.txt'))).toEqual(['Use the command "music" to explore Rafey\'s music'])
  })

  it('cat reports folders, missing files and binary audio', () => {
    expect(texts(run('cat Music'))).toEqual(['cat: Music: Is a directory'])
    expect(texts(run('cat nope.txt'))).toEqual(['cat: nope.txt: No such file or directory'])
    expect(run('cat Music/song.mp3').lines).toEqual([{ type: 'error', text: 'cat: Music/song.mp3: binary file (try: music play)' }])
  })
})

describe('launch commands', () => {
  it('open email opens Mail', () => {
    const out = run('open email')

    expect(texts(out)).toEqual(['Opening email application...'])
    expect(out.effects).toEqual([{ type: 'openApp', app: 'mail' }])
  })

  it('xdg-open linkedin opens the profile link', () => {
    const out = run('xdg-open linkedin')

    expect(texts(out)).toEqual(['Opening LinkedIn profile in a new tab...'])
    expect(out.effects).toEqual([{ type: 'openLink', href: 'https://linkedin.example/me' }])
  })

  it('gio open treats its first arg as the subcommand', () => {
    expect(run('gio open email').effects).toEqual([{ type: 'openApp', app: 'mail' }])
    expect(run('gio open Music').effects).toEqual([{ type: 'openPath', path: '/home/rafey/Music' }])
  })

  it('open a path emits openPath with the real path and no output', () => {
    expect(run('open projects')).toEqual({ lines: [], effects: [{ type: 'openPath', path: '/home/rafey/projects' }], cwd: '/home/rafey' })
    expect(run('open music.txt').effects).toEqual([{ type: 'openPath', path: '/home/rafey/Music' }])
  })

  it('open reports missing operands and paths', () => {
    expect(texts(run('open'))).toEqual(['open: missing operand: No such file or directory'])
    expect(texts(run('xdg-open nope'))).toEqual(['xdg-open: nope: No such file or directory'])
  })

  it('nautilus opens Files at a folder, defaulting to cwd', () => {
    expect(run('nautilus', '/home/rafey/Music').effects).toEqual([{ type: 'openApp', app: 'files', path: '/home/rafey/Music' }])
    expect(run('nautilus projects').effects).toEqual([{ type: 'openApp', app: 'files', path: '/home/rafey/projects' }])
  })

  it('nautilus refuses files and missing paths', () => {
    expect(texts(run('nautilus bio.txt'))).toEqual(['nautilus: bio.txt: not a folder'])
    expect(run('nautilus nope').effects).toEqual([])
  })

  it('gedit and gnome-text-editor open the editor silently', () => {
    expect(run('gedit bio.txt')).toEqual({ lines: [], effects: [{ type: 'openApp', app: 'editor', path: '/home/rafey/bio.txt' }], cwd: '/home/rafey' })
    expect(run('gnome-text-editor skills.txt').effects[0].path).toBe('/home/rafey/skills.txt')
  })

  it.each(['nano', 'vim', 'vi'])('%s opens the editor with a note', (editor) => {
    const out = run(`${editor} skills.txt`)

    expect(out.lines).toEqual([{ type: 'dim', text: `${editor} isn't installed here, opened Text Editor instead` }])
    expect(out.effects).toEqual([{ type: 'openApp', app: 'editor', path: '/home/rafey/skills.txt' }])
  })

  it('editors refuse folders and missing files', () => {
    expect(texts(run('vim Music'))).toEqual(['vim: Music: No such file'])
    expect(texts(run('nano'))).toEqual(['nano: missing file: No such file'])
  })
})

describe('system commands', () => {
  it('uname with and without -a', () => {
    expect(texts(run('uname'))).toEqual(['Linux'])
    expect(texts(run('uname -a'))).toEqual(['Linux rafey 6.8.0-rafey x86_64 GNU/Linux'])
  })

  it('echo repeats its words, flags included', () => {
    expect(texts(run('echo  hello   -n world'))).toEqual(['hello -n world'])
  })

  it('sudo is refused', () => {
    expect(run('sudo rm -rf /').lines).toEqual([{ type: 'error', text: 'visitor is not in the sudoers file.  This incident will be reported.' }])
  })

  it.each(['rm', 'mkdir', 'mv', 'touch', 'grep'])('%s is permission denied', (name) => {
    expect(run(`${name} x`).lines).toEqual([{ type: 'error', text: `${name}: Permission denied` }])
  })

  it('clear emits clear', () => {
    expect(run('clear')).toEqual({ lines: [], effects: [{ type: 'clear' }], cwd: '/home/rafey' })
  })

  it('exit prints logout and closes the window', () => {
    expect(run('exit')).toEqual({ lines: [{ type: 'pre', text: 'logout' }], effects: [{ type: 'closeSelf' }], cwd: '/home/rafey' })
  })

  it('logout returns to the home terminal', () => {
    const out = run('logout')

    expect(texts(out)).toEqual(['Returning to the rafey.ai terminal…'])
    expect(out.effects).toEqual([{ type: 'logout' }])
  })

  it.each(['os', 'rafeyos', 'startx'])('%s says it is already running', (name) => {
    expect(texts(run(name))).toEqual(['rOS: already running'])
  })
})
