import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'

function Moon({ position, size = 1 }) {
  const moonRef = useRef()
  const moonTextureUrl = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/17271/lroc_color_poles_1k.jpg' 

  useFrame((state, delta) => {
    moonRef.current.rotation.y += delta * 0.11
  })

  return (
    <Sphere ref={moonRef} args={[size, 32, 32]} position={position}>
      <meshStandardMaterial
        map={new THREE.TextureLoader().load(moonTextureUrl)}
        bumpMap={new THREE.TextureLoader().load(moonTextureUrl)}
        bumpScale={0.04}
      />
    </Sphere>
  )
}

export default Moon