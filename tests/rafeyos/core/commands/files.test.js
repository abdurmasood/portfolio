import { describe, it, expect } from 'vitest'
import { exec } from '@/components/rafeyos/core/commands/exec'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { createShellFs } from '@/components/rafeyos/core/vfs/shellFs'
import { FIXED_NOW, fsDisk, fsStoreOn, memoryStorage, quotaError, refusingWrites } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { fixtureContent } from '@/tests/rafeyos/helpers/testVfs'

const base = buildVfs(fixtureContent)
const HOME = '/home/visitor'
const RAFEY = '/home/rafey'

/** One terminal window over a fresh visitor store: lines run in turn, keeping cwd, env and $?. */
const session = ({ disk = memoryStorage(), cwd = HOME } = {}) => {
  const store = fsStoreOn(disk)
  const fs = createShellFs({ base, store })
  let state = { cwd, env: { PWD: cwd }, lastCode: 0 }
  const run = (raw) => {
    const out = exec(raw, { fs, ...state, content: fixtureContent, now: () => FIXED_NOW })
    state = { cwd: out.cwd, env: out.env, lastCode: out.code }
    return out
  }
  return { fs, store, run }
}

/** What the screen shows, one string per line; an ls row reads as its names two spaces apart. */
const shown = (out) => out.lines.map((line) => (line.type === 'ls' ? line.entries.map((entry) => entry.name).join('  ') : line.text))

/** Runs `lines` in one session and returns what the last one printed. */
const last = (lines, options) => {
  const { run } = session(options)
  return lines.map(run).at(-1)
}

