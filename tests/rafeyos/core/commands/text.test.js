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

/** What the screen shows, one string per line. */
const shown = (out) => out.lines.map((line) => line.text)

/** Runs `lines` in one session and returns what the last one printed. */
const last = (lines, options) => {
  const { run } = session(options)
  return lines.map(run).at(-1)
}

const inRafey = (line) => last([line], { cwd: RAFEY })

const TWELVE = 'echo -e "1\\n2\\n3\\n4\\n5\\n6\\n7\\n8\\n9\\n10\\n11\\n12" > n.txt'

describe('echo', () => {
  it('echo_e_interprets_escapes', () => {
    expect(shown(last(['echo -e "a\\tb\\nc"']))).toEqual(['a\tb\nc'])
    expect(shown(last(["echo -e 'a\\\\b'"]))).toEqual(['a\\b'])
    expect(shown(last(['echo -e "\\x41\\0102\\e"']))).toEqual(['AB\x1b'])
    expect(shown(last(['echo -e "a\\cb" c; echo after']))).toEqual(['a', 'after'])
  })

  it('leaves escapes alone without -e, or with -E after it', () => {
    expect(shown(last(['echo "a\\nb"']))).toEqual(['a\\nb'])
    expect(shown(last(['echo -eE "a\\nb"']))).toEqual(['a\\nb'])
  })

  it('-n drops the newline, and only leading n e E words are options', () => {
    expect(shown(last(['echo -n hi | wc -c']))).toEqual(['2'])
    expect(shown(last(['echo -ne "a\\n" | wc -c']))).toEqual(['2'])
    expect(shown(last(['echo -x -- a -n']))).toEqual(['-x -- a -n'])
    expect(shown(last(['echo -nx']))).toEqual(['-nx'])
    expect(shown(last(['echo']))).toEqual([''])
  })
})

