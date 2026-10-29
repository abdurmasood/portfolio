import { describe, expect, it } from 'vitest'
import { copy, mkdir, move, remove, symlink, touch, writeFile } from '@/components/rafeyos/core/vfs/fsOps'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { mergeState, parseState, seedState } from '@/components/rafeyos/core/vfs/fsState'
import { resolve } from '@/components/rafeyos/core/vfs/paths'
import { fixtureContent } from '@/tests/rafeyos/helpers/testVfs'

const NOW = 9
const H = '/home/visitor'
const SONG = '/home/rafey/Music/song.mp3'
const base = buildVfs(fixtureContent)

const dir = (mtime = 1) => ({ type: 'dir', mtime })
const text = (value, mtime = 1) => ({ type: 'text', text: value, mtime })
const link = (target, mtime = 1) => ({ type: 'symlink', target, mtime })

/** The seeded state plus these visitor nodes (absolute path -> node). */
const stateOf = (nodes = {}) => parseState({ v: 2, nodes: { ...seedState(1).nodes, ...nodes }, trash: {} })

/** Runs an op the way the store does: against the tree merged from the state it changes. */
const run = (op, state, args) => op(mergeState(base, state), state, args, NOW)

const fails = (errno, path) => ({ ok: false, errno, path })

describe('mkdir', () => {
  it('mkdir parents and errors', () => {
    const state = stateOf()
    expect(run(mkdir, state, { path: `${H}/a` }).state.nodes[`${H}/a`]).toEqual(dir(NOW))
    expect(run(mkdir, state, { path: '/tmp/a' }).state.nodes['/tmp/a']).toEqual(dir(NOW))
    expect(run(mkdir, state, { path: `${H}/Desktop` })).toEqual(fails('EEXIST', `${H}/Desktop`))
    expect(run(mkdir, state, { path: '/home/rafey/bio.txt' })).toEqual(fails('EEXIST', '/home/rafey/bio.txt'))
    expect(run(mkdir, state, { path: `${H}/x/y` })).toEqual(fails('ENOENT', `${H}/x/y`))
    expect(run(mkdir, state, { path: '/home/rafey/x' })).toEqual(fails('EACCES', '/home/rafey/x'))
    expect(run(mkdir, state, { path: '/etc/x' })).toEqual(fails('EACCES', '/etc/x'))
    expect(run(mkdir, state, { path: `${H}/${'a'.repeat(256)}` })).toEqual(fails('ENAMETOOLONG', `${H}/${'a'.repeat(256)}`))
  })

  it('creates every missing folder with parents, through links, and keeps existing ones', () => {
    const state = stateOf({ [`${H}/docs`]: link('Documents'), [`${H}/f.txt`]: text('f') })
    const made = run(mkdir, state, { path: `${H}/a/b/c`, parents: true })
    expect(made.state.nodes).toMatchObject({ [`${H}/a`]: dir(NOW), [`${H}/a/b`]: dir(NOW), [`${H}/a/b/c`]: dir(NOW) })
    expect(run(mkdir, state, { path: `${H}/docs/new/deep`, parents: true }).state.nodes).toMatchObject({
      [`${H}/Documents/new`]: dir(NOW), [`${H}/Documents/new/deep`]: dir(NOW),
    })
    expect(run(mkdir, state, { path: `${H}/Desktop`, parents: true })).toEqual({ ok: true, state })
    expect(run(mkdir, state, { path: '/home/rafey/x/y', parents: true })).toEqual(fails('EACCES', '/home/rafey/x'))
    expect(run(mkdir, state, { path: `${H}/f.txt`, parents: true })).toEqual(fails('EEXIST', `${H}/f.txt`))
    expect(run(mkdir, state, { path: `${H}/f.txt/x`, parents: true })).toEqual(fails('ENOTDIR', `${H}/f.txt/x`))
  })
})