describe('ls', () => {
  it('lists in shell order, folders not first (c-layout)', () => {
    const { run } = session({ cwd: RAFEY })

    expect(shown(run('ls'))).toEqual(['bio.txt  blog  contact  Music  projects  README.txt  skills.txt'])
    expect(shown(run('ls | cat'))).toEqual(['bio.txt\nblog\ncontact\nMusic\nprojects\nREADME.txt\nskills.txt'])
  })

  it('a missing operand exits 2 (c-tier)', () => {
    expect(shown(last(['ls nope; echo $?']))).toEqual(["ls: cannot access 'nope': No such file or directory", '2'])
  })

  it('prints a long listing with total, owners and dates', () => {
    const { run } = session()
    run('echo hi > a.txt')

    expect(shown(run('ls -l'))).toEqual([
      'total 16\n' +
        '-rw-r--r-- 1 visitor visitor    3 Oct 17 21:04 a.txt\n' +
        'drwxr-xr-x 2 visitor visitor 4096 Oct 17 21:04 Desktop\n' +
        'drwxr-xr-x 2 visitor visitor 4096 Oct 17 21:04 Documents\n' +
        'drwxr-xr-x 2 visitor visitor 4096 Oct 17 21:04 Downloads',
    ])
  })

  it('shows an old file with its year, and links with their target', () => {
    const { run } = session()

    expect(shown(run('ls -l /home/rafey/blog'))).toEqual(['total 4\n-rw-r--r-- 1 rafey rafey 40 Jan  1  2024 first-post.md'])
    expect(shown(run('ls -l /'))).toEqual([
      'total 16\n' +
        'lrwxrwxrwx 1 root root    8 Oct  1 00:00 bin -> /usr/bin\n' +
        'drwxr-xr-x 2 root root 4096 Oct  1 00:00 etc\n' +
        'drwxr-xr-x 4 root root 4096 Oct  1 00:00 home\n' +
        'drwxrwxrwt 2 root root 4096 Oct  1 00:00 tmp\n' +
        'drwxr-xr-x 4 root root 4096 Oct  1 00:00 usr',
    ])
  })

  it('-d lists folders themselves, -h shortens sizes', () => {
    const { run } = session({ cwd: RAFEY })

    expect(shown(run('ls -ld /tmp'))).toEqual(['drwxrwxrwt 2 root root 4096 Oct  1 00:00 /tmp'])
    expect(shown(run('ls -d blog Music | cat'))).toEqual(['blog\nMusic'])
    expect(shown(run('ls -lh Music/song.mp3'))).toEqual(['-rw-r--r-- 1 rafey rafey 2.4M Oct  1 00:00 Music/song.mp3'])
  })

  it('-a adds . and .. and dotfiles, -A only dotfiles', () => {
    const { run } = session()
    run('touch .hidden')

    expect(shown(run('ls | cat'))).toEqual(['Desktop\nDocuments\nDownloads'])
    expect(shown(run('ls -a | cat'))).toEqual(['.\n..\n.hidden\nDesktop\nDocuments\nDownloads'])
    expect(shown(run('ls -A | cat'))).toEqual(['.hidden\nDesktop\nDocuments\nDownloads'])
  })

  it('sorts by time with -t, size with -S, and reverses with -r', () => {
    const { run } = session({ cwd: RAFEY })

    expect(shown(run('ls -t blog/first-post.md bio.txt | cat'))).toEqual(['bio.txt\nblog/first-post.md'])
    expect(shown(run('ls -tr blog/first-post.md bio.txt | cat'))).toEqual(['blog/first-post.md\nbio.txt'])
    expect(shown(run('ls -S | cat'))).toEqual(['blog\ncontact\nMusic\nprojects\nskills.txt\nbio.txt\nREADME.txt'])
    expect(shown(run('ls -r | cat'))).toEqual(['skills.txt\nREADME.txt\nprojects\nMusic\ncontact\nblog\nbio.txt'])
  })

  it('-1 prints one name per line on screen', () => {
    expect(shown(last(['ls -1']))).toEqual(['Desktop\nDocuments\nDownloads'])
  })

  it('lists files first, then each folder under its name', () => {
    const { run } = session({ cwd: RAFEY })

    expect(shown(run('ls bio.txt blog projects | cat'))).toEqual(['bio.txt\n\nblog:\nfirst-post.md\n\nprojects:\nalpha-project.txt\nbeta.txt'])
    expect(shown(run('ls bio.txt blog'))).toEqual(['bio.txt', '\nblog:', 'first-post.md'])
    expect(run('ls nope blog')).toMatchObject({ code: 2 })
    expect(shown(run('ls nope blog'))).toEqual(["ls: cannot access 'nope': No such file or directory", 'blog:', 'first-post.md'])
  })

  it('follows a link to a folder, but -l shows the link', () => {
    const { run } = session()

    expect(shown(run('ls /bin | cat'))[0].split('\n')).toContain('mkdir')
    expect(shown(run('ln -s nowhere p; ls -l p'))).toEqual(['lrwxrwxrwx 1 visitor visitor 7 Oct 17 21:04 p -> nowhere'])
    expect(run('ls p').lines[0].entries).toEqual([{ name: 'p', kind: 'link' }])
  })

  it('refuses an unknown flag with code 2', () => {
    expect(last(['ls -z'])).toMatchObject({
      lines: [
        { type: 'error', text: "ls: invalid option -- 'z'" },
        { type: 'error', text: "Try 'ls --help' for more information." },
      ],
      code: 2,
    })
  })
})

describe('a deleted current folder', () => {
  it('ls prints nothing, pwd still prints it, touch cannot create', () => {
    const { run } = session({ cwd: `${HOME}/gone` })

    expect(run('ls')).toMatchObject({ lines: [], code: 0 })
    expect(shown(run('pwd'))).toEqual([`${HOME}/gone`])
    expect(run('touch x')).toMatchObject({ lines: [{ type: 'error', text: "touch: cannot touch 'x': No such file or directory" }], code: 1 })
  })
})

describe('cd and pwd', () => {
  it('cd - goes back and prints where it went', () => {
    const { run } = session()

    expect(shown(run('cd -'))).toEqual(['bash: cd: OLDPWD not set'])
    run('cd /etc')
    expect(run('cd -')).toMatchObject({ lines: [{ type: 'pre', text: HOME }], cwd: HOME })
  })

  it('cd refuses two folders', () => {
    expect(last(['cd /etc /tmp'])).toMatchObject({ lines: [{ type: 'error', text: 'bash: cd: too many arguments' }], code: 1 })
  })
})

