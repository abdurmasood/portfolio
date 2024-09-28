import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import Moon from './Moon'
import ShootingStar from './ShootingStar'

function RandomPoints() {
  const ref = useRef(null)
  const positions = useMemo(() => {
    const p = new Float32Array(5000 * 3)
    for (let i = 0; i < p.length; i += 3) {
      p[i] = (Math.random() - 0.5) * 20  // Increased range
      p[i + 1] = (Math.random() - 0.5) * 20
      p[i + 2] = (Math.random() - 0.5) * 20
    }
    return p
  }, [])

  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / 10
    ref.current.rotation.y -= delta / 15
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#FFFFFF"  
        size={0.05}  
        sizeAttenuation={true}
        depthWrite={true} 
      />
    </Points>
  )
}

function Background3D() {
  const [showShootingStar, setShowShootingStar] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setShowShootingStar(true)
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleShootingStarComplete = () => {
    setShowShootingStar(false)
  }

  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>  // Moved camera back and increased FOV
        <color attach="background" args={['#000000']} />  // Set black background
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <RandomPoints />
        <Moon position={[8, 3, -10]} size={4.5} />
        {showShootingStar && <ShootingStar onComplete={handleShootingStarComplete} />}
      </Canvas>
    </div>
  )
}

export default Background3D