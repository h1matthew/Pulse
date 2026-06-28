// ============================================================================
// Discover map bounds helper
// ============================================================================
// The /discover map must keep the user's "you are here" dot centered while the
// surrounding businesses fan out around it. The earlier approach fit the map to
// the business cloud's own bounds, which shoved the dot into a corner whenever
// the results leaned to one side (e.g. denser toward downtown). Instead we frame
// a box centered exactly on the user, sized to reach the farthest business.

// Smallest half-span (in degrees) the auto-fit will use, so a single nearby
// business doesn't zoom the map down to street level. ~0.02° ≈ 1.4 mi.
export const MIN_HALF_SPAN_DEG = 0.02

export interface LatLngPoint {
  latitude: number | null
  longitude: number | null
}

/**
 * Build a lat/lng box centered exactly on `center` that encloses every point.
 * Because the box is symmetric, `center` is always its midpoint — so fitting the
 * map to these bounds keeps the user's location dead-center with businesses
 * arranged around it.
 *
 * @param center     [lat, lng] of the user / search location
 * @param points     businesses (rows with possibly-null coords are ignored)
 * @param minHalfSpan minimum half-width/height in degrees (prevents over-zoom)
 * @returns [[south, west], [north, east]]
 */
export function centeredBounds(
  center: [number, number],
  points: LatLngPoint[],
  minHalfSpan: number = MIN_HALF_SPAN_DEG,
): [[number, number], [number, number]] {
  let halfLat = minHalfSpan
  let halfLng = minHalfSpan
  for (const p of points) {
    if (p.latitude == null || p.longitude == null) continue
    halfLat = Math.max(halfLat, Math.abs(p.latitude - center[0]))
    halfLng = Math.max(halfLng, Math.abs(p.longitude - center[1]))
  }
  return [
    [center[0] - halfLat, center[1] - halfLng],
    [center[0] + halfLat, center[1] + halfLng],
  ]
}