describe('mkdir', () => {
  it.each([
    ['mkdir /etc/x', ["mkdir: cannot create directory '/etc/x': Permission denied"]],
    ['mkdir Desktop', ["mkdir: cannot create directory 'Desktop': File exists"]],
    ['mkdir x/y', ["mkdir: cannot create directory 'x/y': No such file or directory"]],
    ['mkdir -p /home/rafey/x/y', ["mkdir: cannot create directory '/home/rafey/x': Permission denied"]],
    ['mkdir', ['mkdir: missing operand', "Try 'mkdir --help' for more information."]],
  ])('%s', (line, errors) => {
    expect(last([line])).toMatchObject({ lines: errors.map((text) => ({ type: 'error', text })), code: 1 })
  })

  it('creates folders, with -p every missing one, with -v each by name', () => {
    const { run } = session()

    expect(shown(run('mkdir notes && ls | cat'))).toEqual(['Desktop\nDocuments\nDownloads\nnotes'])
    expect(shown(run('mkdir -p a/b/c && cd a/b/c && pwd'))).toEqual([`${HOME}/a/b/c`])
    expect(shown(run('cd; mkdir -v v'))).toEqual(["mkdir: created directory 'v'"])
    expect(shown(run('mkdir -pv v/p/q'))).toEqual(["mkdir: created directory 'v/p'\nmkdir: created directory 'v/p/q'"])
  })

  it('keeps going after a failed operand', () => {
    const { run, fs } = session()

    expect(run('mkdir ok /etc/no ok2')).toMatchObject({ code: 1 })
    expect(fs.vfs()[`${HOME}/ok`].type).toBe('dir')
    expect(fs.vfs()[`${HOME}/ok2`].type).toBe('dir')
  })

  it('says when storage is full', () => {
    expect(shown(last(['mkdir d'], { disk: refusingWrites(fsDisk(), quotaError()) }))).toEqual([
      "mkdir: cannot create directory 'd': No space left on device",
    ])
  })
})

describe('rmdir', () => {
  it.each([
    ['mkdir -p a/b; rmdir a', "rmdir: failed to remove 'a': Directory not empty"],
    ['rmdir nope', "rmdir: failed to remove 'nope': No such file or directory"],
    ['touch f; rmdir f', "rmdir: failed to remove 'f': Not a directory"],
    ['rmdir /home/rafey/blog', "rmdir: failed to remove '/home/rafey/blog': Permission denied"],
  ])('%s', (line, error) => {
    expect(last([line])).toMatchObject({ lines: [{ type: 'error', text: error }], code: 1 })
  })

  it('removes an empty folder, naming it with -v', () => {
    const { run, fs } = session()

    expect(shown(run('mkdir -p a/b && rmdir -v a/b'))).toEqual(["rmdir: removing directory, 'a/b'"])
    expect(fs.vfs()[`${HOME}/a/b`]).toBeUndefined()
    expect(shown(run('rmdir'))).toEqual(['rmdir: missing operand', "Try 'rmdir --help' for more information."])
  })
})

describe('touch', () => {
  it.each([
    ['touch /etc/x', "touch: cannot touch '/etc/x': Permission denied"],
    ['touch /usr/local/bin/x', "touch: cannot touch '/usr/local/bin/x': Permission denied"],
    ['touch nope/x', "touch: cannot touch 'nope/x': No such file or directory"],
  ])('%s', (line, error) => {
    expect(last([line])).toMatchObject({ lines: [{ type: 'error', text: error }], code: 1 })
  })

  it('creates an empty file', () => {
    const { run, fs } = session()

    expect(run('touch a.txt')).toMatchObject({ lines: [], code: 0 })
    expect(fs.vfs()[`${HOME}/a.txt`].text).toBe('')
    expect(shown(run('touch'))).toEqual(['touch: missing file operand', "Try 'touch --help' for more information."])
  })

  it('works in /tmp when storage is blocked', () => {
    expect(shown(last(['touch /tmp/x && ls /tmp | cat'], { disk: null }))).toEqual(['x'])
  })
})

