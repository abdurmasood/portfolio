// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { usePointerTrack } from './usePointerTrack'

afterEach(cleanup)

const Probe = ({ move, end }) => {
  const track = usePointerTrack()
  return <div data-testid="probe" onPointerDown={(event) => track(event, { move, end })} />
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

describe('usePointerTrack', () => {
  it('applies the last point on release and leaves no frame queued behind', async () => {
    const move = vi.fn()
    const end = vi.fn()
    const { getByTestId } = render(<Probe move={move} end={end} />)
    const probe = getByTestId('probe')

    fireEvent.pointerDown(probe, { pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(probe, { pointerId: 1, clientX: 5, clientY: 6 })
    fireEvent.pointerUp(probe, { pointerId: 1 })
    await nextFrame()
    await nextFrame()

    expect(move).toHaveBeenCalledTimes(1)
    expect(move).toHaveBeenCalledWith({ x: 5, y: 6 })
    expect(end).toHaveBeenCalledTimes(1)
  })

  it('stops listening when unmounted mid-gesture', async () => {
    const move = vi.fn()
    const { getByTestId, unmount } = render(<Probe move={move} end={vi.fn()} />)
    const probe = getByTestId('probe')
    fireEvent.pointerDown(probe, { pointerId: 1 })
    fireEvent.pointerMove(probe, { pointerId: 1, clientX: 5, clientY: 6 })

    unmount()
    fireEvent.pointerMove(probe, { pointerId: 1, clientX: 9, clientY: 9 })
    await nextFrame()

    expect(move).not.toHaveBeenCalled()
  })
})
