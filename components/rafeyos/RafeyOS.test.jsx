// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

afterEach(cleanup)

describe('RafeyOS entry', () => {
  it('is what lib/loadRafeyOS loads, and boots with the real browser services', async () => {
    const { loadRafeyOS } = await import('../../lib/loadRafeyOS')
    const { RafeyOS } = await loadRafeyOS()

    render(<RafeyOS />)

    // jsdom has no matchMedia, so motion counts as allowed and the splash plays
    expect(screen.getByRole('status', { name: 'Starting rafeyOS' })).toBeTruthy()
  })
})
