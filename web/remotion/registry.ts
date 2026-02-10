import { ComponentType } from 'react'

// Video compositions are now stored in the database and loaded dynamically
// This registry will be populated at runtime from database content

export interface CompositionMeta {
  id: string
  component: ComponentType
  width: number
  height: number
  fps: number
  durationInFrames: number
}

// Empty registry - compositions will be loaded from database
export const COMPOSITION_REGISTRY: Record<string, CompositionMeta> = {}

export function getComposition(id: string): CompositionMeta | undefined {
  return COMPOSITION_REGISTRY[id]
}

export function registerComposition(meta: CompositionMeta): void {
  COMPOSITION_REGISTRY[meta.id] = meta
}
