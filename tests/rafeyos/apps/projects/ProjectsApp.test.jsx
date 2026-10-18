// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { chooseMenuItem, clickDock, menuLabels, renderDesktop, rightClick, windowsOf } from '@/components/rafeyos/testing/renderRafeyOS'
import { buildContent } from '@/components/rafeyos/vfs/content'

const { projects } = buildContent()
const linked = projects.find((project) => project.link)
const unlinked = projects.find((project) => !project.link)

let context
let frames
let nextFrame

/** requestAnimationFrame under the test's control: runFrames() plays one frame. */
const controlFrames = () => {
  frames = new Map()
  nextFrame = 1
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(nextFrame, callback)
    return nextFrame++
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => frames.delete(id))
}

const runFrames = () => {
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach((callback) => callback(0))
}

beforeEach(() => {
  context = { clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const openProjects = (overrides) => {
  const view = renderDesktop(overrides)
  clickDock('Projects')
  const [win] = windowsOf(view.container, 'projects')
  return { ...view, win, ui: within(win) }
}

const headerOf = (win) => win.querySelectorAll('.hb')[1]

describe('Projects app', () => {
  it('lists every project, then Show in Files, beside the first project', () => {
    const { win, ui } = openProjects()
    const sidebar = within(ui.getByRole('navigation', { name: 'Projects' }))

    expect(win.querySelector('.side .hb .ttl b').textContent).toBe('Projects')
    expect(sidebar.getAllByRole('button').map((row) => row.textContent)).toEqual([...projects.map((p) => p.title), 'Show in Files'])
    expect(headerOf(win).querySelector('.ttl b').textContent).toBe(projects[0].title)
    expect(headerOf(win).querySelector('.ttl small').textContent).toBe(`1 of ${projects.length}`)
    expect(win.getAttribute('aria-label')).toBe(projects[0].title)
    expect(ui.getByText('drag to rotate')).toBeTruthy()
    expect(win.querySelector('.p3card p').textContent).toBe(projects[0].description)
  })

  it('turns to the picked project, with its case study link opening in a new tab', () => {
    const { win, ui } = openProjects()
    const index = projects.indexOf(linked)

    fireEvent.click(ui.getByRole('button', { name: linked.title }))

    const link = within(win.querySelector('.p3card')).getByRole('link')
    expect(link.textContent).toBe(`case study · ${linked.linkLabel}`)
    expect(link.getAttribute('href')).toBe(linked.link)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener')
    expect(headerOf(win).querySelector('.ttl small').textContent).toBe(`${index + 1} of ${projects.length}`)
    expect(ui.getByRole('button', { name: linked.title }).getAttribute('aria-current')).toBe('true')
    expect(win.getAttribute('aria-label')).toBe(linked.title)
  })

  it('shows no link for a project without a case study', () => {
    const { win, ui } = openProjects()

    fireEvent.click(ui.getByRole('button', { name: unlinked.title }))

    expect(within(win.querySelector('.p3card')).queryByRole('link')).toBeNull()
  })

  it('opens ~/projects in Files', () => {
    const { container, ui } = openProjects()

    fireEvent.click(ui.getByRole('button', { name: 'Show in Files' }))

    expect(windowsOf(container, 'files')[0].getAttribute('aria-label')).toBe('projects')
  })

  it('names its wireframe for assistive tech', () => {
    const { ui } = openProjects()

    expect(ui.getByRole('img', { name: `${projects[0].title} wireframe` })).toBeTruthy()
  })
})

describe('Open in Projects', () => {
  const openProjectsFolder = () => {
    const view = renderDesktop()
    clickDock('Files')
    const [files] = windowsOf(view.container, 'files')
    fireEvent.click(within(files).getByRole('button', { name: 'projects' }))
    return { ...view, files }
  }

  it('is offered for a project file and opens that project', () => {
    const { container, files } = openProjectsFolder()
    const target = projects[projects.length - 1]

    rightClick(files.querySelector(`[data-path="~/projects/${target.slug}.txt"]`))
    expect(menuLabels()).toContain('Open in Projects')
    chooseMenuItem('Open in Projects')

    const [win] = windowsOf(container, 'projects')
    expect(win.getAttribute('aria-label')).toBe(target.title)
    expect(windowsOf(container, 'editor')).toHaveLength(0)
  })

  it('turns the open Projects window rather than opening another', () => {
    const { container, files } = openProjectsFolder()
    clickDock('Projects')
    const target = projects[1]

    rightClick(files.querySelector(`[data-path="~/projects/${target.slug}.txt"]`))
    chooseMenuItem('Open in Projects')

    expect(windowsOf(container, 'projects')).toHaveLength(1)
    expect(windowsOf(container, 'projects')[0].getAttribute('aria-label')).toBe(target.title)
  })

  it('is not offered for other files, and Open still uses the Text Editor', () => {
    const { container, files } = openProjectsFolder()

    fireEvent.doubleClick(files.querySelector(`[data-path="~/projects/${projects[0].slug}.txt"]`))
    expect(windowsOf(container, 'editor')).toHaveLength(1)

    fireEvent.click(within(within(files).getByRole('navigation', { name: 'Places' })).getByRole('button', { name: 'Home' }))
    rightClick(files.querySelector('[data-path="~/bio.txt"]'))
    expect(menuLabels()).not.toContain('Open in Projects')
  })
})

describe('wireframe canvas', () => {
  it('spins one frame at a time while shown', () => {
    controlFrames()
    openProjects({ reducedMotion: () => false })

    expect(frames.size).toBe(1)
    runFrames()
    runFrames()

    expect(context.stroke).toHaveBeenCalledTimes(2)
    expect(frames.size).toBe(1)
  })

  it('stops while minimized, and starts again when restored', () => {
    controlFrames()
    const { ui } = openProjects({ reducedMotion: () => false })
    runFrames()

    fireEvent.click(ui.getAllByRole('button', { name: 'Minimize' })[0])
    expect(frames.size).toBe(0)
    expect(window.cancelAnimationFrame).toHaveBeenCalled()

    clickDock('Projects')
    expect(frames.size).toBe(1)
  })

  it('stops when the window closes', () => {
    controlFrames()
    const { container, ui } = openProjects({ reducedMotion: () => false })
    runFrames()

    fireEvent.click(ui.getAllByRole('button', { name: 'Close' })[0])

    expect(windowsOf(container, 'projects')).toHaveLength(0)
    expect(frames.size).toBe(0)
  })

  it('draws a single still frame when motion is reduced, and redraws on drag', () => {
    controlFrames()
    const { win } = openProjects()
    const canvas = win.querySelector('canvas')

    expect(frames.size).toBe(0)
    const still = context.stroke.mock.calls.length
    expect(still).toBeGreaterThan(0)

    fireEvent.pointerDown(canvas, { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 140, clientY: 0, pointerId: 1 })
    runFrames()
    fireEvent.pointerUp(canvas, { clientX: 140, clientY: 0, pointerId: 1 })

    expect(context.stroke.mock.calls.length).toBeGreaterThan(still)
  })

  it('redraws the still frame when the window is resized, until it closes', () => {
    controlFrames()
    const observers = []
    window.ResizeObserver = class {
      constructor(callback) {
        this.callback = callback
        this.disconnect = vi.fn()
        observers.push(this)
      }

      observe() {}
    }
    const { ui } = openProjects()
    const still = context.stroke.mock.calls.length

    observers.at(-1).callback()
    expect(context.stroke.mock.calls.length).toBe(still + 1)
    fireEvent.click(ui.getAllByRole('button', { name: 'Close' })[0])

    expect(observers.at(-1).disconnect).toHaveBeenCalled()
    delete window.ResizeObserver
  })

  it('ignores a right-button press on the canvas', () => {
    controlFrames()
    const { win } = openProjects()
    const still = context.stroke.mock.calls.length

    fireEvent.pointerDown(win.querySelector('canvas'), { button: 2, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(win.querySelector('canvas'), { clientX: 140, clientY: 0 })
    runFrames()

    expect(context.stroke.mock.calls.length).toBe(still)
  })

  it('sizes the bitmap to the element at the device pixel ratio, at most 2x', () => {
    controlFrames()
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200)
    const ratio = vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3)
    const { win } = openProjects()
    const canvas = win.querySelector('canvas')

    expect([canvas.width, canvas.height]).toEqual([600, 400])
    expect(context.lineWidth).toBe(2.4)
    ratio.mockRestore()
  })
})

describe('Projects from the terminal', () => {
  it('projects --3d opens it', () => {
    const { container } = renderDesktop()
    clickDock('Terminal')
    const input = screen.getByLabelText('Terminal input')

    fireEvent.change(input, { target: { value: 'projects --3d' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(windowsOf(container, 'projects')).toHaveLength(1)
  })
})