describe('writeFile and touch', () => {
  it('write creates appends follows symlink and refuses dirs', () => {
    const state = stateOf({
      [`${H}/a.txt`]: text('one\n'),
      [`${H}/l`]: link('a.txt'),
      [`${H}/dangling`]: link('new.txt'),
      [`${H}/p`]: link('/etc/passwd'),
      [`${H}/x`]: link('y'),
      [`${H}/y`]: link('x'),
    })
    expect(run(writeFile, state, { path: `${H}/b.txt`, text: 'hi\n' }).state.nodes[`${H}/b.txt`]).toEqual(text('hi\n', NOW))
    expect(run(writeFile, state, { path: `${H}/a.txt`, text: 'two\n', append: true }).state.nodes[`${H}/a.txt`]).toEqual(text('one\ntwo\n', NOW))
    expect(run(writeFile, state, { path: `${H}/a.txt`, text: 'two\n' }).state.nodes[`${H}/a.txt`]).toEqual(text('two\n', NOW))
    expect(run(writeFile, state, { path: `${H}/a.txt`, truncateOnly: true }).state.nodes[`${H}/a.txt`]).toEqual(text('', NOW))
    expect(run(writeFile, state, { path: `${H}/c.txt`, truncateOnly: true }).state.nodes[`${H}/c.txt`]).toEqual(text('', NOW))
    expect(run(writeFile, state, { path: `${H}/c.txt`, text: '', append: true }).state.nodes[`${H}/c.txt`]).toEqual(text('', NOW))

    const throughLink = run(writeFile, state, { path: `${H}/l`, text: 'x' }).state
    expect(throughLink.nodes[`${H}/a.txt`]).toEqual(text('x', NOW))
    expect(throughLink.nodes[`${H}/l`]).toEqual(link('a.txt'))
    expect(run(writeFile, state, { path: `${H}/dangling`, text: 'n' }).state.nodes[`${H}/new.txt`]).toEqual(text('n', NOW))

    expect(run(writeFile, state, { path: `${H}/Desktop`, text: 'x' })).toEqual(fails('EISDIR', `${H}/Desktop`))
    expect(run(writeFile, state, { path: '/home/rafey/bio.txt', text: 'x' })).toEqual(fails('EACCES', '/home/rafey/bio.txt'))
    expect(run(writeFile, state, { path: '/etc/new', text: 'x' })).toEqual(fails('EACCES', '/etc/new'))
    expect(run(writeFile, state, { path: `${H}/p`, text: 'x' })).toEqual(fails('EACCES', `${H}/p`))
    expect(run(writeFile, state, { path: `${H}/nope/a.txt`, text: 'x' })).toEqual(fails('ENOENT', `${H}/nope/a.txt`))
    expect(run(writeFile, state, { path: `${H}/a.txt/b`, text: 'x' })).toEqual(fails('ENOTDIR', `${H}/a.txt/b`))
    expect(run(writeFile, state, { path: `${H}/x`, text: 'x' })).toEqual(fails('ELOOP', `${H}/x`))
    expect(run(writeFile, state, { path: '/tmp/t', text: 't' }).state.nodes['/tmp/t']).toEqual(text('t', NOW))
  })

  it('write through a linked folder', () => {
    const state = stateOf({ [`${H}/d`]: link('Documents'), [`${H}/r`]: link('/home/rafey') })
    const written = run(writeFile, state, { path: `${H}/d/a.txt`, text: 'hi' }).state
    expect(written.nodes[`${H}/Documents/a.txt`]).toEqual(text('hi', NOW))
    expect(written.nodes[`${H}/d/a.txt`]).toBeUndefined()
    expect(run(writeFile, state, { path: `${H}/r/x`, text: 'x' })).toEqual(fails('EACCES', `${H}/r/x`))
  })

  it('writes through a link whose target climbs out of a linked folder where reads land', () => {
    const state = stateOf({ [`${H}/Documents/sub`]: dir(), [`${H}/d`]: link('Documents/sub'), [`${H}/w`]: link('d/../new.txt') })
    const vfs = mergeState(base, state)
    const written = run(writeFile, state, { path: `${H}/w`, text: 'n' }).state

    expect(resolve(vfs, `${H}/w`, { followLast: true })).toEqual({ ok: false, errno: 'ENOENT' })
    expect(written.nodes[`${H}/Documents/new.txt`]).toEqual(text('n', NOW))
    expect(written.nodes[`${H}/new.txt`]).toBeUndefined()
    expect(resolve(mergeState(base, written), `${H}/w`, { followLast: true })).toEqual({ ok: true, path: `${H}/Documents/new.txt` })
  })

  it('resolves a link target that names a folder whole, so a missing folder before `..` is ENOENT', () => {
    const state = stateOf({ [`${H}/d`]: link('Documents/..'), [`${H}/n`]: link('nope/..') })
    expect(run(writeFile, state, { path: `${H}/d`, text: 'x' })).toEqual(fails('EISDIR', `${H}/d`))
    expect(run(writeFile, state, { path: `${H}/n`, text: 'x' })).toEqual(fails('ENOENT', `${H}/n`))
  })

  it('replaces a copy with text, appending to what it read as', () => {
    const state = stateOf({ [`${H}/song.mp3`]: { type: 'copy', from: SONG, mtime: 1 } })
    expect(run(writeFile, state, { path: `${H}/song.mp3`, text: 'x', append: true }).state.nodes[`${H}/song.mp3`]).toEqual(text('x', NOW))
  })

  it('touch creates an empty file or bumps the mtime, and refuses shipped files', () => {
    const state = stateOf({ [`${H}/a.txt`]: text('a'), [`${H}/l`]: link('Desktop') })
    expect(run(touch, state, { path: `${H}/new` }).state.nodes[`${H}/new`]).toEqual(text('', NOW))
    expect(run(touch, state, { path: `${H}/a.txt` }).state.nodes[`${H}/a.txt`]).toEqual(text('a', NOW))
    const touched = run(touch, state, { path: `${H}/l` }).state.nodes
    expect(touched[`${H}/Desktop`]).toEqual(dir(NOW))
    expect(touched[`${H}/l`]).toEqual(link('Desktop'))
    expect(run(touch, state, { path: '/home/rafey/bio.txt' })).toEqual(fails('EACCES', '/home/rafey/bio.txt'))
    expect(run(touch, state, { path: '/home/rafey/new' })).toEqual(fails('EACCES', '/home/rafey/new'))
    expect(run(touch, state, { path: `${H}/nope/x` })).toEqual(fails('ENOENT', `${H}/nope/x`))
  })
})