describe('rm', () => {
  it.each([
    ['rm bio.txt', ["rm: cannot remove 'bio.txt': Permission denied"]],
    ['rm nope', ["rm: cannot remove 'nope': No such file or directory"]],
    ['rm Music', ["rm: cannot remove 'Music': Is a directory"]],
    ['rm', ['rm: missing operand', "Try 'rm --help' for more information."]],
    ['rm -r .', ["rm: refusing to remove '.' or '..' directory: skipping '.'"]],
    ['rm -rf /', ["rm: it is dangerous to operate recursively on '/'", 'rm: use --no-preserve-root to override this failsafe']],
    [
      'rm -r projects',
      ["rm: cannot remove 'projects/alpha-project.txt': Permission denied", "rm: cannot remove 'projects/beta.txt': Permission denied"],
    ],
  ])('%s', (line, errors) => {
    expect(last([line], { cwd: RAFEY })).toMatchObject({ lines: errors.map((text) => ({ type: 'error', text })), code: 1 })
  })

  it('-f says nothing about a missing file', () => {
    expect(last(['rm -f nope'])).toMatchObject({ lines: [], code: 0 })
  })

  it('deletes files for good, folders with -r, empty folders with -d', () => {
    const { run, fs } = session()
    run('mkdir -p a/b; touch f')

    expect(shown(run('rm -d a'))).toEqual(["rm: cannot remove 'a': Directory not empty"])
    expect(run('rm f && rm -d Downloads && rm -r a Documents')).toMatchObject({ lines: [], code: 0 })
    expect(shown(run('ls | cat'))).toEqual(['Desktop'])
    expect(fs.vfs()[`${HOME}/a/b`]).toBeUndefined()
  })

  it('rm -rf ~ empties the home and reports the home itself', () => {
    const { run } = session()
    run('mkdir -p a/b; touch a/b/c')

    expect(shown(run('rm -rf ~; echo $?'))).toEqual(["rm: cannot remove '/home/visitor': Permission denied", '1'])
    expect(run('ls ~').lines).toEqual([])
  })

  it('-v names everything it removed, a folder after what was in it', () => {
    const { run } = session()
    run('touch a.txt; mkdir d; touch d/x')

    expect(shown(run('rm -v a.txt'))).toEqual(["removed 'a.txt'"])
    expect(shown(run('rm -rv d'))).toEqual(["removed 'd/x'\nremoved directory 'd'"])
  })

  it('removes a link, not what it points at', () => {
    expect(shown(last(['ln -s /etc/hostname p && rm p && cat /etc/hostname']))).toEqual(['rafey.ai'])
  })
})

