// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Projects from '@/app/projects/Projects'
import { getProjectById } from '@/lib/projects'

// jsdom has no WebGL: the Canvas stands in as a div, and nothing inside it renders
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ frameloop }) => <div data-testid="canvas" data-frameloop={frameloop} />,
  useFrame: () => {},
  useThree: () => ({}),
}))
vi.mock('@react-three/drei', () => ({ OrbitControls: () => null, Text: () => null, Float: () => null, Html: () => null }))

const NEURO_SCAN = getProjectById(2)

let resizeTo

beforeEach(() => {
  window.ResizeObserver = class {
    constructor(callback) {
      resizeTo = (width) => act(() => callback([{ contentRect: { width } }]))
    }

    observe() {}

    disconnect() {}
  }
})

afterEach(() => {
  cleanup()
  delete window.ResizeObserver
})

const renderScene = (props, width = 1200) => {
  const view = render(<Projects {...props} />)
  resizeTo(width)
  return view
}

const projectSheet = (project) => screen.queryByRole('region', { name: project.title })

describe('Projects scene', () => {
  it('shows the terminal icon only when it has somewhere to exit to', () => {
    const onExit = vi.fn()
    const { rerender } = renderScene({})
    expect(screen.queryByRole('button', { name: 'Back to terminal' })).toBeNull()

    rerender(<Projects onExit={onExit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Back to terminal' }))

    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('opens a requested project as a bottom sheet when its container is narrow', () => {
    renderScene({ openProject: { id: NEURO_SCAN.id } }, 500)

    expect(projectSheet(NEURO_SCAN)).toBeTruthy()
  })

  it('anchors project details to the shape instead when its container is wide', () => {
    renderScene({ openProject: { id: NEURO_SCAN.id } }, 1200)

    expect(projectSheet(NEURO_SCAN)).toBeNull()
  })

  it('switches layout when its container is resized, whatever the window size', () => {
    renderScene({ openProject: { id: NEURO_SCAN.id } }, 1200)

    resizeTo(600)

    expect(projectSheet(NEURO_SCAN)).toBeTruthy()
  })

  it('closes the open project on Escape only while active', () => {
    const { rerender } = renderScene({ openProject: { id: NEURO_SCAN.id }, active: false }, 500)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(projectSheet(NEURO_SCAN)).toBeTruthy()

    rerender(<Projects openProject={{ id: NEURO_SCAN.id }} active />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(projectSheet(NEURO_SCAN)).toBeNull()
  })

  it('closes help on Escape when no project is open', async () => {
    renderScene({})
    const help = await screen.findByRole('button', { name: 'help' })

    fireEvent.click(help)
    expect(help.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(help.getAttribute('aria-expanded')).toBe('false')
  })

  it('reopens a project when asked again after the visitor closed it', () => {
    const { rerender } = renderScene({ openProject: { id: NEURO_SCAN.id } }, 500)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(projectSheet(NEURO_SCAN)).toBeNull()

    rerender(<Projects openProject={{ id: NEURO_SCAN.id }} />)

    expect(projectSheet(NEURO_SCAN)).toBeTruthy()
  })

  it('blocks the browser context menu over the scene only', () => {
    const { container } = renderScene({})

    expect(fireEvent.contextMenu(container.firstChild)).toBe(false)
    expect(fireEvent.contextMenu(document.body)).toBe(true)
  })

  it('stops rendering frames while paused', async () => {
    const { rerender } = renderScene({})
    expect((await screen.findByTestId('canvas')).dataset.frameloop).toBe('always')

    rerender(<Projects paused />)

    expect(screen.getByTestId('canvas').dataset.frameloop).toBe('never')
  })
})
