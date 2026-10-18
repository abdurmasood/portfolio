import { describe, it, expect } from 'vitest'
import { complete } from '@/components/rafeyos/terminal/complete'
import { COMPLETION_COMMANDS } from '@/components/rafeyos/terminal/exec'
import { buildVfs } from '@/components/rafeyos/vfs/buildVfs'
import { fixtureContent } from '@/tests/rafeyos/helpers/testVfs'

const vfs = buildVfs(fixtureContent)
const tab = (input, { cwd = '~', tabCount = 1 } = {}) =>
  complete(input, { vfs, cwd, commands: COMPLETION_COMMANDS, tabCount })

describe('complete', () => {
  it('fills a unique command with a trailing space', () => {
    expect(tab('wh')).toEqual({ value: 'whoami ' })
  })

  it('never offers startx', () => {
    expect(tab('star')).toEqual({ value: 'star' })
  })

  it('lists several matches only on the second tab', () => {
    expect(tab('c')).toEqual({ value: 'c' })
    expect(tab('c', { tabCount: 2 })).toEqual({ list: ['contact', 'cd', 'cat', 'clear'] })
  })

  it('completes a folder with a trailing slash', () => {
    expect(tab('cd Mu')).toEqual({ value: 'cd Music/' })
  })

  it('completes a file with a trailing space', () => {
    expect(tab('cat sk')).toEqual({ value: 'cat skills.txt ' })
  })

  it('completes inside a typed folder, keeping the prefix', () => {
    expect(tab('cat Music/st')).toEqual({ value: 'cat Music/story.txt ' })
    expect(tab('cat ../bio', { cwd: '~/Music' })).toEqual({ value: 'cat ../bio.txt ' })
  })

  it('completes inside a folder', () => {
    expect(tab('ls proj')).toEqual({ value: 'ls projects/' })
    expect(tab('ls projects/b')).toEqual({ value: 'ls projects/beta.txt ' })
  })

  it('lists path matches relative to cwd on the second tab', () => {
    expect(tab('cat s', { cwd: '~/Music', tabCount: 2 })).toEqual({ list: ['song.mp3', 'story.txt'] })
    expect(tab('ls b', { tabCount: 2 })).toEqual({ list: ['blog/', 'bio.txt'] })
  })

  it('leaves input alone when nothing matches or the folder is missing', () => {
    expect(tab('cat zz')).toEqual({ value: 'cat zz' })
    expect(tab('cat nope/x')).toEqual({ value: 'cat nope/x' })
    expect(tab('cat bio.txt/x')).toEqual({ value: 'cat bio.txt/x' })
  })
})
