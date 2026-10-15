'use client'

import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function ShootingStar({ onComplete }) {
  const ref = useRef()
  const [startPosition, endPosition] = useMemo(() => {
    const start = new THREE.Vector3(
      -15, // Start further left
      Math.random() * 20 - 10,
      Math.random() * 10 - 20
    )
    const end = new THREE.Vector3(
      15, // End further right
      start.y - Math.random() * 5, // Slight downward trajectory
      start.z + Math.random() * 5
    )
    return [start, end]
  }, [])

  const curve = useMemo(() => {
    return new THREE.QuadraticBezierCurve3(
      startPosition,
      new THREE.Vector3(
        (startPosition.x + endPosition.x) / 2,
        (startPosition.y + endPosition.y) / 2,
        (startPosition.z + endPosition.z) / 2 + 2
      ),
      endPosition
    )
  }, [startPosition, endPosition])

  const points = useMemo(() => curve.getPoints(200), [curve])

  const geometry = useMemo(() => {
    const positions = new Float32Array(points.length * 3)
    const colors = new Float32Array(points.length * 3)
    points.forEach((point, i) => {
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = point.z
      const color = new THREE.Color(0xffffff)
      color.setHSL(0.6, 1, 0.9)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [points])

  const [progress, setProgress] = React.useState(0)
  const duration = 6 // Increased duration for smoother animation

  useFrame((state, delta) => {
    setProgress((prev) => {
      const newProgress = prev + delta / duration
      if (newProgress >= 1) {
        onComplete()
        return 0
      }
      return newProgress
    })
  })

  useEffect(() => {
    if (ref.current) {
      const colors = ref.current.geometry.attributes.color.array
      const easedProgress = easeInOutCubic(progress)
      
      for (let i = 0; i < points.length; i++) {
        const t = i / (points.length - 1)
        const distanceFromHead = Math.abs(easedProgress - t)
        const tailLength = 0.3 // Adjust this value to change the length of the tail
        
        let opacity = Math.max(0, 1 - distanceFromHead / tailLength)
        opacity *= Math.sin(progress * Math.PI) // This creates the fade-in and fade-out effect
        
        colors[i * 3] = opacity
        colors[i * 3 + 1] = opacity
        colors[i * 3 + 2] = opacity
      }
      ref.current.geometry.attributes.color.needsUpdate = true
    }
  }, [progress, points])

  return (
    <line ref={ref} geometry={geometry}>
      <lineBasicMaterial attach="material" vertexColors={true} linewidth={2} transparent={true} />
    </line>
  )
}

export default ShootingStar