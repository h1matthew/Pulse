// ============================================================================
// Geo grid helper
// ============================================================================
// Google Places Nearby Search (v2) returns at most 20 results per call and has
// no pagination, so the only way to densely cover a metro is to issue searches
// from multiple centers. This builds a square grid of search centers around a
// point, which the bulk seed script uses to give priority cities much deeper
// coverage than a single-center search can reach.

export interface GeoPoint {
  lat: number
  lng: number
}

const METERS_PER_DEG_LAT = 111_000

/**
 * Build a square grid of search centers around (lat, lng).
 *
 * - `rings = 0` → just the center point (1 point)
 * - `rings = 1` → a 3×3 grid (9 points)
 * - `rings = 2` → a 5×5 grid (25 points)
 *
 * `stepMeters` is the spacing between adjacent centers. Longitude spacing is
 * scaled by cos(latitude) so the grid stays roughly square in real distance.
 * Non-positive `rings` or `stepMeters` collapses to the single center point.
 */
export function gridPoints(
  lat: number,
  lng: number,
  rings: number,
  stepMeters: number
): GeoPoint[] {
  if (!Number.isFinite(rings) || rings <= 0 || !Number.isFinite(stepMeters) || stepMeters <= 0) {
    return [{ lat, lng }]
  }

  const dLat = stepMeters / METERS_PER_DEG_LAT
  const cosLat = Math.cos((lat * Math.PI) / 180)
  // Guard against the poles where cos(lat) → 0 (would blow up the longitude step).
  const dLng = stepMeters / (METERS_PER_DEG_LAT * Math.max(Math.abs(cosLat), 1e-6))

  const points: GeoPoint[] = []
  for (let i = -rings; i <= rings; i++) {
    for (let j = -rings; j <= rings; j++) {
      points.push({ lat: lat + i * dLat, lng: lng + j * dLng })
    }
  }
  return points
}
