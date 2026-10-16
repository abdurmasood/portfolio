import { useEffect, useRef, useState } from 'react'
import { getProjectById, getVisibleProjects } from '../../lib/projects'

const VISIBLE_PROJECTS = getVisibleProjects()

// Shown like a path, not a URL: no scheme or trailing slash
const displayLink = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

function ProjectCard({ project }) {
  return (
    <div className="project-card">
      <h1><span className="marker"># </span>{project.title}</h1>
      <p className="project-description">{project.description}</p>
      {project.link && (
        <p className="project-link">
          <span className="dim">case study</span>
          <a href={project.link} target="_blank" rel="noopener noreferrer">{displayLink(project.link)}</a>
        </p>
      )}
    </div>
  )
}

const isPlainKey = (event, key) => event.key === key && !event.metaKey && !event.ctrlKey && !event.altKey

function ActivePicker({ onDone }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedIndexRef = useRef(0)
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)

  selectedIndexRef.current = selectedIndex
  onDoneRef.current = onDone

  const finish = (result) => {
    if (doneRef.current) return
    doneRef.current = true
    onDoneRef.current(result)
  }

  const open = (index) => finish({ chosenId: VISIBLE_PROJECTS[index].id })

  const move = (step) => {
    setSelectedIndex((index) => Math.min(Math.max(index + step, 0), VISIBLE_PROJECTS.length - 1))
  }

  // Read through a ref so the window listener below is attached once and never sees stale state
  const keyActionsRef = useRef(null)
  keyActionsRef.current = { move, open, finish }

  useEffect(() => {
    // The Enter that ran `projects` is still bubbling when this mounts; without this it would open the first project
    const mountedAt = performance.now()
    const handleKey = (event) => {
      if (event.timeStamp < mountedAt) return
      const { move, open, finish } = keyActionsRef.current
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        move(event.key === 'ArrowUp' ? -1 : 1)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        open(selectedIndexRef.current)
      } else if (isPlainKey(event, 'v')) {
        event.preventDefault()
        finish({ view3d: true })
      } else if (isPlainKey(event, 'q') || event.key === 'Escape' || (event.ctrlKey && event.key === 'c')) {
        event.preventDefault()
        finish({})
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div className="terminal-block picker-block">
      <div className="picker">
        <ul className="picker-list" aria-label="Projects">
          {VISIBLE_PROJECTS.map((project, index) => {
            const isSelected = index === selectedIndex
            return (
              <li
                key={project.id}
                className={`picker-row${isSelected ? ' is-selected' : ''}`}
                aria-current={isSelected ? 'true' : undefined}
              >
                <span className="picker-mark" aria-hidden="true">{isSelected ? '›' : ''}</span>
                {project.title}
              </li>
            )
          })}
        </ul>
        <section className="picker-preview" aria-live="polite">
          <ProjectCard project={VISIBLE_PROJECTS[selectedIndex]} />
        </section>
      </div>
      <div className="gap-half" />
      <p className="music-line dim player-keys">
        <span className="player-key">↑↓</span> select · <span className="player-key">enter</span> open · <span className="player-key">v</span> 3D view · <span className="player-key">esc</span> quit
      </p>
      <div className="player-taps">
        <button type="button" onClick={() => open(selectedIndexRef.current)}>[ open ]</button>
        <button type="button" onClick={() => finish({ view3d: true })} aria-label="Open the 3D projects view">[ 3D ]</button>
        <button type="button" onClick={() => finish({})}>[ quit ]</button>
      </div>
    </div>
  )
}

export function ProjectPicker({ active, chosenId, onDone }) {
  if (active) {
    return <ActivePicker onDone={onDone} />
  }
  const chosen = chosenId === undefined ? null : getProjectById(chosenId)
  // Quitting prints nothing, like fzf on esc
  if (!chosen) return null
  return (
    <div className="terminal-block project-printed">
      <ProjectCard project={chosen} />
    </div>
  )
}
