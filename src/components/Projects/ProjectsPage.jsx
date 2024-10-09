import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Float, Html } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import TerminalIcon from './../Terminal/TerminalIcon'  // Assuming you've saved the TerminalIcon component in a separate file
import { useNavigate } from 'react-router-dom';

const projects = [
  { id: 1, title: "about", description: "About Abdur Rafey Masood" },
  { id: 2, title: "education", description: "Education background" },
  { id: 3, title: "experience", description: "Work experience" },
  { id: 4, title: "projects", description: "Projects he's worked on" },
  { id: 5, title: "origins", description: "Where he was born & raised" },
  { id: 6, title: "music", description: "Rafey's journey as a producer/artist" },
  { id: 7, title: "help", description: "Display all the commands" },
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
  const [hovered, setHovered] = useState(false)
  const [scale, setScale] = useState(1)

  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry])

  const handlePointerOver = useCallback(() => setHovered(true), [])
  const handlePointerOut = useCallback(() => setHovered(false), [])
  const handleClick = useCallback(() => {
    if (isActive) {
      onClosePopup()
    } else {
      onProjectClick(project)
    }
  }, [isActive, onClosePopup, onProjectClick, project])

  const randomOffset = useMemo(() => Math.random() * 10, [])
  const randomAmplitude = useMemo(() => Math.random() * 0.07 + 0.03, [])
  const randomFrequency = useMemo(() => Math.random() * 1 + 1, [])

  useEffect(() => {
    let frameId
    const animateScale = () => {
      setScale(current => {
        const target = hovered ? 1.2 : 1
        const newScale = current + (target - current) * 0.1
        if (Math.abs(newScale - target) < 0.001) return target
        frameId = requestAnimationFrame(animateScale)
        return newScale
      })
    }
    frameId = requestAnimationFrame(animateScale)
    return () => cancelAnimationFrame(frameId)
  }, [hovered])

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2
      meshRef.current.rotation.y += delta * 0.2
      meshRef.current.scale.setScalar(scale * opacity)
    }
    if (textRef.current) {
      textRef.current.position.y = -1.7 + Math.sin((state.clock.elapsedTime + randomOffset) * randomFrequency) * randomAmplitude
      textRef.current.scale.setScalar(opacity)
    }
  })

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
            <meshBasicMaterial color={hovered ? '#39FF14' : '#FFFFFF'} wireframe />
          </mesh>
          <lineSegments geometry={edgesGeometry}>
            <lineBasicMaterial color={hovered ? '#39FF14' : '#FFFFFF'} />
          </lineSegments>
        </group>
        <group ref={textRef} position={[0, -1.7, 0]}>
          <Text
            fontSize={0.45}
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
          <Html position={[0, 2, 0]}>
            <div className="popup-container">
              <div 
                className="popup-content bg-black bg-opacity-75 text-white p-4 rounded-md shadow-lg relative"
                style={{
                  width: '200px',
                  animation: 'easeIn 0.3s ease-out',
                  animationFillMode: 'forwards'
                }}
              >
                <button 
                  onClick={onClosePopup}
                  className="absolute top-2 right-4 text-white hover:text-gray-300 bg-transparent border-none cursor-pointer text-lg focus:outline-none"
                  style={{ lineHeight: 1 }}
                >
                  ✕
                </button>
                <h3 className="text-lg font-bold mb-2">{project.title}</h3>
                <p className="text-sm">{project.description}</p>
              </div>
              <div className="popup-arrow"></div>
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

  useEffect(() => {
    const handleWheel = (event) => {
      if (controlsRef.current) {
        const moveSpeed = 0.5
        const direction = new THREE.Vector3()
        camera.getWorldDirection(direction)
        
        if (event.deltaY > 0) {
          // Move backward
          camera.position.addScaledVector(direction, -moveSpeed)
        } else {
          // Move forward
          camera.position.addScaledVector(direction, moveSpeed)
        }
      }
    }

    gl.domElement.addEventListener('wheel', handleWheel)

    return () => {
      gl.domElement.removeEventListener('wheel', handleWheel)
    }
  }, [camera, gl])

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enableRotate={true}
      enablePan={true}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
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
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(false)
  const [activeProject, setActiveProject] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)

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
    // Navigate to the home page
    // If you're using React Router, you might do something like:
    navigate('/');
    // console.log('Navigating to home page')
  }, [])


  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 100) // Small delay to ensure smooth transition

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault()
    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [])

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
            <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
              <Scene 
                onProjectClick={handleProjectClick} 
                activeProject={activeProject}
                onClosePopup={handleClosePopup}
              />
            </Canvas>
          </motion.div>
        )}
      </AnimatePresence>

      <TerminalIcon onClick={handleTerminalClick} />

      <AnimatePresence>
        {isLoaded && (
          <motion.button
            key="instructions-button"
            className="absolute bottom-4 left-4 bg-white text-black px-3 py-1 rounded-md text-sm hover:bg-gray-200 transition-colors"
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
            className="absolute bottom-16 left-4 bg-black bg-opacity-75 p-4 rounded-md max-w-xs"
            variants={instructionsVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <ul className="list-disc pl-5 space-y-2">
              <li className="text-sm"><strong className="text-[#39FF14]">LEFT-CLICK</strong> and <strong className="text-[#39FF14]">DRAG</strong> to rotate the view.</li>
              <li className="text-sm"><strong className="text-[#39FF14]">RIGHT-CLICK</strong> and <strong className="text-[#39FF14]">DRAG</strong> to move the camera sideways.</li>
              <li className="text-sm"><strong className="text-[#39FF14]">SCROLL</strong> to move forward and backward.</li>
              <li className="text-sm"><strong className="text-[#39FF14]">CLICK</strong> on a shape to view project details.</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProjectsPage