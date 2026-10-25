'use client'

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Float, Html } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import TerminalIcon from '../../components/projects/TerminalIcon'
import { linkName, projects } from '../../lib/projects'

const geometries = [
  new THREE.OctahedronGeometry(0.9),
  new THREE.TorusGeometry(0.6, 0.3, 16, 100),
  new THREE.IcosahedronGeometry(0.9),
  new THREE.SphereGeometry(0.9, 32, 32),
  new THREE.CylinderGeometry(0.6, 0.6, 1.2, 32),
  new THREE.TetrahedronGeometry(0.9),
  new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16)
]

// Matches the home terminal (components/home/Terminal.css)
const TERMINAL_FONT = 'var(--font-terminal), ui-monospace, monospace'
const COMPACT_QUERY = '(max-width: 640px)'
const PANEL_WIDTH = 262
const PANEL_GAP = 48
// Top of the panel sits just above the shape's centre, so it drops down past the
// neighbour diagonally above instead of covering it
const PANEL_TOP_OFFSET = -24
const PANEL_EDGE_MARGIN = 16

const POINTER_CONTROLS = `  drag          rotate
  right-drag    pan
  scroll        zoom
  click         open a project`

const TOUCH_CONTROLS = `  swipe         rotate
  tap           open a project
  double-tap    then drag to pan`

// Explicit resets: globals.css still styles every <button> and <a>
const QUIET_CONTROL = 'p-0 m-0 border-0 bg-transparent rounded-none font-normal transition-colors cursor-pointer focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#8E8E8E]'
const PANEL_SURFACE = 'bg-black border border-solid border-[#2A2A2A] text-[12px] leading-[1.6] text-[#D0D0D0]'

const stopPropagation = (event) => event.stopPropagation()

const ProjectDetails = ({ project, variant, onClose }) => {
  const isSheet = variant === 'sheet'

  return (
    <motion.section
      aria-label={project.title}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onClick={stopPropagation}
      onPointerDown={stopPropagation}
      className={`${PANEL_SURFACE} ${isSheet ? 'fixed left-3 right-3 bottom-14 px-3.5 pt-0.5 pb-3.5' : 'px-3.5 pt-3 pb-3.5'}`}
      style={isSheet ? undefined : { width: PANEL_WIDTH }}
    >
      <div className={`flex justify-between ${isSheet ? 'items-center' : 'items-baseline mb-1.5'}`}>
        <span className="text-[13px]">{project.title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`${QUIET_CONTROL} text-[11px] text-[#8E8E8E] hover:text-[#D0D0D0] ${isSheet ? 'min-w-[44px] min-h-[44px] text-right' : ''}`}
        >
          {isSheet ? 'close' : 'esc'}
        </button>
      </div>
      <p className="m-0 mb-2.5 text-[#8E8E8E]">{project.description}</p>
      {project.link && (
        <a
          href={project.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stopPropagation}
          onPointerDown={stopPropagation}
          className="font-normal text-[#D0D0D0] underline decoration-[#4A4A4A] underline-offset-[3px] hover:text-[#56D364] hover:decoration-[#56D364] transition-colors focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#8E8E8E]"
        >
          {`${linkName(project.link)} ↗`}
        </a>
      )}
    </motion.section>
  )
}

const ProjectShape = React.memo(({ project, initialPosition, geometry, onProjectClick, isActive, onClosePopup, opacity, isCompact }) => {
  const groupRef = useRef()
  const meshRef = useRef()
  const textRef = useRef()
  const popupRef = useRef()
  const [hovered, setHovered] = useState(false)
  const [touched, setTouched] = useState(false)
  const [scale, setScale] = useState(1)
  const { size, camera } = useThree()
  const projectedPosition = useMemo(() => new THREE.Vector3(), [])
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry])

  const handlePointerOver = useCallback(() => {
    if (!isMobile) setHovered(true)
  }, [isMobile])

  const handlePointerOut = useCallback(() => {
    if (!isMobile) setHovered(false)
  }, [isMobile])
  
  const handleClick = useCallback((event) => {
    event.stopPropagation()
    if (isActive) {
      onClosePopup()
      setTouched(false)
    } else {
      onProjectClick(project)
      if (isMobile) setTouched(true)
    }
  }, [isActive, onClosePopup, onProjectClick, project, isMobile])

  const handlePanelClose = useCallback(() => {
    onClosePopup()
    setTouched(false)
  }, [onClosePopup])

  const randomOffset = useMemo(() => Math.random() * 10, [])
  const randomAmplitude = useMemo(() => Math.random() * 0.07 + 0.03, [])
  const randomFrequency = useMemo(() => Math.random() * 1 + 1, [])

  useEffect(() => {
    if (!isActive) setTouched(false)
  }, [isActive])

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2
      meshRef.current.rotation.y += delta * 0.2
      const targetScale = (hovered || touched) ? 1.2 : 1
      setScale(current => THREE.MathUtils.lerp(current, targetScale, 0.1))
      meshRef.current.scale.setScalar(scale * opacity)
    }
    if (textRef.current) {
      textRef.current.position.y = -1.7 + Math.sin((state.clock.elapsedTime + randomOffset) * randomFrequency) * randomAmplitude
      textRef.current.scale.setScalar(opacity)
    }
    if (popupRef.current && groupRef.current) {
      // <Html> already sits on the shape; only choose which side the panel opens on.
      // size is in CSS pixels (viewport would be world units).
      groupRef.current.getWorldPosition(projectedPosition)
      projectedPosition.project(camera)
      const screenX = (projectedPosition.x * 0.5 + 0.5) * size.width
      const fitsOnRight = screenX + PANEL_GAP + PANEL_WIDTH <= size.width - PANEL_EDGE_MARGIN
      popupRef.current.style.transform = fitsOnRight
        ? `translate(${PANEL_GAP}px, ${PANEL_TOP_OFFSET}px)`
        : `translate(calc(-100% - ${PANEL_GAP}px), ${PANEL_TOP_OFFSET}px)`
    }
  })

  const isHighlighted = hovered || touched

  return (
    <group ref={groupRef} position={initialPosition}>
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
        <group ref={meshRef} scale={scale}>
          <mesh
            geometry={geometry}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            <meshBasicMaterial color={isHighlighted ? '#39FF14' : '#FFFFFF'} wireframe />
          </mesh>
          <lineSegments geometry={edgesGeometry}>
            <lineBasicMaterial color={isHighlighted ? '#39FF14' : '#FFFFFF'} />
          </lineSegments>
        </group>
        <group ref={textRef} position={[0, -1.7, 0]}>
          <Text
            fontSize={0.35}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {project.title}
          </Text>
        </group>
      </Float>
      {/* Outside <Float> so the panel stays steady while the shape bobs */}
      {isActive && !isCompact && (
        <Html>
          <div ref={popupRef} style={{ position: 'absolute', pointerEvents: 'auto' }}>
            <ProjectDetails project={project} variant="anchored" onClose={handlePanelClose} />
          </div>
        </Html>
      )}
    </group>
  )
})

ProjectShape.displayName = 'ProjectShape'

const CustomOrbitControls = () => {
  const { camera, gl } = useThree()
  const controlsRef = useRef()
  const [isPanning, setIsPanning] = useState(false)
  const lastTapRef = useRef(0)
  const touchStartRef = useRef({ x: 0, y: 0 })
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    checkTouchDevice()
    window.addEventListener('resize', checkTouchDevice)
    return () => window.removeEventListener('resize', checkTouchDevice)
  }, [])

  useEffect(() => {
    const handleWheel = (event) => {
      if (controlsRef.current) {
        const moveSpeed = 0.5
        const direction = new THREE.Vector3()
        camera.getWorldDirection(direction)
        
        if (event.deltaY > 0) {
          camera.position.addScaledVector(direction, -moveSpeed)
        } else {
          camera.position.addScaledVector(direction, moveSpeed)
        }
      }
    }

    const handleTouchStart = (event) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0]
        touchStartRef.current = { x: touch.clientX, y: touch.clientY }
        
        const currentTime = new Date().getTime()
        const tapLength = currentTime - lastTapRef.current
        if (tapLength < 300 && tapLength > 0) {
          setIsPanning(true)
        }
        lastTapRef.current = currentTime
      }
    }

    const handleTouchMove = (event) => {
      if (isPanning && event.touches.length === 1) {
        const touch = event.touches[0]
        const movementX = touch.clientX - touchStartRef.current.x
        const movementY = touch.clientY - touchStartRef.current.y
        camera.position.x -= movementX * 0.01
        camera.position.y += movementY * 0.01
        touchStartRef.current = { x: touch.clientX, y: touch.clientY }
      }
    }

    const handleTouchEnd = () => {
      setIsPanning(false)
    }

    gl.domElement.addEventListener('wheel', handleWheel)
    if (isTouchDevice) {
      gl.domElement.addEventListener('touchstart', handleTouchStart, { passive: true })
      gl.domElement.addEventListener('touchmove', handleTouchMove, { passive: false })
      gl.domElement.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      gl.domElement.removeEventListener('wheel', handleWheel)
      if (isTouchDevice) {
        gl.domElement.removeEventListener('touchstart', handleTouchStart)
        gl.domElement.removeEventListener('touchmove', handleTouchMove)
        gl.domElement.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [camera, gl, isPanning, isTouchDevice])

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enableRotate={!isPanning}
      enablePan={!isTouchDevice}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }}
      touchButtons={{
        ONE: THREE.TOUCH.ROTATE
      }}
      minDistance={5}
      maxDistance={50}
    />
  )
}

const Stars = React.memo(({ opacity }) => {
  const starsRef = useRef()
  
  const [geometry, material, stars] = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const vertices = []

    for (let i = 0; i < 3000; i++) {
      vertices.push(THREE.MathUtils.randFloatSpread(100))
      vertices.push(THREE.MathUtils.randFloatSpread(100))
      vertices.push(THREE.MathUtils.randFloatSpread(100))
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    const material = new THREE.PointsMaterial({ color: 0x888888, size: 0.1, transparent: true })
    const stars = new THREE.Points(geometry, material)

    return [geometry, material, stars]
  }, [])

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.x += 0.0001
      starsRef.current.rotation.y += 0.0001
      material.opacity = opacity
    }
  })

  return <primitive object={stars} ref={starsRef} />
})

Stars.displayName = 'Stars'

const Scene = ({ onProjectClick, activeProject, onClosePopup, isCompact }) => {
  const [shapes, setShapes] = useState([])
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const visibleProjects = projects.filter((project) => !project.disabled)
    const initialShapes = visibleProjects.map((project, index) => {
      const angle = (index / visibleProjects.length) * Math.PI * 2
      const radius = 7.7 * (visibleProjects.length / projects.length)
      return {
        project,
        position: [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0
        ],
        geometry: geometries[projects.indexOf(project)]
      }
    })
    setShapes(initialShapes)

    // Animate opacity
    const fadeIn = () => {
      setOpacity(prevOpacity => {
        const newOpacity = Math.min(prevOpacity + 0.05, 1)
        if (newOpacity < 1) {
          requestAnimationFrame(fadeIn)
        }
        return newOpacity
      })
    }
    requestAnimationFrame(fadeIn)
  }, [])

  return (
    <>
      <ambientLight intensity={0.5 * opacity} />
      <pointLight position={[10, 10, 10]} intensity={opacity} />
      <CustomOrbitControls />
      {shapes.map((shape) => (
        <ProjectShape
          key={shape.project.id}
          project={shape.project}
          initialPosition={shape.position}
          geometry={shape.geometry}
          onProjectClick={onProjectClick}
          isActive={activeProject?.id === shape.project.id}
          onClosePopup={onClosePopup}
          opacity={opacity}
          isCompact={isCompact}
        />
      ))}
      <Stars opacity={opacity} />
    </>
  )
}

