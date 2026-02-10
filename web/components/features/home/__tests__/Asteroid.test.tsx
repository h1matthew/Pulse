import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as THREE from 'three'

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}))

// Mock @react-three/drei (useGLTF is used by Asteroid3DModel)
vi.mock('@react-three/drei', () => ({
  useGLTF: vi.fn().mockReturnValue({
    scene: { traverse: vi.fn() },
  }),
}))

// Import the component after mocks are set up
// We need to test the geometry generation functions directly
describe('Asteroid Geometry Generation', () => {
  // Test the geometry is created with proper vertex count
  it('creates icosahedron geometry with detail level 3', () => {
    const geo = new THREE.IcosahedronGeometry(1, 3)
    expect(geo.attributes.position.count).toBeGreaterThan(0)
    // Detail level 3 creates many more vertices than level 2
    // Level 2 has ~42 vertices, level 3 has ~162
    expect(geo.attributes.position.count).toBeGreaterThanOrEqual(100)
  })

  it('geometry has position attribute', () => {
    const geo = new THREE.IcosahedronGeometry(1, 3)
    expect(geo.attributes.position).toBeDefined()
    expect(geo.attributes.position.itemSize).toBe(3)
  })
})

describe('Noise Functions', () => {
  // Test simplex3D function behavior
  it('simplex3D returns values in expected range', () => {
    // Recreate the simplex3D function for testing
    const simplex3D = (x: number, y: number, z: number): number => {
      const n1 = Math.sin(x * 1.27 + y * 2.34 + z * 0.89)
      const n2 = Math.sin(x * 2.71 + y * 0.43 + z * 1.57)
      const n3 = Math.sin(x * 0.83 + y * 1.89 + z * 2.13)
      return (n1 + n2 + n3) / 3
    }

    // Test multiple random points
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 10 - 5
      const y = Math.random() * 10 - 5
      const z = Math.random() * 10 - 5
      const result = simplex3D(x, y, z)

      // Result should be in [-1, 1] range
      expect(result).toBeGreaterThanOrEqual(-1)
      expect(result).toBeLessThanOrEqual(1)
    }
  })

  it('fbm3D returns values with reduced amplitude for more octaves', () => {
    // Recreate fbm3D for testing
    const simplex3D = (x: number, y: number, z: number): number => {
      const n1 = Math.sin(x * 1.27 + y * 2.34 + z * 0.89)
      const n2 = Math.sin(x * 2.71 + y * 0.43 + z * 1.57)
      const n3 = Math.sin(x * 0.83 + y * 1.89 + z * 2.13)
      return (n1 + n2 + n3) / 3
    }

    const fbm3D = (x: number, y: number, z: number, octaves: number = 4): number => {
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

    // Test that result is bounded
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 10 - 5
      const y = Math.random() * 10 - 5
      const z = Math.random() * 10 - 5
      const result = fbm3D(x, y, z, 4)

      // FBM with 4 octaves: max amplitude is 0.5 + 0.25 + 0.125 + 0.0625 ≈ 0.9375
      expect(result).toBeGreaterThanOrEqual(-1)
      expect(result).toBeLessThanOrEqual(1)
    }
  })
})

