// @ts-check
import { Suspense, lazy, useMemo } from 'react'
import { useShellState, useVfs } from '@/components/rafeyos/state/logic/contexts'
import { HeaderBar } from '@/components/rafeyos/wm/HeaderBar'
import { useWindowChrome } from '@/components/rafeyos/wm/logic/WindowChromeContext'
import { loadProjects } from '@/lib/loadProjects'

/**
 * @import { AppInitMap } from '@/components/rafeyos/core/catalog/apps'
 */

// The /projects page's own 3D scene, loaded on first open so three.js stays out of the OS chunk
const ProjectsScene = lazy(loadProjects)

/**
 * Projects: the 3D projects scene in one window. Opening it again with a project
 * (Files' "Open in Projects") opens that project's details.
 * @param {{ windowId: number, init?: AppInitMap['projects'] | null }} props
 */
export const ProjectsApp = ({ init }) => {
  const { content } = useVfs()
  const { focused, minimized } = useWindowChrome()
  const { overview, menu, popup, dialog } = useShellState()
  // A reopen replaces init, so a new object reopens a project the visitor already closed
  const openProject = useMemo(() => {
    const project = content.projects.find(({ slug }) => slug === init?.slug)
    return project ? { id: project.id } : undefined
  }, [init, content.projects])
  // Escape belongs to the shell while it has something open to close
  const active = focused && !overview && !menu && !popup && !dialog
  return (
    <>
      <HeaderBar title="Projects" />
      <div className="p3d">
        <Suspense fallback={null}>
          <ProjectsScene openProject={openProject} active={active} paused={minimized} />
        </Suspense>
      </div>
    </>
  )
}
