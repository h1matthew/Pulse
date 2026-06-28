import { describe, it, expect } from 'vitest'
import { centeredBounds, MIN_HALF_SPAN_DEG } from '../mapBounds'

const SAN_ANTONIO: [number, number] = [29.4252, -98.4946]

/** Midpoint of a [[s,w],[n,e]] bounds box. */
function midpoint(b: [[number, number], [number, number]]): [number, number] {
  return [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2]
}

describe('centeredBounds', () => {
  it('keeps the center as the exact midpoint even when businesses lean one way', () => {
    // All businesses sit to the SOUTHWEST of the user — the exact scenario that
    // previously pushed the "you are here" dot into the top-right corner.
    const points = [
      { latitude: 29.40, longitude: -98.55 },
      { latitude: 29.38, longitude: -98.60 },
      { latitude: 29.41, longitude: -98.52 },
    ]
    const bounds = centeredBounds(SAN_ANTONIO, points)
    const mid = midpoint(bounds)
    expect(mid[0]).toBeCloseTo(SAN_ANTONIO[0], 10)
    expect(mid[1]).toBeCloseTo(SAN_ANTONIO[1], 10)
  })

  it('encloses every business point', () => {
    const points = [
      { latitude: 29.50, longitude: -98.40 },
      { latitude: 29.35, longitude: -98.60 },
    ]
    const [[south, west], [north, east]] = centeredBounds(SAN_ANTONIO, points)
    for (const p of points) {
      expect(p.latitude).toBeGreaterThanOrEqual(south)
      expect(p.latitude).toBeLessThanOrEqual(north)
      expect(p.longitude).toBeGreaterThanOrEqual(west)
      expect(p.longitude).toBeLessThanOrEqual(east)
    }
  })

  it('applies the minimum half-span so a single nearby business does not over-zoom', () => {
    const points = [{ latitude: 29.4253, longitude: -98.4947 }] // ~15m away
    const [[south, west], [north, east]] = centeredBounds(SAN_ANTONIO, points)
    expect(north - SAN_ANTONIO[0]).toBeCloseTo(MIN_HALF_SPAN_DEG, 10)
    expect(SAN_ANTONIO[0] - south).toBeCloseTo(MIN_HALF_SPAN_DEG, 10)
    expect(east - SAN_ANTONIO[1]).toBeCloseTo(MIN_HALF_SPAN_DEG, 10)
    expect(SAN_ANTONIO[1] - west).toBeCloseTo(MIN_HALF_SPAN_DEG, 10)
  })

  it('ignores points with null coordinates', () => {
    const points = [
      { latitude: null, longitude: null },
      { latitude: 29.60, longitude: -98.30 },
    ]
    const bounds = centeredBounds(SAN_ANTONIO, points)
    const mid = midpoint(bounds)
    // Still centered, and the real point is enclosed.
    expect(mid[0]).toBeCloseTo(SAN_ANTONIO[0], 10)
    expect(bounds[1][0]).toBeGreaterThanOrEqual(29.60)
    expect(bounds[1][1]).toBeGreaterThanOrEqual(-98.30)
  })

  it('falls back to the minimum span when there are no points', () => {
    const [[south, west], [north, east]] = centeredBounds(SAN_ANTONIO, [])
    expect(north - south).toBeCloseTo(2 * MIN_HALF_SPAN_DEG, 10)
    expect(east - west).toBeCloseTo(2 * MIN_HALF_SPAN_DEG, 10)
  })
})
