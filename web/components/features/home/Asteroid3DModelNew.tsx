'use client'

import '@/lib/three-patches'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Attribution: "Asteroid Pack 01" by Renzo Booker (CC BY 4.0)
 * https://sketchfab.com/3d-models/asteroid-pack-01-d79d1307218f405fa9b34b8336265057
 */

// Single model file containing all 6 asteroids as separate meshes
const MODEL_PATH = '/models/asteroids/asteroid_pack_01.glb'

// Preload the asteroid pack model
useGLTF.preload(MODEL_PATH)

interface Asteroid3DModelProps {
  position: [number, number, number]
  scale?: number
  rotationSpeed?: number
  asteroidOpacity?: number
  seed?: number
}

export function Asteroid3DModel({
  position,
  scale = 1,
  rotationSpeed = 0.2,
  asteroidOpacity = 1,
  seed = 0,
}: Asteroid3DModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Group>(null)

  const { scene } = useGLTF(MODEL_PATH)

  // Find all asteroid meshes in the scene and select one based on seed
  const clonedMesh = useMemo(() => {
    const meshes: THREE.Mesh[] = []
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child)
      }
    })

    if (meshes.length === 0) return null

    // Select mesh based on seed (deterministic)
    const index = Math.abs(Math.floor(seed)) % meshes.length
    const selectedMesh = meshes[index]

    // Clone the mesh to avoid mutation issues
    const cloned = selectedMesh.clone()

    // Clone and update material for consistent appearance
    if (cloned.material) {
      const originalMaterial = cloned.material as THREE.MeshStandardMaterial
      const newMaterial = originalMaterial.clone()

      // Apply consistent asteroid material properties
      newMaterial.roughness = 0.9
      newMaterial.metalness = 0.05
      newMaterial.transparent = true
      newMaterial.opacity = asteroidOpacity

      cloned.material = newMaterial
    }

    // Center the geometry based on its bounding box
    // The mesh vertices may be offset from origin in the original model
    if (cloned.geometry) {
      cloned.geometry.computeBoundingBox()
      const boundingBox = cloned.geometry.boundingBox
      if (boundingBox) {
        const center = new THREE.Vector3()
        boundingBox.getCenter(center)
        // Translate geometry so its center is at origin
        cloned.geometry.translate(-center.x, -center.y, -center.z)
      }
    }

    // Reset the mesh position to origin
    cloned.position.set(0, 0, 0)

    return cloned
  }, [scene, asteroidOpacity, seed])

  // Rotation and wobble animation
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * rotationSpeed * 0.5
      meshRef.current.rotation.y += delta * rotationSpeed * 0.7
      meshRef.current.rotation.z += delta * rotationSpeed * 0.3
    }
    // Add gentle wobble to the whole group
    if (groupRef.current) {
      const time = state.clock.elapsedTime
      groupRef.current.position.x = position[0] + Math.sin(time * 0.8 + position[1]) * 0.15
      groupRef.current.position.y = position[1] + Math.cos(time * 0.6 + position[0]) * 0.1
    }
  })

  // Don't render if no mesh found
  if (!clonedMesh) return null

  return (
    <group ref={groupRef} position={position}>
      <group ref={meshRef} scale={scale}>
        <primitive object={clonedMesh} />
      </group>
    </group>
  )
}