describe('remove', () => {
  it('remove recursive reports visitor home and keeps it', () => {
    const state = stateOf({
      [`${H}/Desktop/a.txt`]: text('a'),
      [`${H}/Documents/sub`]: dir(),
      [`${H}/Documents/sub/b.txt`]: text('b'),
      [`${H}/r`]: link('/home/rafey'),
      '/tmp/t': text('t'),
    })
    const result = run(remove, state, { path: H, recursive: true })
    expect(result).toEqual({ ok: true, state: { v: 2, nodes: { '/tmp/t': text('t') }, trash: {} }, errors: [{ errno: 'EACCES', path: H }] })
    expect(mergeState(base, result.state)['/home/rafey/bio.txt']).toBeDefined()
  })

  it('reports each shipped file a recursive delete cannot remove', () => {
    const state = stateOf()
    expect(run(remove, state, { path: '/home/rafey/blog', recursive: true })).toEqual({
      ok: true, state, errors: [{ errno: 'EACCES', path: '/home/rafey/blog/first-post.md' }],
    })
  })

  it('removes files and links, never their targets', () => {
    const state = stateOf({ [`${H}/a.txt`]: text('a'), [`${H}/l`]: link('a.txt'), [`${H}/d`]: link('Desktop') })
    expect(run(remove, state, { path: `${H}/a.txt` }).state.nodes[`${H}/a.txt`]).toBeUndefined()
    const unlinked = run(remove, state, { path: `${H}/l` }).state.nodes
    expect(unlinked[`${H}/l`]).toBeUndefined()
    expect(unlinked[`${H}/a.txt`]).toEqual(text('a'))
    expect(run(remove, state, { path: `${H}/d`, recursive: true }).state.nodes[`${H}/Desktop`]).toEqual(dir())
    expect(run(remove, state, { path: `${H}/Desktop` })).toEqual(fails('EISDIR', `${H}/Desktop`))
    expect(run(remove, state, { path: '/home/rafey/bio.txt' })).toEqual(fails('EACCES', '/home/rafey/bio.txt'))
    expect(run(remove, state, { path: '/home/rafey/bio.txt', recursive: true })).toEqual(fails('EACCES', '/home/rafey/bio.txt'))
    expect(run(remove, state, { path: `${H}/nope` })).toEqual(fails('ENOENT', `${H}/nope`))
  })

  it('rmdir refuses non empty', () => {
    const state = stateOf({ [`${H}/Documents/a.txt`]: text('a') })
    expect(run(remove, state, { path: `${H}/Documents`, dirOnly: true })).toEqual(fails('ENOTEMPTY', `${H}/Documents`))
    expect(run(remove, state, { path: `${H}/Desktop`, dirOnly: true }).state.nodes[`${H}/Desktop`]).toBeUndefined()
    expect(run(remove, state, { path: `${H}/Documents/a.txt`, dirOnly: true })).toEqual(fails('ENOTDIR', `${H}/Documents/a.txt`))
    expect(run(remove, state, { path: '/home/rafey/blog', dirOnly: true })).toEqual(fails('EACCES', '/home/rafey/blog'))
  })
})

