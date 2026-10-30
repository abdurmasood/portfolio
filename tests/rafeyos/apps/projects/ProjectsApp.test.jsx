// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { chooseMenuItem, clickDock, headerTitle, menuLabels, renderDesktop, rightClick, settle, windowsOf } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { buildContent } from '@/components/rafeyos/core/vfs/content'

// The real scene needs WebGL. This stand-in shows the props the window hands it.
const scene = vi.hoisted(() => ({ openRequests: [] }))
vi.mock('@/lib/loadProjects', () => ({
  loadProjects: async () => ({
    default: function FakeScene({ onExit, openProject, active, paused }) {
      if (openProject && scene.openRequests.at(-1) !== openProject) scene.openRequests.push(openProject)
      return (
        <div
          data-testid="projects-scene"
          data-project={openProject?.id ?? ''}
          data-active={String(active)}
          data-paused={String(paused)}
          data-exit={String(Boolean(onExit))}
        />
      )
    },
  }),
}))

const { projects } = buildContent()

afterEach(() => {
  cleanup()
  scene.openRequests.length = 0
})

const sceneIn = (win) => within(win).getByTestId('projects-scene')

const openProjects = async () => {
  const view = renderDesktop()
  clickDock('Projects')
  await settle()
  const [win] = windowsOf(view.container, 'projects')
  return { ...view, win, ui: within(win) }
}

describe('Projects app', () => {
  it('shows the 3D scene under a single "Projects" header bar', async () => {
    const { container, win } = await openProjects()

    expect(windowsOf(container, 'projects')).toHaveLength(1)
    expect(win.querySelectorAll('.hb')).toHaveLength(1)
    expect(headerTitle(win)).toBe('Projects')
    expect(win.getAttribute('aria-label')).toBe('Projects')
    expect(sceneIn(win).dataset).toMatchObject({ project: '', active: 'true', paused: 'false' })
  })

  it('has no way back to the terminal: the window has its own close button', async () => {
    const { win, ui } = await openProjects()

    expect(sceneIn(win).dataset.exit).toBe('false')
    expect(ui.getByRole('button', { name: 'Close' })).toBeTruthy()
  })

  it('only lets the scene take Escape while its window is focused', async () => {
    const { win } = await openProjects()

    clickDock('Terminal')
    expect(sceneIn(win).dataset.active).toBe('false')

    fireEvent.pointerDown(win)
    expect(sceneIn(win).dataset.active).toBe('true')
  })

  it('leaves Escape to the Activities overview while it is open', async () => {
    const { win } = await openProjects()

    fireEvent.click(screen.getByRole('button', { name: 'Activities' }))
    expect(sceneIn(win).dataset.active).toBe('false')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(sceneIn(win).dataset.active).toBe('true')
  })

  it('pauses the scene while minimized, and resumes when restored', async () => {
    const { win, ui } = await openProjects()

    fireEvent.click(ui.getByRole('button', { name: 'Minimize' }))
    expect(sceneIn(win).dataset.paused).toBe('true')

    clickDock('Projects')
    expect(sceneIn(win).dataset.paused).toBe('false')
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

  const openInProjects = async (files, project) => {
    rightClick(files.querySelector(`[data-path="/home/rafey/projects/${project.slug}.txt"]`))
    chooseMenuItem('Open in Projects')
    await settle()
  }

  it('is offered for a project file and opens that project in the scene', async () => {
    const { container, files } = openProjectsFolder()
    const target = projects[projects.length - 1]

    rightClick(files.querySelector(`[data-path="/home/rafey/projects/${target.slug}.txt"]`))
    expect(menuLabels()).toContain('Open in Projects')
    chooseMenuItem('Open in Projects')
    await settle()

    const [win] = windowsOf(container, 'projects')
    expect(sceneIn(win).dataset.project).toBe(String(target.id))
    expect(win.getAttribute('aria-label')).toBe('Projects')
    expect(windowsOf(container, 'editor')).toHaveLength(0)
  })

  it('turns the open Projects window rather than opening another', async () => {
    const { container, files } = openProjectsFolder()
    clickDock('Projects')
    const target = projects[1]

    await openInProjects(files, target)

    expect(windowsOf(container, 'projects')).toHaveLength(1)
    expect(sceneIn(windowsOf(container, 'projects')[0]).dataset.project).toBe(String(target.id))
  })

  it('asks again for a project the visitor already opened, so a closed panel reopens', async () => {
    const { files } = openProjectsFolder()

    await openInProjects(files, projects[0])
    await openInProjects(files, projects[0])

    const [first, second] = scene.openRequests
    expect(second).not.toBe(first)
    expect(second).toEqual({ id: projects[0].id })
  })

  it('is not offered for other files, and Open still uses the Text Editor', () => {
    const { container, files } = openProjectsFolder()

    fireEvent.doubleClick(files.querySelector(`[data-path="/home/rafey/projects/${projects[0].slug}.txt"]`))
    expect(windowsOf(container, 'editor')).toHaveLength(1)

    fireEvent.click(within(files.querySelector('.pathbar')).getByRole('button', { name: 'rafey' }))
    rightClick(files.querySelector('[data-path="/home/rafey/bio.txt"]'))
    expect(menuLabels()).not.toContain('Open in Projects')
  })
})

describe('Projects from the terminal', () => {
  it('projects --3d opens it', async () => {
    const { container } = renderDesktop()
    clickDock('Terminal')
    const input = screen.getByLabelText('Terminal input')

    fireEvent.change(input, { target: { value: 'projects --3d' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await settle()

    expect(windowsOf(container, 'projects')).toHaveLength(1)
  })
})
