'use client'

import { Suspense, lazy, useState, useEffect } from 'react'
import { AsteroidProcedural } from './AsteroidProcedural'

// Lazy load Asteroid3DModel - this prevents useGLTF.preload() from running
// until we confirm the models actually exist
const Asteroid3DModel = lazy(() => import('./Asteroid3DModelNew').then(mod => ({ default: mod.Asteroid3DModel })))

// Global cache for model availability check - only check once per session
let modelsCheckPromise: Promise<boolean> | null = null
let modelsAvailable: boolean | null = null

function checkModelsAvailable(): Promise<boolean> {
  // Return cached result if already checked
  if (modelsAvailable !== null) {
    return Promise.resolve(modelsAvailable)
  }

  // Return existing promise if check is in progress
  if (modelsCheckPromise) {
    return modelsCheckPromise
  }

  // Start new check - check for the single asteroid pack file
  modelsCheckPromise = fetch('/models/asteroids/asteroid_pack_01.glb', { method: 'HEAD' })
    .then((response) => {
      modelsAvailable = response.ok
      return modelsAvailable
    })
    .catch(() => {
      modelsAvailable = false
      return false
    })

  return modelsCheckPromise
}

interface AsteroidProps {
  position: [number, number, number]
  scale?: number
  rotationSpeed?: number
  asteroidOpacity?: number
  seed?: number
}

/**
 * Asteroid component that renders either a 3D model or procedural fallback.
 *
 * Attribution for 3D models:
 * "Asteroid Pack 01" by Renzo Booker (CC BY 4.0)
 * https://sketchfab.com/3d-models/asteroid-pack-01-d79d1307218f405fa9b34b8336265057
 */
export function Asteroid(props: AsteroidProps) {
  const [use3DModels, setUse3DModels] = useState(modelsAvailable === true)
  const [checked, setChecked] = useState(modelsAvailable !== null)

  useEffect(() => {
    // If already checked, no need to check again
    if (modelsAvailable !== null) {
      setUse3DModels(modelsAvailable)
      setChecked(true)
      return
    }

    // Check once and cache result
    checkModelsAvailable().then((available) => {
      setUse3DModels(available)
      setChecked(true)
    })
  }, [])

  // Only render 3D models if check completed and models are available
  if (checked && use3DModels) {
    return (
      <Suspense fallback={<AsteroidProcedural {...props} />}>
        <Asteroid3DModel {...props} />
      </Suspense>
    )
  }

  // Default to procedural (works before check completes or if models not found)
  return <AsteroidProcedural {...props} />
}

// Re-export types for convenience
export type { AsteroidProps }
