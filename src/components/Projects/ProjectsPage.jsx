import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Float, Html } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import TerminalIcon from './../Terminal/TerminalIcon'  // Assuming you've saved the TerminalIcon component in a separate file
import { useNavigate } from 'react-router-dom';

const projects = [
  { id: 1, title: "HeartSync", description: "About Abdur Rafey Masood" },
  { id: 2, title: "NeuroScan", description: "Education background" },
  { id: 3, title: "Nannie.ai", description: "Work experience" },
  { id: 4, title: "Sat Comms", description: "Projects he's worked on" },
  { id: 5, title: "GAP", description: "Where he was born & raised" },
  { id: 6, title: "Rate Watch", description: "Rafey's journey as a producer/artist" },
  { id: 7, title: "Assisty.io", description: "Display all the commands" },
]

const geometries = [
  new THREE.OctahedronGeometry(0.9),
  new THREE.TorusGeometry(0.6, 0.3, 16, 100),
  new THREE.IcosahedronGeometry(0.9),
  new THREE.SphereGeometry(0.9, 32, 32),
  new THREE.CylinderGeometry(0.6, 0.6, 1.2, 32),
  new THREE.TetrahedronGeometry(0.9),
  new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16)
]

const ProjectShape = React.memo(({ project, initialPosition, geometry, onProjectClick, isActive, onClosePopup, opacity }) => {
  const groupRef = useRef()
  const meshRef = useRef()
  const textRef = useRef()
  const popupRef = useRef()
  const [hovered, setHovered] = useState(false)
  const [touched, setTouched] = useState(false)
  const [scale, setScale] = useState(1)
  const { viewport, camera } = useThree()
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
      // Convert the object's position to screen space
      const vector = new THREE.Vector3()
      groupRef.current.getWorldPosition(vector)
      vector.project(camera)

      // Convert to 2D screen space
      const x = (vector.x * 0.5 + 0.5) * viewport.width
      const y = (vector.y * -0.5 + 0.5) * viewport.height

      // Determine if the geometry is on the left or right side of the screen
      const isLeftSide = x < viewport.width / 2

      // Position the popup to the right or left of the geometry
      const offsetX = isLeftSide ? 5 : -35 
      const popupX = x + offsetX
      const popupY = y

      // Update popup position
      popupRef.current.style.transform = `translate(${isLeftSide ? '0' : '-100%'}, -50%) translate(${popupX}px,${popupY}px)`
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
        {isActive && (
          <Html>
            <div ref={popupRef} className="popup-container" style={{ position: 'absolute', pointerEvents: 'auto' }}>
              <div 
                className="popup-content bg-black bg-opacity-75 text-white p-3 sm:p-4 rounded-md shadow-lg relative"
                style={{
                  width: '200px',
                  maxWidth: '80vw',
                  animation: 'easeIn 0.3s ease-out',
                  animationFillMode: 'forwards'
                }}
              >
                <button 
                  onClick={(e) => { 
                    e.stopPropagation()
                    onClosePopup()
                    setTouched(false)
                  }}
                  className="absolute top-1 right-2 sm:top-2 sm:right-4 text-white hover:text-gray-300 bg-transparent border-none cursor-pointer text-base sm:text-lg focus:outline-none"
                  style={{ lineHeight: 1 }}
                >
                  ✕
                </button>
                <h3 className="text-base sm:text-lg font-bold mb-1 sm:mb-2">{project.title}</h3>
                <p className="text-xs sm:text-sm">{project.description}</p>
              </div>
            </div>
          </Html>
        )}
      </Float>
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

const Scene = ({ onProjectClick, activeProject, onClosePopup }) => {
  const [shapes, setShapes] = useState([])
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const initialShapes = projects.map((project, index) => {
      const angle = (index / projects.length) * Math.PI * 2
      const radius = 7.7
      return {
        project,
        position: [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0
        ],
        geometry: geometries[index]
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
        />
      ))}
      <Stars opacity={opacity} />
    </>
  )
}

const ProjectsPage = () => {
  const navigate = useNavigate()
  const [showInstructions, setShowInstructions] = useState(false)
  const [activeProject, setActiveProject] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  const toggleInstructions = useCallback(() => {
    setShowInstructions(prev => !prev)
  }, [])

  const handleProjectClick = useCallback((project) => {
    setActiveProject(project)
  }, [])

  const handleClosePopup = useCallback(() => {
    setActiveProject(null)
  }, [])

  const handleTerminalClick = useCallback(() => {
    navigate(-1)
  }, [navigate])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

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
    <div className="w-screen h-screen bg-black text-white font-mono">
      <AnimatePresence>
        {isLoaded && (
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
              />
              <CustomOrbitControls />
            </Canvas>
          </motion.div>
        )}
      </AnimatePresence>

      <TerminalIcon onClick={handleTerminalClick} className="absolute top-2 left-2 sm:top-4 sm:left-4" />

      <AnimatePresence>
        {isLoaded && (
          <motion.button
            key="instructions-button"
            className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-white text-black px-2 py-1 sm:px-3 sm:py-1 rounded-md text-xs sm:text-sm hover:bg-gray-200 transition-colors"
            onClick={toggleInstructions}
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
          >
            Instructions
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstructions && (
          <motion.div
            key="instructions-panel"
            className="absolute bottom-12 sm:bottom-16 left-2 sm:left-4 bg-black bg-opacity-75 p-3 sm:p-4 rounded-md max-w-[90vw] sm:max-w-xs"
            variants={instructionsVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 sm:space-y-2">
              <li className="text-xs sm:text-sm"><strong className="text-[#39FF14]">SWIPE</strong> or <strong className="text-[#39FF14]">DRAG</strong> to rotate the view.</li>
              <li className="text-xs sm:text-sm">
                {isTouchDevice ? (
                  <><strong className="text-[#39FF14]">DOUBLE-TAP</strong> and <strong className="text-[#39FF14]">DRAG</strong> to move sideways.</>
                ) : (
                  <><strong className="text-[#39FF14]">RIGHT-CLICK</strong> and <strong className="text-[#39FF14]">DRAG</strong> to move sideways.</>
                )}
              </li>
              {!isTouchDevice && (
                <li className="text-xs sm:text-sm"><strong className="text-[#39FF14]">SCROLL</strong> to move forward and backward.</li>
              )}
              <li className="text-xs sm:text-sm"><strong className="text-[#39FF14]">TAP</strong> or <strong className="text-[#39FF14]">CLICK</strong> on a shape to view project details.</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProjectsPage