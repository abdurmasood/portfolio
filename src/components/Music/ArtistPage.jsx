import React, { useEffect, useState } from 'react'
import { motion, useAnimation } from "framer-motion"
import Timeline from "./timeline"
import Background3D from "./3DBackground"

function ArtistPage() {
  const [showTimeline, setShowTimeline] = useState(false)
  const backgroundControls = useAnimation()

  useEffect(() => {
    const timer = setTimeout(() => setShowTimeline(true), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (showTimeline) {
      setTimeout(() => backgroundControls.start("visible"), 3000)
    }
  }, [showTimeline, backgroundControls])

  const timelineEvents = [
    { year: 1990, event: "Born in New York City" },
    { year: 2000, event: "Won first art competition in elementary school" },
    { year: 2012, event: "Graduated from art school with honors" },
    { year: 2015, event: "Commissioned for public mural in city center" },
    { year: 2023, event: "International art tour across Europe" },
  ]

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 1 } }
  }

  const backgroundFadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 1,
        ease: "easeOut"
      } 
    }
  }

  return (
    <div className="min-h-screen w-screen bg-[#0D1117] text-white flex flex-col relative overflow-hidden font-mono">
      <Background3D />
      <div className="absolute inset-0 bg-[#0D1117] opacity-90 z-0"></div>
      <main className="flex-grow flex flex-col items-center justify-start p-6 relative z-10 overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto">
          <motion.section 
            className="mb-12 w-full"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <h2 className="text-4xl font-semibold mb-12 text-center text-[#4ADE80]">My Artistic Journey</h2>
            {showTimeline && <Timeline events={timelineEvents} />}
          </motion.section>
          <motion.section 
            className="mt-16 w-full"
            initial="hidden"
            animate={backgroundControls}
            variants={backgroundFadeIn}
          >
            <h2 className="text-3xl font-semibold mb-8 text-center text-[#4ADE80]">Background</h2>
            <p className="text-white text-lg text-center max-w-4xl mx-auto mb-6">
              As a passionate artist with over two decades of experience, I've dedicated my life to exploring the
              boundaries of visual expression. My journey began in the vibrant streets of New York City, where I was
              exposed to a rich tapestry of cultures and artistic styles from an early age. This diverse background has
              profoundly influenced my work, which often blends traditional techniques with contemporary themes.
            </p>
            <p className="text-white text-lg text-center max-w-4xl mx-auto">
              Throughout my career, I've experimented with various mediums, from oil painting and sculpture to digital
              art and mixed media installations. My work has been featured in galleries across the country and has
              earned recognition in several international exhibitions. I'm constantly pushing myself to evolve as an
              artist, drawing inspiration from nature, urban landscapes, and the human experience.
            </p>
          </motion.section>
        </div>
      </main>
    </div>
  )
}

export default ArtistPage