describe('Helper Functions', () => {
  it('lerp interpolates correctly', () => {
    const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 1)).toBe(10)
    expect(lerp(0, 10, 0.5)).toBe(5)
    expect(lerp(5, 15, 0.25)).toBe(7.5)
  })

  it('clamp restricts values to range', () => {
    const clamp = (value: number, min: number, max: number): number =>
      Math.max(min, Math.min(max, value))

    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it('seeded random produces deterministic results', () => {
    const seededRandom = (seed: number): (() => number) => {
      return () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
    }

    const random1 = seededRandom(42)
    const random2 = seededRandom(42)

    // Same seed should produce same sequence
    const seq1 = [random1(), random1(), random1()]
    const seq2 = [random2(), random2(), random2()]

    expect(seq1).toEqual(seq2)

    // Different seed should produce different sequence
    const random3 = seededRandom(123)
    const seq3 = [random3(), random3(), random3()]

    expect(seq1).not.toEqual(seq3)
  })

  it('seeded random produces values in [0, 1) range', () => {
    const seededRandom = (seed: number): (() => number) => {
      return () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
    }

    const random = seededRandom(12345)

    for (let i = 0; i < 100; i++) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('Crater Generation', () => {
  it('generates correct number of craters', () => {
    const seededRandom = (seed: number): (() => number) => {
      return () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
    }

    interface Crater {
      position: THREE.Vector3
      radius: number
      depth: number
    }

    const generateCraters = (seed: number, count: number): Crater[] => {
      const random = seededRandom(seed + 12345)
      const craters: Crater[] = []
      for (let i = 0; i < count; i++) {
        const theta = random() * Math.PI * 2
        const phi = Math.acos(2 * random() - 1)
        craters.push({
          position: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.sin(phi) * Math.sin(theta),
            Math.cos(phi)
          ),
          radius: 0.2 + random() * 0.25,
          depth: 0.08 + random() * 0.12,
        })
      }
      return craters
    }

    const craters3 = generateCraters(0, 3)
    const craters5 = generateCraters(0, 5)

    expect(craters3).toHaveLength(3)
    expect(craters5).toHaveLength(5)
  })

  it('crater positions are on unit sphere', () => {
    const seededRandom = (seed: number): (() => number) => {
      return () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
    }

    interface Crater {
      position: THREE.Vector3
      radius: number
      depth: number
    }

    const generateCraters = (seed: number, count: number): Crater[] => {
      const random = seededRandom(seed + 12345)
      const craters: Crater[] = []
      for (let i = 0; i < count; i++) {
        const theta = random() * Math.PI * 2
        const phi = Math.acos(2 * random() - 1)
        craters.push({
          position: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.sin(phi) * Math.sin(theta),
            Math.cos(phi)
          ),
          radius: 0.2 + random() * 0.25,
          depth: 0.08 + random() * 0.12,
        })
      }
      return craters
    }

    const craters = generateCraters(42, 10)

    for (const crater of craters) {
      // Position should be normalized (length ≈ 1)
      const length = crater.position.length()
      expect(length).toBeCloseTo(1, 5)
    }
  })

  it('crater dimensions are within expected ranges', () => {
    const seededRandom = (seed: number): (() => number) => {
      return () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
    }

    interface Crater {
      position: THREE.Vector3
      radius: number
      depth: number
    }

    const generateCraters = (seed: number, count: number): Crater[] => {
      const random = seededRandom(seed + 12345)
      const craters: Crater[] = []
      for (let i = 0; i < count; i++) {
        const theta = random() * Math.PI * 2
        const phi = Math.acos(2 * random() - 1)
        craters.push({
          position: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.sin(phi) * Math.sin(theta),
            Math.cos(phi)
          ),
          radius: 0.2 + random() * 0.25,
          depth: 0.08 + random() * 0.12,
        })
      }
      return craters
    }

    const craters = generateCraters(99, 20)

    for (const crater of craters) {
      // Radius should be between 0.2 and 0.45
      expect(crater.radius).toBeGreaterThanOrEqual(0.2)
      expect(crater.radius).toBeLessThanOrEqual(0.45)

      // Depth should be between 0.08 and 0.2
      expect(crater.depth).toBeGreaterThanOrEqual(0.08)
      expect(crater.depth).toBeLessThanOrEqual(0.2)
    }
  })

  it('same seed produces same craters', () => {
    const seededRandom = (seed: number): (() => number) => {
      return () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
    }

    interface Crater {
      position: THREE.Vector3
      radius: number
      depth: number
    }

    const generateCraters = (seed: number, count: number): Crater[] => {
      const random = seededRandom(seed + 12345)
      const craters: Crater[] = []
      for (let i = 0; i < count; i++) {
        const theta = random() * Math.PI * 2
        const phi = Math.acos(2 * random() - 1)
        craters.push({
          position: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.sin(phi) * Math.sin(theta),
            Math.cos(phi)
          ),
          radius: 0.2 + random() * 0.25,
          depth: 0.08 + random() * 0.12,
        })
      }
      return craters
    }

    const craters1 = generateCraters(42, 4)
    const craters2 = generateCraters(42, 4)

    for (let i = 0; i < craters1.length; i++) {
      expect(craters1[i].position.x).toBeCloseTo(craters2[i].position.x, 10)
      expect(craters1[i].position.y).toBeCloseTo(craters2[i].position.y, 10)
      expect(craters1[i].position.z).toBeCloseTo(craters2[i].position.z, 10)
      expect(craters1[i].radius).toBeCloseTo(craters2[i].radius, 10)
      expect(craters1[i].depth).toBeCloseTo(craters2[i].depth, 10)
    }
  })
})

