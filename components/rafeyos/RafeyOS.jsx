'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createServices } from '@/components/rafeyos/core/services/createServices'
import { RafeyOSRoot } from './RafeyOSRoot'
import './styles/rafeyos.css'

/** The /os page body. Loaded lazily (lib/loadRafeyOS.js), so its CSS ships in this chunk only. */
export const RafeyOS = () => {
  const router = useRouter()
  const services = useMemo(() => createServices({ router }), [router])
  return <RafeyOSRoot services={services} />
}
