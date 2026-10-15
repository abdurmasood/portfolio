'use client'

import dynamic from 'next/dynamic'

const ProjectsPage = dynamic(
  () => import('../../src/components/Projects/ProjectsPage.jsx'),
  { ssr: false }
)

export default function Page() {
  return <ProjectsPage />
}
