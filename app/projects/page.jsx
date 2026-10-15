'use client'

import dynamic from 'next/dynamic'

const Projects = dynamic(
  () => import('./Projects.jsx'),
  { ssr: false }
)

export default function Page() {
  return <Projects />
}