describe('head and tail', () => {
  it('head_and_tail_on_stdin_and_files', () => {
    const { run } = session()
    run(TWELVE)

    expect(shown(run('head n.txt'))).toEqual(['1\n2\n3\n4\n5\n6\n7\n8\n9\n10'])
    expect(shown(run('head -n 3 n.txt'))).toEqual(['1\n2\n3'])
    expect(shown(run('head -2 n.txt'))).toEqual(['1\n2'])
    expect(shown(run('head -n -10 n.txt'))).toEqual(['1\n2'])
    expect(shown(run('head -c 4 n.txt'))).toEqual(['1\n2'])
    expect(shown(run('tail n.txt'))).toEqual(['3\n4\n5\n6\n7\n8\n9\n10\n11\n12'])
    expect(shown(run('tail -n 2 n.txt'))).toEqual(['11\n12'])
    expect(shown(run('tail -1 n.txt'))).toEqual(['12'])
    expect(shown(run('tail -n +11 n.txt'))).toEqual(['11\n12'])
    expect(shown(run('tail -c 3 n.txt'))).toEqual(['12'])
    expect(shown(run('tail -n 0 n.txt'))).toEqual([])
    expect(shown(run('cat n.txt | head -2'))).toEqual(['1\n2'])
    expect(shown(run('cat n.txt | tail -1'))).toEqual(['12'])
    expect(shown(run('echo -ne "a\\nb" | tail -1'))).toEqual(['b'])
  })

  it('heads several files, stdin among them, under ==> name <==', () => {
    const { run } = session()
    run(TWELVE)
    run('echo b > b.txt')

    expect(shown(run('head -n 1 n.txt b.txt'))).toEqual(['==> n.txt <==\n1\n\n==> b.txt <==\nb'])
    expect(shown(run('echo s | tail -n 1 b.txt -'))).toEqual(['==> b.txt <==\nb\n\n==> standard input <==\ns'])
  })

  it.each([
    ['head nope', ["head: cannot open 'nope' for reading: No such file or directory"]],
    ['tail nope', ["tail: cannot open 'nope' for reading: No such file or directory"]],
    ['head Desktop', ["head: error reading 'Desktop': Is a directory"]],
    ['head -n x n.txt', ["head: invalid number of lines: 'x'"]],
    ['tail -c x n.txt', ["tail: invalid number of bytes: 'x'"]],
    ['head -z n.txt', ["head: invalid option -- 'z'", "Try 'head --help' for more information."]],
  ])('%s', (line, errors) => {
    expect(last([TWELVE, line])).toMatchObject({ lines: errors.map((text) => ({ type: 'error', text })), code: 1 })
  })

  it('reads the files that exist after one that does not', () => {
    const out = last([TWELVE, 'tail -n 1 nope n.txt'])

    expect(shown(out)).toEqual(["tail: cannot open 'nope' for reading: No such file or directory", '==> n.txt <==\n12'])
    expect(out.code).toBe(1)
  })

  it('-c counts UTF-8 bytes, keeping a cut character as the bytes it was cut to', () => {
    expect(shown(last(['echo é | head -c 1 | wc -c']))).toEqual(['1'])
    expect(shown(last(['echo é | tail -c 2 | wc -c']))).toEqual(['2'])
    expect(shown(last(['echo é | head -c 1 | wc -m']))).toEqual(['0'])
    expect(shown(last(['echo é | head -c 1 | cat - | head -c 1 | wc -c']))).toEqual(['1'])
    expect(shown(last(['echo é | head -c 2 | wc -m']))).toEqual(['1'])
    expect(shown(last(['echo é | head -c 1 > f && ls -l f']))[0]).toMatch(/ visitor 1 /)
  })

  it('-c and -n: the one given last wins', () => {
    const { run } = session()
    run(TWELVE)

    expect(shown(run('head -c 3 -n 1 n.txt'))).toEqual(['1'])
    expect(shown(run('head -n 1 -c 3 n.txt'))).toEqual(['1\n2'])
    expect(shown(run('head --bytes=3 -1 n.txt'))).toEqual(['1'])
    expect(shown(run('tail -c 2 -n 1 n.txt'))).toEqual(['12'])
    expect(shown(run('tail -n 1 -c 2 n.txt'))).toEqual(['2'])
    expect(shown(run('head -c 5 -n 1 -c 3 n.txt'))).toEqual(['1\n2'])
    expect(shown(run('tail -n 5 -c 9 -n 1 n.txt'))).toEqual(['12'])
  })

  it('rejects a bad -c even when -n comes after it, and the other way round', () => {
    expect(last([TWELVE, 'head -c x -n 1 n.txt'])).toMatchObject({ lines: [{ text: "head: invalid number of bytes: 'x'" }], code: 1 })
    expect(last([TWELVE, 'tail -n x -c 1 n.txt'])).toMatchObject({ lines: [{ text: "tail: invalid number of lines: 'x'" }], code: 1 })
  })
})

describe('wc', () => {
  it('cat_bio_pipe_wc_l_matches_line_count', () => {
    expect(shown(inRafey('cat bio.txt | wc -l'))).toEqual(['1'])
    expect(shown(inRafey('cat projects/alpha-project.txt | wc -l'))).toEqual(['6'])
  })

  it('pads its columns as GNU does', () => {
    expect(shown(inRafey('wc bio.txt'))).toEqual(['1 2 9 bio.txt'])
    expect(shown(inRafey('wc -l bio.txt skills.txt'))).toEqual([' 1 bio.txt\n 1 skills.txt\n 2 total'])
    expect(shown(inRafey('echo hi | wc'))).toEqual(['      1       1       3'])
    expect(shown(inRafey('echo hi | wc -w -'))).toEqual(['1 -'])
  })

  it('-c counts bytes, -m characters', () => {
    expect(shown(last(['echo é | wc -c']))).toEqual(['3'])
    expect(shown(last(['echo é | wc -m']))).toEqual(['2'])
    expect(shown(last(['echo "a b  c" | wc -wm']))).toEqual(['      3       7'])
  })

  it('reports a missing file and a folder, counting the folder as empty', () => {
    const missing = inRafey('wc nope bio.txt')

    expect(shown(missing)).toEqual(['wc: nope: No such file or directory', '1 2 9 bio.txt\n1 2 9 total'])
    expect(missing.code).toBe(1)
    expect(shown(inRafey('wc blog'))).toEqual(['wc: blog: Is a directory', '      0       0       0 blog'])
  })

  it('refuses the song the way cat does', () => {
    expect(inRafey('wc Music/song.mp3')).toMatchObject({ lines: [{ text: 'wc: Music/song.mp3: binary file (try: music play)' }], code: 1 })
  })
})

