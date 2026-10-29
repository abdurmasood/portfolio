import { describe, it, expect } from 'vitest'
import { exec, COMMANDS, COMPLETION_COMMANDS } from '@/components/rafeyos/core/commands/exec'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { createShellFs } from '@/components/rafeyos/core/vfs/shellFs'
import { fsStoreOn, memoryStorage } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { fixtureContent, realContent, realVfs } from '@/tests/rafeyos/helpers/testVfs'

const fixtureVfs = buildVfs(fixtureContent)

/** A shell over a fresh visitor store laid on `base` (the fixture tree unless the real content is asked for). */
const shellOn = (base) => createShellFs({ base, store: fsStoreOn(memoryStorage()) })

const run = (raw, cwd = '/home/rafey', { content = fixtureContent, base = content === fixtureContent ? fixtureVfs : realVfs } = {}) =>
  exec(raw, { fs: shellOn(base), cwd, env: { PWD: cwd }, lastCode: 0, content })
const texts = (out) => out.lines.map((line) => line.text)

// Claude's call 13: bash runs these itself, so no bin folder needs to hold them
const BASH_BUILTINS = Object.freeze(['cd', 'pwd', 'echo', 'history', 'exit', 'logout', 'true', 'false'])

describe('exec basics', () => {
  it('does nothing for blank input', () => {
    expect(run('   ', '/home/rafey/Music')).toEqual({ lines: [], effects: [], cwd: '/home/rafey/Music', env: { PWD: '/home/rafey/Music' }, code: 0 })
  })

  it('reports unknown commands the bash way, with the original spelling', () => {
    expect(run('Frobnicate now')).toMatchObject({ lines: [{ type: 'error', text: 'bash: Frobnicate: command not found' }], code: 127 })
  })

  it('does not treat object prototype keys as commands', () => {
    expect(run('constructor').lines[0].type).toBe('error')
  })

  it('matches command names case-sensitively', () => {
    expect(texts(run('whoami'))).toEqual(['visitor'])
    expect(texts(run('WHOAMI'))).toEqual(['bash: WHOAMI: command not found'])
  })

  it('keeps startx runnable but out of completion', () => {
    expect(COMMANDS.startx).toBeDefined()
    expect(COMPLETION_COMMANDS).not.toContain('startx')
    expect(COMPLETION_COMMANDS).toContain('help')
  })

  it('registry commands all live in bin folders', () => {
    const outside = Object.keys(COMMANDS).filter(
      (name) => !BASH_BUILTINS.includes(name) && !realVfs[`/usr/bin/${name}`] && !realVfs[`/usr/local/bin/${name}`],
    )

    expect(outside).toEqual([])
  })

  it('true and false only set the exit code', () => {
    expect(run('true')).toMatchObject({ lines: [], code: 0 })
    expect(run('false')).toMatchObject({ lines: [], code: 1 })
  })
})

