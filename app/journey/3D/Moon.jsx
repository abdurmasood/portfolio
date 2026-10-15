'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'

function Moon({ position, size = 1 }) {
  const moonRef = useRef()
  const rotationSpeedRef = useRef(5) // Start with a high speed
  const [moonTexture, setMoonTexture] = useState(null)
  const [bumpTexture, setBumpTexture] = useState(null)
  const moonTextureUrl = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/17271/lroc_color_poles_1k.jpg'

  useEffect(() => {
    const textureLoader = new THREE.TextureLoader()
    
    textureLoader.load(
      moonTextureUrl,
      (texture) => {
        setMoonTexture(texture)
        setBumpTexture(texture) // Using the same texture for bump map
      },
      undefined,
      (error) => console.error('An error occurred loading the moon texture:', error)
    )
  }, [moonTextureUrl])

  useFrame((state, delta) => {
    if (moonRef.current) {
      // Apply rotation
      moonRef.current.rotation.y += delta * rotationSpeedRef.current

      // Gradually decrease rotation speed
      if (rotationSpeedRef.current > 0.1) { // Final steady rotation speed
        rotationSpeedRef.current *= 0.99 // Decrease by 1% each frame
      } else {
        rotationSpeedRef.current = 0.1 // Set to final speed
      }
    }
  })

  if (!moonTexture || !bumpTexture) {
    return null // or return a loading placeholder
  }

  return (
    <Sphere ref={moonRef} args={[size, 32, 32]} position={position}>
      <meshStandardMaterial
        map={moonTexture}
        bumpMap={bumpTexture}
        bumpScale={0.04}
      />
    </Sphere>
  )
}

export default Moon