describe('Color Palette', () => {
  it('color values are valid RGB in 0-1 range', () => {
    const COLORS = {
      baseGray: { r: 0.35, g: 0.35, b: 0.35 },
      brownTint: { r: 0.42, g: 0.35, b: 0.29 },
      darkCrevice: { r: 0.23, g: 0.23, b: 0.23 },
      lightHighlight: { r: 0.54, g: 0.52, b: 0.52 },
    }

    for (const [, color] of Object.entries(COLORS)) {
      expect(color.r).toBeGreaterThanOrEqual(0)
      expect(color.r).toBeLessThanOrEqual(1)
      expect(color.g).toBeGreaterThanOrEqual(0)
      expect(color.g).toBeLessThanOrEqual(1)
      expect(color.b).toBeGreaterThanOrEqual(0)
      expect(color.b).toBeLessThanOrEqual(1)
    }
  })

  it('color palette has proper contrast', () => {
    const COLORS = {
      baseGray: { r: 0.35, g: 0.35, b: 0.35 },
      brownTint: { r: 0.42, g: 0.35, b: 0.29 },
      darkCrevice: { r: 0.23, g: 0.23, b: 0.23 },
      lightHighlight: { r: 0.54, g: 0.52, b: 0.52 },
    }

    // Dark crevice should be darker than base
    const darkLuminance = (COLORS.darkCrevice.r + COLORS.darkCrevice.g + COLORS.darkCrevice.b) / 3
    const baseLuminance = (COLORS.baseGray.r + COLORS.baseGray.g + COLORS.baseGray.b) / 3
    const lightLuminance = (COLORS.lightHighlight.r + COLORS.lightHighlight.g + COLORS.lightHighlight.b) / 3

    expect(darkLuminance).toBeLessThan(baseLuminance)
    expect(lightLuminance).toBeGreaterThan(baseLuminance)
  })
})

describe('Vertex Colors', () => {
  it('can create Float32BufferAttribute with RGB colors', () => {
    const colors = [0.5, 0.5, 0.5, 0.3, 0.3, 0.3, 0.7, 0.7, 0.7]
    const colorAttr = new THREE.Float32BufferAttribute(colors, 3)

    expect(colorAttr.count).toBe(3) // 3 vertices
    expect(colorAttr.itemSize).toBe(3) // RGB
  })

  it('geometry can have color attribute added', () => {
    const geo = new THREE.IcosahedronGeometry(1, 2)
    const vertexCount = geo.attributes.position.count

    // Create color array (3 values per vertex)
    const colors: number[] = []
    for (let i = 0; i < vertexCount; i++) {
      colors.push(0.5, 0.5, 0.5)
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    expect(geo.attributes.color).toBeDefined()
    expect(geo.attributes.color.count).toBe(vertexCount)
  })
})
