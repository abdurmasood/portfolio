'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { loadProjects } from '../../lib/loadProjects'

function ProjectsChunkLoading() {
  return <div className="fixed inset-0 bg-black" />
}

const Projects = dynamic(loadProjects, { ssr: false, loading: ProjectsChunkLoading })

export default function Page() {
  const router = useRouter()
  return (
    <div className="w-screen h-screen">
      <Projects onExit={() => router.back()} />
    </div>
  )
}