describe('grep', () => {
  it('grep_rn_lists_path_line_and_text', () => {
    expect(shown(inRafey('grep -rn Hello /home/rafey'))).toEqual(['/home/rafey/blog/first-post.md:5:Hello world'])
    expect(shown(inRafey('grep -rn e projects'))).toEqual([
      'projects/alpha-project.txt:1:Alpha Project\n' +
        'projects/alpha-project.txt:4:one two three four five six seven eight\n' +
        'projects/alpha-project.txt:6:Case study: https://a.example/\n' +
        'projects/beta.txt:1:Beta',
    ])
    expect(shown(inRafey('grep -r Bio'))).toEqual(['bio.txt:Bio text'])
    expect(shown(inRafey('grep -r Bio .'))).toEqual(['./bio.txt:Bio text'])
    expect(shown(inRafey('grep -r Bio bio.txt'))).toEqual(['Bio text'])
  })

  it('names files only when there are several', () => {
    expect(shown(inRafey('cat bio.txt | grep -n text'))).toEqual(['1:Bio text'])
    expect(shown(inRafey('grep text bio.txt skills.txt'))).toEqual(['bio.txt:Bio text\nskills.txt:Skills text'])
    expect(shown(inRafey('echo x | grep -H x'))).toEqual(["grep: invalid option -- 'H'", "Try 'grep --help' for more information."])
  })

  it('-c counts, -l names, -v inverts, -i ignores case', () => {
    expect(shown(inRafey('grep -c e projects/alpha-project.txt projects/beta.txt'))).toEqual(['projects/alpha-project.txt:3\nprojects/beta.txt:1'])
    expect(shown(inRafey('grep -l e projects/*'))).toEqual(['projects/alpha-project.txt\nprojects/beta.txt'])
    expect(shown(inRafey('echo e | grep -l e'))).toEqual(['(standard input)'])
    expect(shown(inRafey('grep -v e projects/beta.txt'))).toEqual(['====\n\nshort'])
    expect(shown(inRafey('grep -i BIO bio.txt'))).toEqual(['Bio text'])
  })

  it('-w matches whole words, -F fixed strings, -E is the default', () => {
    expect(shown(last(['echo -e "cat\\nconcat" | grep -w cat']))).toEqual(['cat'])
    expect(shown(last(['echo -e "a.c\\nabc" | grep -F a.c']))).toEqual(['a.c'])
    expect(shown(last(['echo -e "a.c\\nabc" | grep a.c']))).toEqual(['a.c\nabc'])
    expect(shown(last(['echo -e "ab\\naab" | grep -E "^a+b$"']))).toEqual(['ab\naab'])
  })

  it('-r skips links it meets, -R follows them', () => {
    const { run } = session()
    run('mkdir d && ln -s /home/rafey/blog d/blog && ln -s d/blog link')

    expect(run('grep -r Hello d')).toMatchObject({ lines: [], code: 1 })
    expect(shown(run('grep -R Hello d'))).toEqual(['d/blog/first-post.md:Hello world'])
    expect(shown(run('grep -r Hello link'))).toEqual(['link/first-post.md:Hello world'])
  })

  it('-R survives a link loop', () => {
    expect(last(['mkdir d && ln -s .. d/up && echo hi > d/f', 'grep -R hi d'])).toMatchObject({ code: 0 })
  })

  it('-r with no file finds nothing in a deleted current folder', () => {
    expect(last(['grep -r x'], { cwd: `${HOME}/gone` })).toMatchObject({ lines: [], code: 1 })
  })

  it('-w counts letters past ASCII as part of a word', () => {
    expect(last(['echo aé | grep -w a'])).toMatchObject({ lines: [], code: 1 })
    expect(last(['echo a٣ | grep -w a'])).toMatchObject({ lines: [], code: 1 })
    expect(shown(last(['echo "é a" | grep -w a']))).toEqual(['é a'])
    expect(shown(last(['echo aé | grep -w aé']))).toEqual(['aé'])
  })

  it('-w still matches a pattern only a non-Unicode regex accepts', () => {
    expect(shown(last(["echo 'x ] y' | grep -w ']'"]))).toEqual(['x ] y'])
    expect(shown(last(["echo a-b | grep -w 'a\\-b'"]))).toEqual(['a-b'])
    expect(shown(last(["echo 'a{ b' | grep -wE 'a{'"]))).toEqual(['a{ b'])
  })

  it('grep_exit_codes', () => {
    expect(inRafey('grep Bio bio.txt').code).toBe(0)
    expect(inRafey('grep nothing bio.txt')).toMatchObject({ lines: [], code: 1 })
    expect(inRafey('grep x nope')).toMatchObject({ lines: [{ type: 'error', text: 'grep: nope: No such file or directory' }], code: 2 })
    expect(inRafey('grep Bio bio.txt nope').code).toBe(2)
    expect(inRafey('grep x blog')).toMatchObject({ lines: [{ text: 'grep: blog: Is a directory' }], code: 2 })
    expect(inRafey('grep "(" bio.txt')).toMatchObject({ lines: [{ text: 'grep: Invalid regular expression' }], code: 2 })
    expect(inRafey('grep')).toMatchObject({
      lines: [{ text: 'Usage: grep [OPTION]... PATTERNS [FILE]...' }, { text: "Try 'grep --help' for more information." }],
      code: 2,
    })
    expect(inRafey('grep -z x').code).toBe(2)
  })

  it('never matches inside the song', () => {
    expect(inRafey('grep -r . Music')).toMatchObject({ lines: [{ text: 'Music/story.txt:2000  Start\nMusic/story.txt:2030  Album (upcoming)' }], code: 0 })
  })
})

