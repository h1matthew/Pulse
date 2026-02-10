'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface Rocket3DModelProps {
  scrollProgress: number
  rocketY: number
}

export function Rocket3DModel({ scrollProgress, rocketY }: Rocket3DModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/rocket.glb')

  // Clone scene to avoid mutation issues with cached GLTF
  // Keep original materials to preserve the model's colors/textures
  const clonedScene = useMemo(() => {
    return scene.clone()
  }, [scene])

  // Subtle bobbing animation
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime
      groupRef.current.position.x = Math.sin(time * 0.6) * 0.1
      groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.03
    }
  })

  return (
    <group ref={groupRef} position={[0, rocketY, 0]}>
      <primitive
        object={clonedScene}
        scale={0.0022}
        // Model native orientation is nose up, engine down
        // No X rotation needed; Y rotation shows side profile if needed
        rotation={[0, 0, 0]}
      />
      <ExhaustParticles />
    </group>
  )
}

function ExhaustParticles() {
  const particlesRef = useRef<THREE.Points>(null)
  const particleCount = 60

  const { geometry, velocities, lifetimes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const vels: THREE.Vector3[] = []
    const lifes: number[] = []

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      vels.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.015,
        -0.03 - Math.random() * 0.04,
        (Math.random() - 0.5) * 0.015
      ))
      lifes.push(Math.random())
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    return { geometry: geo, velocities: vels, lifetimes: lifes }
  }, [])

  useFrame(() => {
    if (!particlesRef.current) return
    const positionAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = positionAttr.array as Float32Array

    for (let i = 0; i < particleCount; i++) {
      lifetimes[i] += 0.02

      if (lifetimes[i] >= 1) {
        lifetimes[i] = 0
        arr[i * 3] = (Math.random() - 0.5) * 0.15
        arr[i * 3 + 1] = -0.8 + (Math.random() - 0.5) * 0.1
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.15
      } else {
        arr[i * 3] += velocities[i].x
        arr[i * 3 + 1] += velocities[i].y
        arr[i * 3 + 2] += velocities[i].z
      }
    }

    positionAttr.needsUpdate = true
  })

  return (
    <points ref={particlesRef} geometry={geometry} position={[0, 0, 0]}>
      <pointsMaterial
        size={0.1}
        color="#ff6b35"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
