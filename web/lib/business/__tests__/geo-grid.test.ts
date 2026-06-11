import { describe, it, expect } from 'vitest'
import { gridPoints } from '../geo-grid'

const SAN_ANTONIO = { lat: 29.4252, lng: -98.4946 }

describe('gridPoints', () => {
  it('returns just the center when rings is 0', () => {
    const pts = gridPoints(SAN_ANTONIO.lat, SAN_ANTONIO.lng, 0, 8000)
    expect(pts).toEqual([{ lat: SAN_ANTONIO.lat, lng: SAN_ANTONIO.lng }])
  })

  it('returns the center for non-positive rings or step', () => {
    expect(gridPoints(SAN_ANTONIO.lat, SAN_ANTONIO.lng, -1, 8000)).toHaveLength(1)
    expect(gridPoints(SAN_ANTONIO.lat, SAN_ANTONIO.lng, 2, 0)).toHaveLength(1)
  })

  it('produces a 3x3 grid for rings = 1', () => {
    expect(gridPoints(SAN_ANTONIO.lat, SAN_ANTONIO.lng, 1, 8000)).toHaveLength(9)
  })

  it('produces a 5x5 grid for rings = 2', () => {
    expect(gridPoints(SAN_ANTONIO.lat, SAN_ANTONIO.lng, 2, 8000)).toHaveLength(25)
  })

  it('includes the exact center point in the grid', () => {
    const pts = gridPoints(SAN_ANTONIO.lat, SAN_ANTONIO.lng, 1, 8000)
    const center = pts.find(
      (p) => Math.abs(p.lat - SAN_ANTONIO.lat) < 1e-9 && Math.abs(p.lng - SAN_ANTONIO.lng) < 1e-9
    )
    expect(center).toBeDefined()
  })

  it('spaces latitude rows by ~stepMeters', () => {
    const step = 8000
    const pts = gridPoints(SAN_ANTONIO.lat, SAN_ANTONIO.lng, 1, step)
    const lats = [...new Set(pts.map((p) => Math.round(p.lat * 1e6) / 1e6))].sort((a, b) => a - b)
    const deltaMeters = (lats[1] - lats[0]) * 111_000
    expect(deltaMeters).toBeGreaterThan(step * 0.95)
    expect(deltaMeters).toBeLessThan(step * 1.05)
  })

  it('widens longitude spacing to stay square away from the equator', () => {
    // At ~29°N, cos(lat) ≈ 0.87, so the longitude step in degrees must exceed
    // the latitude step in degrees to cover the same real-world distance.
    const pts = gridPoints(SAN_ANTONIO.lat, SAN_ANTONIO.lng, 1, 8000)
    const lats = [...new Set(pts.map((p) => p.lat))].sort((a, b) => a - b)
    const lngs = [...new Set(pts.map((p) => p.lng))].sort((a, b) => a - b)
    const dLat = lats[1] - lats[0]
    const dLng = lngs[1] - lngs[0]
    expect(dLng).toBeGreaterThan(dLat)
  })
})