describe('move', () => {
  it('move renames and refuses shipped source', () => {
    const state = stateOf({ [`${H}/a.txt`]: text('a'), [`${H}/Documents/sub`]: dir(), [`${H}/Documents/sub/x`]: text('x') })
    const renamed = run(move, state, { from: `${H}/a.txt`, to: `${H}/b.txt` }).state.nodes
    expect(renamed[`${H}/b.txt`]).toEqual(text('a'))
    expect(renamed[`${H}/a.txt`]).toBeUndefined()
    const folder = run(move, state, { from: `${H}/Documents`, to: '/tmp/Docs' }).state.nodes
    expect(folder).toMatchObject({ '/tmp/Docs': dir(), '/tmp/Docs/sub': dir(), '/tmp/Docs/sub/x': text('x') })
    expect(Object.keys(folder).some((path) => path.startsWith(`${H}/Documents`))).toBe(false)

    expect(run(move, state, { from: '/home/rafey/bio.txt', to: `${H}/bio.txt` })).toEqual(fails('EACCES', '/home/rafey/bio.txt'))
    expect(run(move, state, { from: `${H}/a.txt`, to: '/home/rafey/a.txt' })).toEqual(fails('EACCES', '/home/rafey/a.txt'))
    expect(run(move, state, { from: `${H}/nope`, to: `${H}/b` })).toEqual(fails('ENOENT', `${H}/nope`))
    expect(run(move, state, { from: `${H}/a.txt`, to: `${H}/nope/b` })).toEqual(fails('ENOENT', `${H}/nope/b`))
  })

  it('follows rename rules where the destination exists', () => {
    const state = stateOf({ [`${H}/a.txt`]: text('a'), [`${H}/b.txt`]: text('b'), [`${H}/Documents/x`]: text('x') })
    expect(run(move, state, { from: `${H}/a.txt`, to: `${H}/a.txt` })).toEqual({ ok: true, state })
    expect(run(move, state, { from: `${H}/a.txt`, to: `${H}/b.txt` }).state.nodes[`${H}/b.txt`]).toEqual(text('a'))
    expect(run(move, state, { from: `${H}/Desktop`, to: `${H}/Downloads` }).state.nodes[`${H}/Desktop`]).toBeUndefined()
    expect(run(move, state, { from: `${H}/Desktop`, to: `${H}/Documents` })).toEqual(fails('ENOTEMPTY', `${H}/Documents`))
    expect(run(move, state, { from: `${H}/a.txt`, to: `${H}/Desktop` })).toEqual(fails('EISDIR', `${H}/Desktop`))
    expect(run(move, state, { from: `${H}/Desktop`, to: `${H}/a.txt` })).toEqual(fails('ENOTDIR', `${H}/a.txt`))
    expect(run(move, state, { from: `${H}/Documents`, to: `${H}/Documents/in` })).toEqual(fails('EINVAL', `${H}/Documents/in`))
  })
})