describe('content commands', () => {
  it('help prints the help block and a dim hint', () => {
    const out = run('help', '/home/rafey', { content: realContent })

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
    expect(run('projects', '/home/rafey', { content: realContent }).lines[1].text).toBe(
      'Open one with: xdg-open projects/leaf-line.txt   ·   3D view: projects --3d',
    )
  })

  it('projects without any projects only mentions the 3D view', () => {
    const empty = { ...fixtureContent, projects: [] }

    expect(run('projects', '/home/rafey', { content: empty, base: fixtureVfs }).lines[1].text).toBe('3D view: projects --3d')
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
    const out = run('blog', '/home/rafey', { content: { ...fixtureContent, posts: [] }, base: fixtureVfs })

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
  it('ls of an empty cwd prints nothing', () => {
    expect(run('ls', '/home/visitor/Desktop').lines).toEqual([])
  })

  it('ls marks folders and files', () => {
    const entries = run('ls').lines[0].entries

    expect(entries[0]).toEqual({ name: 'blog', kind: 'dir' })
    expect(entries.at(-1)).toEqual({ name: 'skills.txt', kind: 'file' })
  })

  it('ls on a file prints just that file; outside the tree is an error', () => {
    expect(run('ls bio.txt').lines).toEqual([{ type: 'ls', entries: [{ name: 'bio.txt', kind: 'file' }] }])
    expect(run('ls /home/visitor/../../trash').lines[0].type).toBe('error')
  })

  it('ls lists a folder, and music.txt is no longer an alias', () => {
    expect(run('ls projects').lines[0].entries.map((e) => e.name)).toEqual(['alpha-project.txt', 'beta.txt'])
    expect(texts(run('ls music.txt'))).toEqual(["ls: cannot access 'music.txt': No such file or directory"])
  })

  it('ls quotes names with spaces', () => {
    const spaced = buildVfs({ ...fixtureContent, projects: [{ ...fixtureContent.projects[1], slug: 'two words' }] })

    const out = run('ls projects', '/home/rafey', { content: fixtureContent, base: spaced })

    expect(out.lines[0].entries).toEqual([{ name: "'two words.txt'", kind: 'file' }])
  })

  it('ls of a missing path is an error with code 2', () => {
    expect(run('ls nope')).toMatchObject({ lines: [{ type: 'error', text: "ls: cannot access 'nope': No such file or directory" }], code: 2 })
  })

  it('ls of an empty folder prints nothing', () => {
    const noPosts = buildVfs({ ...fixtureContent, posts: [] })

    expect(run('ls blog', '/home/rafey', { content: fixtureContent, base: noPosts }).lines).toEqual([])
  })

  it('cd changes cwd; bare cd goes home', () => {
    expect(run('cd Music').cwd).toBe('/home/rafey/Music')
    expect(run('cd projects').cwd).toBe('/home/rafey/projects')
    expect(run('cd', '/home/rafey/Music').cwd).toBe('/home/visitor')
    expect(run('cd ..', '/home/rafey/Music').cwd).toBe('/home/rafey')
    expect(run('cd ~/Documents').cwd).toBe('/home/visitor/Documents')
  })

  it('cd reports missing paths and files', () => {
    expect(run('cd nope')).toMatchObject({ lines: [{ type: 'error', text: 'bash: cd: nope: No such file or directory' }], cwd: '/home/rafey', code: 1 })
    expect(texts(run('cd bio.txt'))).toEqual(['bash: cd: bio.txt: Not a directory'])
  })

  it('pwd prints the absolute path', () => {
    expect(texts(run('pwd', '/home/rafey/Music'))).toEqual(['/home/rafey/Music'])
    expect(texts(run('pwd', '/home/visitor'))).toEqual(['/home/visitor'])
  })

  it('cat prints files, one after another', () => {
    expect(texts(run('cat bio.txt'))).toEqual(['Bio text'])
    expect(texts(run('cat /etc/hostname'))).toEqual(['rafey.ai'])
    expect(texts(run('cat bio.txt skills.txt'))).toEqual(['Bio text\nSkills text'])
  })

  it("ls / lists the system folders, and .. climbs from Rafey's home to the visitor's", () => {
    expect(run('ls /').lines[0].entries.map((e) => e.name)).toEqual(['bin', 'etc', 'home', 'tmp', 'usr'])
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
    expect(run('cat nope.txt')).toMatchObject({ lines: [{ type: 'error', text: 'cat: nope.txt: No such file or directory' }], code: 1 })
    expect(run('cat Music/song.mp3').lines).toEqual([{ type: 'error', text: 'cat: Music/song.mp3: binary file (try: music play)' }])
  })

  it('cat prints what it is piped when it has no file', () => {
    expect(texts(run('bio | cat'))).toEqual(['Bio text'])
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
    expect(run('open projects')).toMatchObject({ lines: [], effects: [{ type: 'openPath', path: '/home/rafey/projects' }], code: 0 })
    expect(run('open /bin').effects).toEqual([{ type: 'openPath', path: '/usr/bin' }])
  })

  it('open reports missing operands and paths, music.txt included', () => {
    expect(texts(run('open'))).toEqual(['open: missing operand: No such file or directory'])
    expect(texts(run('xdg-open nope'))).toEqual(['xdg-open: nope: No such file or directory'])
    expect(run('open music.txt')).toMatchObject({ lines: [{ type: 'error', text: 'open: music.txt: No such file or directory' }], effects: [], code: 1 })
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
    expect(run('gedit bio.txt')).toMatchObject({ lines: [], effects: [{ type: 'openApp', app: 'editor', path: '/home/rafey/bio.txt' }], code: 0 })
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
    expect(texts(run('uname -a'))).toEqual(['Linux rafey.ai 6.8.0-rafey x86_64 GNU/Linux'])
  })

  it('echo repeats its words, a later -n included', () => {
    expect(texts(run('echo  hello   -n world'))).toEqual(['hello -n world'])
  })

  it('sudo is refused', () => {
    expect(run('sudo rm -rf /')).toMatchObject({
      lines: [{ type: 'error', text: 'visitor is not in the sudoers file.  This incident will be reported.' }],
      code: 1,
    })
  })

  it('clear emits clear', () => {
    expect(run('clear')).toMatchObject({ lines: [], effects: [{ type: 'clear' }], cwd: '/home/rafey' })
  })

  it('exit prints logout and closes the window', () => {
    expect(run('exit')).toMatchObject({ lines: [{ type: 'pre', text: 'logout' }], effects: [{ type: 'closeSelf' }], cwd: '/home/rafey' })
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