describe('cp', () => {
  it.each([
    ['cp a.txt /home/rafey/', ["cp: cannot create regular file '/home/rafey/a.txt': Permission denied"]],
    ['cp d e', ["cp: -r not specified; omitting directory 'd'"]],
    ['cp nope x', ["cp: cannot stat 'nope': No such file or directory"]],
    ['cp', ['cp: missing file operand', "Try 'cp --help' for more information."]],
    ['cp a.txt', ["cp: missing destination file operand after 'a.txt'", "Try 'cp --help' for more information."]],
    ['cp a.txt d a.txt', ["cp: target 'a.txt' is not a directory"]],
    ['cp a.txt a.txt', ["cp: 'a.txt' and 'a.txt' are the same file"]],
    ['cp -r d d/sub', ["cp: cannot copy a directory, 'd', into itself, 'd/sub'"]],
  ])('%s', (line, errors) => {
    expect(last(['echo a > a.txt; mkdir d', line])).toMatchObject({ lines: errors.map((text) => ({ type: 'error', text })), code: 1 })
  })

  it("copies Rafey's file into the visitor's home (c-lock)", () => {
    expect(shown(last(['cp bio.txt ~ && cat ~/bio.txt'], { cwd: RAFEY }))).toEqual(['Bio text'])
  })

  it('copies to a name or into a folder, and folders with -r', () => {
    const { run } = session()
    run('echo a > a.txt; mkdir d; touch d/x')

    expect(shown(run('cp a.txt b.txt && cat b.txt'))).toEqual(['a'])
    expect(shown(run('cp a.txt Documents && ls Documents | cat'))).toEqual(['a.txt'])
    expect(shown(run('cp -r d e && ls e | cat'))).toEqual(['x'])
    expect(shown(run('cp -r d e && ls e | cat'))).toEqual(['d\nx'])
  })

  it('-n keeps what is there, -v names each copy', () => {
    const { run } = session()
    run('echo a > a.txt; echo b > b.txt; mkdir d; touch d/x')

    expect(shown(run('cp -n a.txt b.txt; cat b.txt'))).toEqual(['b'])
    expect(shown(run('cp -v a.txt c.txt'))).toEqual(["'a.txt' -> 'c.txt'"])
    expect(shown(run('cp -rv d e'))).toEqual(["'d' -> 'e'\n'd/x' -> 'e/x'"])
  })

  it('-r merges into a folder that exists and reports what clashes', () => {
    const { run } = session()
    run('mkdir -p d/x e/d/y; touch d/y e/d/x')

    expect(run('cp -r d e')).toMatchObject({
      lines: [
        { type: 'error', text: "cp: cannot overwrite non-directory 'e/d/x' with directory 'd/x'" },
        { type: 'error', text: "cp: cannot overwrite directory 'e/d/y' with non-directory" },
      ],
      code: 1,
    })
  })

  it("copies the song as a pointer to Rafey's file", () => {
    const { run, store, fs } = session()

    run('cp /home/rafey/Music/song.mp3 ~')

    expect(store.getState().nodes[`${HOME}/song.mp3`].type).toBe('copy')
    expect(fs.vfs()[`${HOME}/song.mp3`].type).toBe('audio')
  })

  it('full storage gives the write error and $? 1 (c-full)', () => {
    const disk = refusingWrites(fsDisk({ [`${HOME}/a.txt`]: 'a\n' }), quotaError())

    expect(shown(last(['cp a.txt b.txt; echo $?'], { disk }))).toEqual(["cp: error writing 'b.txt': No space left on device", '1'])
  })
})

describe('mv', () => {
  it.each([
    ['mv nope x', ["mv: cannot stat 'nope': No such file or directory"]],
    ['mv a.txt', ["mv: missing destination file operand after 'a.txt'", "Try 'mv --help' for more information."]],
    ['mv a.txt /etc/', ["mv: cannot move 'a.txt' to '/etc/a.txt': Permission denied"]],
    ['mv a.txt a.txt', ["mv: 'a.txt' and 'a.txt' are the same file"]],
    ['mkdir -p d/sub; mv d d/sub', ["mv: cannot move 'd' to a subdirectory of itself, 'd/sub/d'"]],
  ])('%s', (line, errors) => {
    expect(last(['echo a > a.txt', line])).toMatchObject({ lines: errors.map((text) => ({ type: 'error', text })), code: 1 })
  })

  it('moves into an existing folder (c-tier)', () => {
    expect(shown(last(['echo hi > notes.txt', 'mkdir drafts && mv notes.txt drafts/ && ls drafts']))).toEqual(['notes.txt'])
  })

  it("leaves Rafey's file and the visitor's home untouched when refused", () => {
    const { run, fs } = session({ cwd: RAFEY })

    expect(shown(run('mv bio.txt ~'))).toEqual(["mv: cannot move 'bio.txt' to '/home/visitor/bio.txt': Permission denied"])
    expect(fs.vfs()[`${RAFEY}/bio.txt`]).toBeDefined()
    expect(fs.vfs()[`${HOME}/bio.txt`]).toBeUndefined()
  })

  it('renames, -n keeps what is there, -v names each move', () => {
    const { run, fs } = session()
    run('echo a > a; echo b > b')

    expect(shown(run('mv -n a b; cat a b'))).toEqual(['a\nb'])
    expect(shown(run('mv -v a c'))).toEqual(["renamed 'a' -> 'c'"])
    expect(fs.vfs()[`${HOME}/a`]).toBeUndefined()
    expect(shown(run('mv -f c b && cat b'))).toEqual(['a'])
  })
})

describe('cat', () => {
  it('-n numbers lines across files', () => {
    expect(shown(last(['echo a > a; echo b > b', 'cat -n a b']))).toEqual(['     1\ta\n     2\tb'])
  })

  it('reads through links and reports loops', () => {
    const { run } = session()

    expect(shown(run('ln -s /etc/hostname ~/p && cat ~/p'))).toEqual(['rafey.ai'])
    expect(shown(run('ln -s a b; ln -s b a; cat a'))).toEqual(['cat: a: Too many levels of symbolic links'])
  })
})

describe('tree', () => {
  it('draws a folder with a count footer (c-cmds)', () => {
    expect(shown(last(['mkdir notes && touch notes/a.txt; tree notes']))).toEqual(['notes\n└── a.txt\n\n0 directories, 1 file'])
  })

  it('nests, shows links, and hides dotfiles unless -a', () => {
    const { run } = session()
    run('mkdir -p a/b && touch a/b/c a/d a/.h && ln -s /usr/bin a/bin')

    expect(shown(run('tree a'))).toEqual(['a\n├── b\n│   └── c\n├── bin -> /usr/bin\n└── d\n\n2 directories, 2 files'])
    expect(shown(run('tree -a a'))[0].split('\n')[1]).toBe('├── .h')
  })

  it('-L limits the depth and -d lists only folders', () => {
    const { run } = session({ cwd: RAFEY })

    expect(shown(run('tree -L 1'))).toEqual([
      '.\n├── bio.txt\n├── blog\n├── contact\n├── Music\n├── projects\n├── README.txt\n└── skills.txt\n\n4 directories, 3 files',
    ])
    expect(shown(run('tree -d /home/rafey'))).toEqual(['/home/rafey\n├── blog\n├── contact\n├── Music\n└── projects\n\n4 directories'])
    expect(shown(run('tree -L 0'))).toEqual(['tree: Invalid level, must be greater than 0.'])
  })

  it('reports what it cannot open', () => {
    expect(last(['tree nope'])).toMatchObject({ lines: [{ type: 'pre', text: 'nope [error opening dir]\n\n0 directories, 0 files' }], code: 2 })
  })
})

describe('find', () => {
  it('walks in shell order and filters by name and type', () => {
    const { run } = session({ cwd: RAFEY })

    expect(shown(run("find . -name '*.txt'"))).toEqual([
      './bio.txt\n./Music/story.txt\n./projects/alpha-project.txt\n./projects/beta.txt\n./README.txt\n./skills.txt',
    ])
    expect(shown(run('find -maxdepth 1 -type d'))).toEqual(['.\n./blog\n./contact\n./Music\n./projects'])
    expect(shown(run('find / -maxdepth 1 -type l'))).toEqual(['/bin'])
    expect(shown(run("find /home/rafey -iname 'BIO*'"))).toEqual(['/home/rafey/bio.txt'])
  })

  it('lists a new folder and what is in it', () => {
    expect(shown(last(['mkdir notes && touch notes/a.txt; find notes']))).toEqual(['notes\nnotes/a.txt'])
  })

  it.each([
    ['find nope', "find: 'nope': No such file or directory"],
    ['find -foo', "find: unknown predicate '-foo'"],
    ['find . -name', "find: missing argument to '-name'"],
    ['find -type x', 'find: Unknown argument to -type: x'],
    ['find . -maxdepth x', "find: Expected a positive decimal integer argument to -maxdepth, but got 'x'"],
    ['find . -type f x', "find: paths must precede expression: 'x'"],
  ])('%s', (line, error) => {
    expect(last([line])).toMatchObject({ lines: [{ type: 'error', text: error }], code: 1 })
  })
})

