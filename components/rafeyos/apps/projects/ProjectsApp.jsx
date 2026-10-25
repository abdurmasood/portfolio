// @ts-check
import { useEffect, useMemo, useRef, useState } from 'react'
import { useServices, useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { HeaderBar } from '@/components/rafeyos/wm/HeaderBar'
import { useWindowChrome } from '@/components/rafeyos/wm/logic/WindowChromeContext'
import { SidebarToggle, splitClassName, useSidebarToggle } from '@/components/rafeyos/wm/SidebarToggle'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { shapeSegments } from './logic/wireframe'
import { useWireframeCanvas } from './logic/useWireframeCanvas'
import { PROJECTS_FOLDER, projectIndexFor } from '@/components/rafeyos/core/vfs/projectPaths'
import { APP } from '@/components/rafeyos/core/catalog/apps'

/**
 * @import { AppInitMap } from '@/components/rafeyos/core/catalog/apps'
 * @import { Project } from '@/components/rafeyos/core/vfs/content'
 */

/**
 * @param {{ projects: readonly Project[], index: number, onPick: (index: number) => void, onShowInFiles: () => void }} props
 */
const ProjectsSidebar = ({ projects, index, onPick, onShowInFiles }) => (
  <div className="side">
    <HeaderBar title="Projects" controls={false} />
    <div className="slist" role="navigation" aria-label="Projects">
      {projects.map((project, i) => (
        <button
          key={project.slug}
          type="button"
          className={i === index ? 'srow on' : 'srow'}
          aria-current={i === index ? 'true' : undefined}
          onClick={() => onPick(i)}
        >
          <Sym name="doc" />
          <span>{project.title}</span>
        </button>
      ))}
      <div className="ssep" />
      <button type="button" className="srow" onClick={onShowInFiles}>
        <Sym name="folder" />
        <span>Show in Files</span>
      </button>
    </div>
  </div>
)

/** @param {{ project: Project }} props */
const ProjectCard = ({ project }) => (
  <div className="p3card">
    <b>{project.title}</b>
    <p>{project.description}</p>
    {project.link && (
      <a href={project.link} target="_blank" rel="noopener">
        {`${project.linkName} · ${project.linkLabel}`}
      </a>
    )}
  </div>
)

/**
 * The black stage: the wireframe, the drag hint and the project card.
 * @param {{ project: Project }} props
 */
const ProjectStage = ({ project }) => {
  const canvasRef = useRef(null)
  const { minimized } = useWindowChrome()
  const { reducedMotion } = useServices()
  const segments = useMemo(() => shapeSegments(project.shape), [project.shape])
  const onPointerDown = useWireframeCanvas({ canvasRef, segments, animate: !minimized && !reducedMotion() })
  return (
    <div className="p3">
      <canvas ref={canvasRef} aria-label={`${project.title} wireframe`} role="img" onPointerDown={onPointerDown} />
      <span className="p3hint">drag to rotate</span>
      <ProjectCard project={project} />
    </div>
  )
}

/**
 * Projects: one window; opening it again with a project (Files' "Open in Projects") turns to it.
 * @param {{ windowId: number, init?: AppInitMap['projects'] | null }} props
 */
export const ProjectsApp = ({ windowId, init }) => {
  const { content } = useVfs()
  const { projects } = content
  const windowManager = useWindowManager()
  const sidebar = useSidebarToggle()
  const [index, setIndex] = useState(() => projectIndexFor(projects, init?.slug))
  useEffect(() => {
    if (init?.slug) setIndex(projectIndexFor(projects, init.slug))
  }, [init, projects])
  const project = projects[index]
  const title = project?.title ?? 'Projects'
  useEffect(() => windowManager.setTitle(windowId, title), [windowManager, windowId, title])
  /** @param {number} i */
  const pick = (i) => {
    setIndex(i)
    sidebar.close()
  }
  return (
    <div className={splitClassName(sidebar)}>
      <ProjectsSidebar
        projects={projects}
        index={index}
        onPick={pick}
        onShowInFiles={() => windowManager.openApp(APP.FILES, { path: PROJECTS_FOLDER })}
      />
      <div className="main">
        <HeaderBar
          start={<SidebarToggle sidebar={sidebar} />}
          title={title}
          subtitle={project ? `${index + 1} of ${projects.length}` : null}
        />
        <div className="scroll" style={{ overflow: 'hidden' }}>
          {project ? <ProjectStage project={project} /> : <div className="empty">No projects</div>}
        </div>
      </div>
    </div>
  )
}