const Projects = () => {
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)
  const [activeProject, setActiveProject] = useState(null)
  const [isCompact, setIsCompact] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })

  // Help and project details share the bottom of the screen on mobile, so only one is open at a time
  const toggleHelp = useCallback(() => {
    setShowHelp(prev => !prev)
    setActiveProject(null)
  }, [])

  const handleProjectClick = useCallback((project) => {
    setActiveProject(project)
    setShowHelp(false)
  }, [])

  const handleClosePopup = useCallback(() => {
    setActiveProject(null)
  }, [])

  const handleTerminalClick = useCallback(() => {
    router.back()
  }, [router])

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const compactQuery = window.matchMedia(COMPACT_QUERY)
    const updateCompact = () => setIsCompact(compactQuery.matches)
    updateCompact()
    compactQuery.addEventListener('change', updateCompact)
    return () => compactQuery.removeEventListener('change', updateCompact)
  }, [])

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return
      if (activeProject) {
        setActiveProject(null)
      } else {
        setShowHelp(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [activeProject])

  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault()
    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight })
    }
    checkTouchDevice()
    handleResize()
    window.addEventListener('resize', () => {
      checkTouchDevice()
      handleResize()
    })
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const cameraPosition = useMemo(() => {
    // Base zoom level
    let zoomLevel = 20

    // Adjust zoom level based on screen size
    if (screenSize.width <= 480) {  // For very small screens (e.g., iPhone SE)
      zoomLevel = 36
    } else if (screenSize.width <= 768) {  // For general mobile screens
      zoomLevel = 28
    } else if (screenSize.width <= 1024) {  // For tablets and small laptops
      zoomLevel = 25
    }

    // You might need to adjust these values based on your specific layout
    return [0, 0, zoomLevel]
  }, [screenSize])

  const canvasVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 1.5, ease: 'easeOut' } }
  }

  const buttonVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 1 } }
  }

  const instructionsVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
  }

  return (
    <div className="w-screen h-screen bg-black text-white font-mono" style={{ fontFamily: TERMINAL_FONT }}>
      <AnimatePresence>
        {mounted && isLoaded && (
          <motion.div
            key="canvas-container"
            initial="hidden"
            animate="visible"
            variants={canvasVariants}
            className="w-full h-full"
          >
            <Canvas camera={{ position: cameraPosition, fov: 60 }}>
              <Scene 
                onProjectClick={handleProjectClick} 
                activeProject={activeProject}
                onClosePopup={handleClosePopup}
                isCompact={isCompact}
              />
              <CustomOrbitControls />
            </Canvas>
          </motion.div>
        )}
      </AnimatePresence>

      <TerminalIcon onClick={handleTerminalClick} />

      {isCompact && activeProject && (
        <ProjectDetails
          key={activeProject.id}
          project={activeProject}
          variant="sheet"
          onClose={handleClosePopup}
        />
      )}

      <AnimatePresence>
        {isLoaded && (
          <motion.button
            key="help-button"
            type="button"
            aria-expanded={showHelp}
            aria-controls="projects-controls"
            className={`${QUIET_CONTROL} absolute left-0.5 bottom-1 sm:left-2.5 sm:bottom-2 px-2.5 min-h-[44px] text-[12px] ${showHelp ? 'text-[#D0D0D0]' : 'text-[#8E8E8E] hover:text-[#D0D0D0]'}`}
            onClick={toggleHelp}
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
          >
            help
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHelp && (
          <motion.section
            key="help-panel"
            id="projects-controls"
            aria-label="Controls"
            className={`${PANEL_SURFACE} absolute left-3 bottom-14 sm:left-5 sm:bottom-[52px] px-4 pt-3 pb-3.5 whitespace-pre`}
            variants={instructionsVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            Controls:{'\n\n'}
            <span className="text-[#8E8E8E]">{isTouchDevice ? TOUCH_CONTROLS : POINTER_CONTROLS}</span>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Projects