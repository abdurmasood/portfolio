'use client'

import dynamic from 'next/dynamic'

const ProjectsPage = dynamic(
  () => import('./ProjectsPage.jsx'),
  { ssr: false }
)

export default function Page() {
  return <ProjectsPage />
}