describe('copy', () => {
  it('copy shipped text becomes visitor text', () => {
    const state = stateOf({ [`${H}/mine.txt`]: text('mine'), [`${H}/p`]: link('/etc/passwd'), [`${H}/old.txt`]: text('old') })
    expect(run(copy, state, { from: '/home/rafey/bio.txt', to: `${H}/bio.txt` }).state.nodes[`${H}/bio.txt`]).toEqual(text('Bio text\n', NOW))
    expect(run(copy, state, { from: `${H}/mine.txt`, to: `${H}/old.txt` }).state.nodes[`${H}/old.txt`]).toEqual(text('mine', NOW))
    expect(run(copy, state, { from: `${H}/p`, to: `${H}/passwd` }).state.nodes[`${H}/passwd`]).toMatchObject({ type: 'text' })
    expect(run(copy, state, { from: `${H}/p`, to: `${H}/q`, recursive: true }).state.nodes[`${H}/q`]).toEqual(link('/etc/passwd', NOW))
    expect(run(copy, state, { from: '/home/rafey/bio.txt', to: '/home/rafey/b.txt' })).toEqual(fails('EACCES', '/home/rafey/b.txt'))
    expect(run(copy, state, { from: `${H}/nope`, to: `${H}/b` })).toEqual(fails('ENOENT', `${H}/nope`))
    expect(run(copy, state, { from: `${H}/mine.txt`, to: `${H}/Desktop` })).toEqual(fails('EISDIR', `${H}/Desktop`))
  })

  it('writes a file through a link at the destination and refuses a dangling one', () => {
    const state = stateOf({
      [`${H}/x`]: text('x'), [`${H}/real.txt`]: text('old'), [`${H}/l`]: link('real.txt'),
      [`${H}/r`]: link('/home/rafey/bio.txt'), [`${H}/gone`]: link('new.txt'), [`${H}/loop`]: link('loop'),
    })
    const through = run(copy, state, { from: `${H}/x`, to: `${H}/l` }).state.nodes
    expect(through[`${H}/real.txt`]).toEqual(text('x', NOW))
    expect(through[`${H}/l`]).toEqual(link('real.txt'))
    expect(run(copy, state, { from: `${H}/x`, to: `${H}/l`, recursive: true }).state.nodes[`${H}/real.txt`]).toEqual(text('x', NOW))
    expect(run(copy, state, { from: `${H}/x`, to: `${H}/r` })).toEqual(fails('EACCES', `${H}/r`))
    expect(run(copy, state, { from: `${H}/x`, to: `${H}/gone` })).toEqual(fails('ENOENT', `${H}/gone`))
    expect(run(copy, state, { from: `${H}/x`, to: `${H}/loop` })).toEqual(fails('ELOOP', `${H}/loop`))
    expect(run(copy, state, { from: `${H}/real.txt`, to: `${H}/l` })).toEqual(fails('EINVAL', `${H}/l`))
    // cp -r copies a link as a link, so the one at the destination is replaced, not written through
    expect(run(copy, state, { from: `${H}/r`, to: `${H}/l`, recursive: true }).state.nodes[`${H}/l`]).toEqual(link('/home/rafey/bio.txt', NOW))
  })

  it('copies folders only when recursive, never into themselves', () => {
    const state = stateOf({ [`${H}/f.txt`]: text('f') })
    expect(run(copy, state, { from: '/home/rafey/blog', to: `${H}/blog` })).toEqual(fails('EISDIR', '/home/rafey/blog'))
    expect(run(copy, state, { from: '/home/rafey/blog', to: `${H}/blog`, recursive: true }).state.nodes).toMatchObject({
      [`${H}/blog`]: dir(NOW),
      [`${H}/blog/first-post.md`]: { type: 'text', mtime: NOW },
    })
    expect(run(copy, state, { from: `${H}/Desktop`, to: `${H}/Desktop/in`, recursive: true })).toEqual(fails('EINVAL', `${H}/Desktop/in`))
    expect(run(copy, state, { from: `${H}/Desktop`, to: `${H}/f.txt`, recursive: true })).toEqual(fails('ENOTDIR', `${H}/f.txt`))
  })

  it('merges a folder into an existing one and reports clashes', () => {
    const state = stateOf({
      [`${H}/src`]: dir(), [`${H}/src/a.txt`]: text('new'), [`${H}/src/sub`]: dir(), [`${H}/src/sub/b`]: text('b'),
      [`${H}/dst`]: dir(), [`${H}/dst/a.txt`]: text('old'), [`${H}/dst/sub`]: text('a file'),
    })
    const result = run(copy, state, { from: `${H}/src`, to: `${H}/dst`, recursive: true })
    expect(result.state.nodes[`${H}/dst/a.txt`]).toEqual(text('new', NOW))
    expect(result.state.nodes[`${H}/dst/sub/b`]).toBeUndefined()
    expect(result.errors).toEqual([{ errno: 'ENOTDIR', path: `${H}/dst/sub` }])
  })

  it('copy shipped audio becomes copy node', () => {
    const state = stateOf()
    const copied = run(copy, state, { from: SONG, to: `${H}/s.mp3` }).state
    expect(copied.nodes[`${H}/s.mp3`]).toEqual({ type: 'copy', from: SONG, mtime: NOW })
    expect(mergeState(base, copied)[`${H}/s.mp3`]).toMatchObject({ type: 'audio', src: base[SONG].src, user: true })
    const again = run(copy, copied, { from: `${H}/s.mp3`, to: `${H}/t.mp3` }).state
    expect(again.nodes[`${H}/t.mp3`]).toEqual({ type: 'copy', from: SONG, mtime: NOW })
    expect(run(copy, state, { from: '/home/rafey/contact/email.desktop', to: `${H}/e` }).state.nodes[`${H}/e`]).toEqual({
      type: 'copy', from: '/home/rafey/contact/email.desktop', mtime: NOW,
    })
  })
})

