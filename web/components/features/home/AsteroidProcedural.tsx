'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface AsteroidProceduralProps {
  position: [number, number, number]
  scale?: number
  rotationSpeed?: number
  asteroidOpacity?: number
  seed?: number
}

// Color palette for realistic asteroid appearance
const COLORS = {
  baseGray: { r: 0.35, g: 0.35, b: 0.35 },      // #5a5a5a - Base gray
  brownTint: { r: 0.42, g: 0.35, b: 0.29 },     // #6b5a4a - Brown/rust tint
  darkCrevice: { r: 0.23, g: 0.23, b: 0.23 },   // #3a3a3a - Dark crevices
  lightHighlight: { r: 0.54, g: 0.52, b: 0.52 }, // #8a8585 - Light highlights
}

/**
 * Procedural asteroid component - fallback when 3D models aren't available.
 * Uses icosahedron geometry with fractal noise displacement and vertex colors.
 */
export function AsteroidProcedural({
  position,
  scale = 1,
  rotationSpeed = 0.2,
  asteroidOpacity = 1,
  seed = 0,
}: AsteroidProceduralProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)

  // Create rocky asteroid geometry with enhanced noise, colors, and craters
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 3) // Increased detail level
    const positionAttr = geo.attributes.position as THREE.BufferAttribute
    const vertex = new THREE.Vector3()

    // Generate crater positions using seeded random
    const craters = generateCraters(seed, 4)

    // First pass: Apply displacement with fractal noise and craters
    const displacements: number[] = []
    for (let i = 0; i < positionAttr.count; i++) {
      vertex.fromBufferAttribute(positionAttr, i)

      // Normalize to get direction
      const dir = vertex.clone().normalize()

      // Apply fractal noise displacement for rocky look
      const noiseScale = 2 + seed * 0.1
      const noise = fbm3D(
        dir.x * noiseScale + seed,
        dir.y * noiseScale,
        dir.z * noiseScale,
        4
      )

      // Apply crater deformations
      let craterDisplacement = 0
      for (const crater of craters) {
        const dist = dir.distanceTo(crater.position)
        if (dist < crater.radius) {
          // Inside crater - create bowl shape
          const normalizedDist = dist / crater.radius
          // Smooth bowl shape with raised rim
          const bowlDepth = Math.cos(normalizedDist * Math.PI * 0.5) * crater.depth
          const rimHeight = Math.exp(-Math.pow((normalizedDist - 0.85) * 8, 2)) * crater.depth * 0.3
          craterDisplacement -= bowlDepth - rimHeight
        }
      }

      const totalDisplacement = noise * 0.25 + craterDisplacement
      displacements.push(totalDisplacement)
      vertex.multiplyScalar(1 + totalDisplacement)

      positionAttr.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }

    // Second pass: Apply vertex colors based on displacement and noise
    const colors: number[] = []
    for (let i = 0; i < positionAttr.count; i++) {
      vertex.fromBufferAttribute(positionAttr, i)
      const displacement = displacements[i]

      // Color noise for variation
      const colorNoise = fbm3D(
        vertex.x * 3 + seed * 2,
        vertex.y * 3,
        vertex.z * 3,
        2
      )

      // Fine detail noise for small-scale variation
      const fineNoise = simplex3D(
        vertex.x * 8 + seed,
        vertex.y * 8,
        vertex.z * 8
      ) * 0.5 + 0.5

      // Base color influenced by displacement
      // Low areas (negative displacement) are darker, high areas are lighter
      // Mix colors based on height and noise
      let r, g, b

      if (displacement < -0.1) {
        // Dark crevices - darker areas
        const t = Math.min(1, Math.abs(displacement) * 3)
        r = lerp(COLORS.baseGray.r, COLORS.darkCrevice.r, t)
        g = lerp(COLORS.baseGray.g, COLORS.darkCrevice.g, t)
        b = lerp(COLORS.baseGray.b, COLORS.darkCrevice.b, t)
      } else if (displacement > 0.15) {
        // Highlights on peaks - slightly lighter
        const t = Math.min(1, (displacement - 0.15) * 4)
        r = lerp(COLORS.baseGray.r, COLORS.lightHighlight.r, t * 0.5)
        g = lerp(COLORS.baseGray.g, COLORS.lightHighlight.g, t * 0.5)
        b = lerp(COLORS.baseGray.b, COLORS.lightHighlight.b, t * 0.5)
      } else {
        // Mid-range - base with brown tint variation
        r = COLORS.baseGray.r
        g = COLORS.baseGray.g
        b = COLORS.baseGray.b
      }

      // Add brown/rust tint based on noise
      const brownAmount = (colorNoise * 0.5 + 0.5) * 0.3
      r = lerp(r, COLORS.brownTint.r, brownAmount)
      g = lerp(g, COLORS.brownTint.g, brownAmount * 0.7)
      b = lerp(b, COLORS.brownTint.b, brownAmount * 0.5)

      // Add fine detail variation
      const fineVariation = (fineNoise - 0.5) * 0.08
      r = clamp(r + fineVariation, 0, 1)
      g = clamp(g + fineVariation, 0, 1)
      b = clamp(b + fineVariation, 0, 1)

      colors.push(r, g, b)
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [seed])

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

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef} geometry={geometry} scale={scale}>
        <meshStandardMaterial
          vertexColors
          roughness={0.9}
          metalness={0.05}
          flatShading
          transparent
          opacity={asteroidOpacity}
        />
      </mesh>
    </group>
  )
}

// Simple 3D simplex noise approximation
function simplex3D(x: number, y: number, z: number): number {
  // Use a combination of sin waves for pseudo-random noise
  const n1 = Math.sin(x * 1.27 + y * 2.34 + z * 0.89)
  const n2 = Math.sin(x * 2.71 + y * 0.43 + z * 1.57)
  const n3 = Math.sin(x * 0.83 + y * 1.89 + z * 2.13)
  return (n1 + n2 + n3) / 3
}

// Fractal Brownian Motion - layers multiple octaves of noise for natural detail
function fbm3D(x: number, y: number, z: number, octaves: number = 4): number {
  let value = 0
  let amplitude = 0.5
  let frequency = 1

  for (let i = 0; i < octaves; i++) {
    value += amplitude * simplex3D(x * frequency, y * frequency, z * frequency)
    amplitude *= 0.5
    frequency *= 2
  }

  return value
}

// Linear interpolation
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Clamp value between min and max
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// Seeded random number generator
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

// Generate crater positions for asteroid surface
interface Crater {
  position: THREE.Vector3
  radius: number
  depth: number
}

function generateCraters(seed: number, count: number): Crater[] {
  const random = seededRandom(seed + 12345)
  const craters: Crater[] = []

  for (let i = 0; i < count; i++) {
    // Generate random point on unit sphere
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)
    const position = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    )

    craters.push({
      position,
      radius: 0.2 + random() * 0.25, // Vary crater size
      depth: 0.08 + random() * 0.12,  // Vary crater depth
    })
  }

  return craters
}
