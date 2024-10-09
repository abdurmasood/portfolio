import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { motion, useAnimation, AnimatePresence } from "framer-motion"
import { useNavigate } from 'react-router-dom'
import MusicPlayer from './MusicPlayer'
import { Terminal } from 'lucide-react'

const Timeline = lazy(() => import("./timeline"))
const Background3D = lazy(() => import("./3D/3DBackground"))

const MemoizedTimeline = React.memo(Timeline)

const TerminalIcon = ({ onClick }) => {
  return (
    <motion.div
      className="absolute top-4 left-4 cursor-pointer z-30"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
    >
      <Terminal
        size={32}
        color="#4ADE80"
        onClick={onClick}
        className="hover:text-white transition-colors duration-200"
      />
    </motion.div>
  );
};

function ArtistPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true)
  const [showTimeline, setShowTimeline] = useState(false)
  const [show3DBackground, setShow3DBackground] = useState(false)
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
    }
    
    animationSequence()
  }, [journeySectionControls])

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

  const handleTerminalClick = useCallback(() => {
    navigate(-1);
  }, [navigate]);

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
      <TerminalIcon onClick={handleTerminalClick} />
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
        </div>
      </main>
    </div>
  )
}

export default ArtistPage