// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useCommandRecall } from '@/components/rafeyos/apps/terminal/logic/useCommandRecall'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { writeFile } from '@/components/rafeyos/core/vfs/fsOps'
import { createShellFs } from '@/components/rafeyos/core/vfs/shellFs'
import { fsDisk, fsStoreOn } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { fixtureContent } from '@/tests/rafeyos/helpers/testVfs'

afterEach(cleanup)

const HISTORY = '/home/visitor/.bash_history'
const shellWithHistory = (text) => createShellFs({ base: buildVfs(fixtureContent), store: fsStoreOn(fsDisk({ [HISTORY]: text })) })

describe('useCommandRecall', () => {
  it('command recall walks the history file as it was at mount, then its own lines', () => {
    const shellFs = shellWithHistory('ls\npwd\n')
    const { result } = renderHook(() => useCommandRecall(shellFs))
    const recall = result.current
    // Another window's later line shows only in `history`, never in ↑
    shellFs.apply(writeFile, { path: HISTORY, text: 'elsewhere\n', append: true })

    act(() => recall.push('whoami'))
    act(() => recall.push('   '))

    expect([recall.older(), recall.older(), recall.older(), recall.older()]).toEqual(['whoami', 'pwd', 'ls', null])
    expect([recall.newer(), recall.newer(), recall.newer()]).toEqual(['pwd', 'whoami', ''])
    act(() => recall.clear())
    expect(recall.older()).toBeNull()
  })
})
