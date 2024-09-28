import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
// import * as THREE from 'three'

function RandomPoints() {
  const ref = useRef(null)
  const positions = useMemo(() => {
    const p = new Float32Array(5000 * 3)
    for (let i = 0; i < p.length; i += 3) {
      p[i] = (Math.random() - 0.5) * 10
      p[i + 1] = (Math.random() - 0.5) * 10
      p[i + 2] = (Math.random() - 0.5) * 10
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
        color="#4ADE80"
        size={0.01}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  )
}

function Background3D() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <RandomPoints />
      </Canvas>
    </div>
  )
}

export default Background3D