describe('ln', () => {
  it.each([
    ['ln -s x p; ln -s y p', "ln: failed to create symbolic link 'p': File exists"],
    ['touch a; ln a b', "ln: failed to create hard link 'b' => 'a': Operation not permitted"],
    ['ln nope b', "ln: failed to access 'nope': No such file or directory"],
    ['ln -s /etc/passwd /etc/x', "ln: failed to create symbolic link '/etc/x': Permission denied"],
    ['ln -s a b c', "ln: target 'c' is not a directory"],
  ])('%s', (line, error) => {
    expect(last([line])).toMatchObject({ lines: [{ type: 'error', text: error }], code: 1 })
  })

  it('reads /etc/passwd through a link (Review Focus 2)', () => {
    expect(shown(last(['ln -s /etc/passwd ~/p && cat ~/p']))[0]).toContain('visitor:x:1001:1001')
  })

  it('names the link after its target, inside a folder too', () => {
    const { run } = session()

    expect(shown(run('ln -s /etc/hostname && cat hostname'))).toEqual(['rafey.ai'])
    expect(shown(run('ln -s /etc/hostname Documents && cat Documents/hostname'))).toEqual(['rafey.ai'])
    expect(shown(run('ln'))).toEqual(['ln: missing file operand', "Try 'ln --help' for more information."])
  })

  it('-f replaces a link that is there', () => {
    const { run, fs } = session()
    run('ln -s x p')

    expect(run('ln -sf y p')).toMatchObject({ lines: [], code: 0 })
    expect(fs.vfs()[`${HOME}/p`].target).toBe('y')
  })

  it('works with relative targets and links in the middle of a path', () => {
    const { run } = session()

    expect(shown(run('ln -s ../rafey/bio.txt b && cat b'))).toEqual(['Bio text'])
    expect(shown(run('mkdir real && ln -s real d && echo hi > d/a.txt && cat real/a.txt'))).toEqual(['hi'])
  })
})

describe('stat', () => {
  const block = (out) => shown(out)[0].split('\n')

  it('prints the GNU block for a file', () => {
    const lines = block(last(['stat /etc/hostname']))

    expect(lines[0]).toBe('  File: /etc/hostname')
    expect(lines[1]).toBe('  Size: 9         \tBlocks: 8          IO Block: 4096   regular file')
    expect(lines[2]).toMatch(/^Device: 8,1\tInode: \d+ +Links: 1$/)
    expect(lines.slice(3)).toEqual([
      'Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)',
      'Access: 2026-10-01 00:00:00.000000000 +0000',
      'Modify: 2026-10-01 00:00:00.000000000 +0000',
      'Change: 2026-10-01 00:00:00.000000000 +0000',
      ' Birth: -',
    ])
  })

  it('names owners, links, the sticky /tmp and empty files', () => {
    const { run } = session()

    expect(block(run('stat ~'))[3]).toBe('Access: (0755/drwxr-xr-x)  Uid: ( 1001/ visitor)   Gid: ( 1001/ visitor)')
    expect(block(run('stat /home/rafey/bio.txt'))[3]).toBe('Access: (0644/-rw-r--r--)  Uid: ( 1000/   rafey)   Gid: ( 1000/   rafey)')
    expect(block(run('stat /bin'))[0]).toBe('  File: /bin -> /usr/bin')
    expect(block(run('stat /bin'))[1]).toBe('  Size: 8         \tBlocks: 0          IO Block: 4096   symbolic link')
    expect(block(run('stat /tmp'))[3]).toContain('(1777/drwxrwxrwt)')
    expect(block(run('touch e; stat e'))[1]).toBe('  Size: 0         \tBlocks: 0          IO Block: 4096   regular empty file')
  })

  it('reports a missing path', () => {
    const { run } = session()

    expect(run('stat nope')).toMatchObject({ lines: [{ type: 'error', text: "stat: cannot statx 'nope': No such file or directory" }], code: 1 })
    expect(shown(run('stat'))).toEqual(['stat: missing operand', "Try 'stat --help' for more information."])
  })
})