describe('symlink', () => {
  it('symlink to shipped file reads through', () => {
    const state = stateOf()
    const made = run(symlink, state, { target: '/etc/passwd', path: `${H}/p` }).state
    expect(made.nodes[`${H}/p`]).toEqual(link('/etc/passwd', NOW))
    const vfs = mergeState(base, made)
    const real = resolve(vfs, `${H}/p`, { followLast: true })
    expect(real).toEqual({ ok: true, path: '/etc/passwd' })
    expect(vfs[real.path].text).toContain('visitor:x:1001')
  })

  it('stores the target as typed and refuses taken or locked names', () => {
    const state = stateOf({ [`${H}/gone`]: link('nowhere') })
    expect(run(symlink, state, { target: 'nowhere/../x', path: `${H}/l` }).state.nodes[`${H}/l`]).toEqual(link('nowhere/../x', NOW))
    expect(run(symlink, state, { target: 'x', path: `${H}/gone` })).toEqual(fails('EEXIST', `${H}/gone`))
    expect(run(symlink, state, { target: 'x', path: '/home/rafey/l' })).toEqual(fails('EACCES', '/home/rafey/l'))
    expect(run(symlink, state, { target: '', path: `${H}/l` })).toEqual(fails('ENOENT', `${H}/l`))
  })

  it("replace swaps the visitor's file or link for the new link, never a folder or a shipped file", () => {
    const state = stateOf({ [`${H}/f`]: text('f'), [`${H}/l`]: link('old') })
    expect(run(symlink, state, { target: 'x', path: `${H}/f`, replace: true }).state.nodes[`${H}/f`]).toEqual(link('x', NOW))
    expect(run(symlink, state, { target: 'x', path: `${H}/l`, replace: true }).state.nodes[`${H}/l`]).toEqual(link('x', NOW))
    expect(run(symlink, state, { target: 'x', path: `${H}/Documents`, replace: true })).toEqual(fails('EEXIST', `${H}/Documents`))
    expect(run(symlink, state, { target: 'x', path: '/home/rafey/bio.txt', replace: true })).toEqual(fails('EACCES', '/home/rafey/bio.txt'))
  })
})
