'use client'

import dynamic from 'next/dynamic'
import { loadProjects } from '../../lib/loadProjects'

function ProjectsChunkLoading() {
  return <div className="fixed inset-0 bg-black" />
}

const Projects = dynamic(loadProjects, { ssr: false, loading: ProjectsChunkLoading })

export default function Page() {
  return <Projects />
}