describe('sort and uniq', () => {
  it('sort_uniq_c_counts_like_coreutils', () => {
    expect(shown(last(['echo -e "b\\na\\nb\\nc\\na\\nb" | sort | uniq -c']))).toEqual(['      2 a\n      3 b\n      1 c'])
  })

  it('sort orders by text, -n by number, -r backwards, -u once each', () => {
    expect(shown(last(['echo -e "10\\n9\\n100" | sort']))).toEqual(['10\n100\n9'])
    expect(shown(last(['echo -e "10\\n9\\n100" | sort -n']))).toEqual(['9\n10\n100'])
    expect(shown(last(['echo -e "10\\n9\\n100" | sort -rn']))).toEqual(['100\n10\n9'])
    expect(shown(last(['echo -e "x\\n-1\\n2.5\\n2" | sort -n']))).toEqual(['-1\nx\n2\n2.5'])
    expect(shown(last(['echo -e "b\\na\\nb" | sort -u']))).toEqual(['a\nb'])
    expect(shown(last(['echo -e "b\\nB\\na" | sort -fu']))).toEqual(['a\nb'])
  })

  it('sort reads files and gives up on one it cannot read', () => {
    const { run } = session()
    run('echo b > b.txt; echo a > a.txt')

    expect(shown(run('sort b.txt a.txt'))).toEqual(['a\nb'])
    expect(run('sort b.txt nope')).toMatchObject({ lines: [{ text: 'sort: cannot read: nope: No such file or directory' }], code: 2 })
    expect(run('sort Desktop')).toMatchObject({ lines: [{ text: 'sort: read failed: Desktop: Is a directory' }], code: 2 })
  })

  it('uniq -d keeps repeated lines, -u single ones, -i ignores case', () => {
    const input = 'echo -e "a\\na\\nb\\nC\\nc"'

    expect(shown(last([`${input} | uniq`]))).toEqual(['a\nb\nC\nc'])
    expect(shown(last([`${input} | uniq -d`]))).toEqual(['a'])
    expect(shown(last([`${input} | uniq -u`]))).toEqual(['b\nC\nc'])
    expect(shown(last([`${input} | uniq -ic`]))).toEqual(['      2 a\n      1 b\n      2 C'])
  })

  it('uniq reads one file and writes a second', () => {
    const { run } = session()
    run('echo -e "a\\na" > in')

    expect(shown(run('uniq in'))).toEqual(['a'])
    expect(shown(run('uniq in out && cat out'))).toEqual(['a'])
    expect(run('uniq nope')).toMatchObject({ lines: [{ text: 'uniq: nope: No such file or directory' }], code: 1 })
    expect(shown(run('uniq in /etc/out'))).toEqual(['uniq: /etc/out: Permission denied'])
    expect(shown(run('uniq a b c'))).toEqual(["uniq: extra operand 'c'", "Try 'uniq --help' for more information."])
  })

  it('uniq writes to stdout when its output is -', () => {
    const { run, fs } = session()
    run('echo -e "a\\na" > in')

    expect(shown(run('uniq in -'))).toEqual(['a'])
    expect(shown(run('echo -e "b\\nb" | uniq - -'))).toEqual(['b'])
    expect(fs.vfs()[`${HOME}/-`]).toBeUndefined()
  })

  it('uniq says when storage is full', () => {
    const disk = refusingWrites(fsDisk({ [`${HOME}/in`]: 'a\n' }), quotaError())

    expect(shown(last(['uniq in out; echo $?'], { disk }))).toEqual(['uniq: out: No space left on device', '1'])
  })
})

