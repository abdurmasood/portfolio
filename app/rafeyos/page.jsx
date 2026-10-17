'use client'

import dynamic from 'next/dynamic'
import { loadRafeyOS } from '../../lib/loadRafeyOS'
import { BootSplash } from '../../components/rafeyos/session/BootSplash'
// Loaded here, not in the chunk, so the loading state already looks like the boot splash
import '../../components/rafeyos/styles/boot.css'

const BootSplashLoading = () => <BootSplash />

const RafeyOS = dynamic(() => loadRafeyOS().then((module) => ({ default: module.RafeyOS })), {
  ssr: false,
  loading: BootSplashLoading,
})

export default function Page() {
  return <RafeyOS />
}
