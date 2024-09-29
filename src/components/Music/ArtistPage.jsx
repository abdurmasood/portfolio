import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { motion, useAnimation, AnimatePresence } from "framer-motion"
import MusicPlayer from './MusicPlayer'


const Timeline = lazy(() => import("./timeline"))
const Background3D = lazy(() => import("./3D/3DBackground"))

const MemoizedTimeline = React.memo(Timeline)

function ArtistPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [showTimeline, setShowTimeline] = useState(false)
  const [show3DBackground, setShow3DBackground] = useState(false)
  const backgroundControls = useAnimation()
  const journeySectionControls = useAnimation()

  const startAnimations = useCallback(() => {
    const animationSequence = async () => {
      setIsLoading(false)
      await new Promise(resolve => setTimeout(resolve, 500))
      setShow3DBackground(true)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      journeySectionControls.start("visible")
      
      await new Promise(resolve => setTimeout(resolve, 500))
      setShowTimeline(true)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      backgroundControls.start("visible")
    }
    
    animationSequence()
  }, [journeySectionControls, backgroundControls])

  useEffect(() => {
    // Preload the lazy components
    Promise.all([
      import("./timeline"),
      import("./3D/3DBackground")
    ]).then(() => {
      startAnimations()
    })
  }, [startAnimations])

  const timelineEvents = useMemo(() => [
    { year: 2006, event: "Picked up a guitar for the first time" },
    { year: 2011, event: "Started his journey touring as a cover artist in Pakistan" },
    { year: 2016, event: "Moved to London & started focusing on his lyrical expression" },
    { year: 2022, event: "Incorporated his own record label & got signed to Studio X" },
    { year: 2025, event: "Release date of his debut album" },
  ], [])

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.5,
        ease: "easeOut"
      } 
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen bg-[#0D1117] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-[#4ADE80] text-2xl"
        >
          Loading...
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-screen bg-[#0D1117] text-white flex flex-col relative overflow-hidden font-mono">
      <MusicPlayer/>
      <AnimatePresence>
        {show3DBackground && (
          <Suspense fallback={null}>
            <motion.div
              key="background"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0 z-0"
            >
              <Background3D />
            </motion.div>
          </Suspense>
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-[#0D1117] opacity-90 z-10"></div>
      <main className="flex-grow flex flex-col items-center justify-start p-6 relative z-20 overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto">
          <motion.section 
            className="mb-12 w-full"
            initial="hidden"
            animate={journeySectionControls}
            variants={fadeIn}
          >
            <h2 className="text-4xl font-semibold mb-12 text-center text-[#4ADE80]">Artistic Journey</h2>
            <AnimatePresence>
              {showTimeline && (
                <Suspense fallback={null}>
                  <MemoizedTimeline events={timelineEvents} />
                </Suspense>
              )}
            </AnimatePresence>
          </motion.section>
          <motion.section 
            className="mt-16 w-full"
            initial="hidden"
            animate={backgroundControls}
            variants={fadeIn}
          >
            <h2 className="text-3xl font-semibold mb-8 text-center text-[#4ADE80]">Background</h2>
            <p className="text-white text-lg text-center max-w-4xl mx-auto mb-6">
             Rafey, also known by is stage name "Ramé Sivano", is a 27 year old artist/music producer from London. He started his journey into music at the age of 10. He spent his early years solidifying
             a firm footing in the independent music scene in Pakistan by touring across the country as a cover artist. 2016 saw him move to London in pursuit of a better future. That is when Rafey took a break from
             touring to focus on his lyrical expression.
            </p>
            <p className="text-white text-lg text-center max-w-4xl mx-auto">
              After spending half a decade honing his his skills as a producer and finding his sound, he got signed to Studio X & he is set to release his debut album in November of 2025.
            </p>
          </motion.section>
        </div>
      </main>
    </div>
  )
}

export default ArtistPage