describe('less', () => {
  it('prints the file the same way cat does', () => {
    expect(shown(inRafey('less bio.txt'))).toEqual(['Bio text'])
    expect(shown(inRafey('less bio.txt skills.txt'))).toEqual(['Bio text\nSkills text'])
    expect(shown(inRafey('echo hi | less'))).toEqual(['hi'])
  })

  it('skips its options, and the word an option takes', () => {
    expect(inRafey('less -N bio.txt')).toMatchObject({ lines: [{ text: 'Bio text' }], code: 0 })
    expect(shown(inRafey('less -SN -p Bio bio.txt'))).toEqual(['Bio text'])
    expect(shown(inRafey('less -x4 +G --LINE-NUMBERS bio.txt'))).toEqual(['Bio text'])
    expect(shown(inRafey('less -- -N'))).toEqual(['-N: No such file or directory'])
    expect(shown(inRafey('echo hi | less -N'))).toEqual(['hi'])
    expect(inRafey('less -N')).toMatchObject({ lines: [{ text: 'Missing filename ("less --help" for help)' }], code: 1 })
  })

  it("gives cat's answer for the home terminal's pretend files", () => {
    expect(shown(last(['less projects.txt']))).toEqual(shown(last(['cat projects.txt'])))
    expect(shown(last(['less music.txt']))).toEqual(['Use the command "music" to explore Rafey\'s music'])
    expect(shown(last(['less constructor']))).toEqual(['constructor: No such file or directory'])
  })

  it('reports what it cannot show', () => {
    expect(inRafey('less nope')).toMatchObject({ lines: [{ text: 'nope: No such file or directory' }], code: 1 })
    expect(inRafey('less blog')).toMatchObject({ lines: [{ text: 'blog is a directory' }], code: 1 })
    expect(inRafey('less')).toMatchObject({ lines: [{ text: 'Missing filename ("less --help" for help)' }], code: 1 })
    expect(inRafey('less Music/song.mp3').lines[0].text).toBe('less: Music/song.mp3: binary file (try: music play)')
  })
})
