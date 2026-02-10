// Physical constants
const G = 6.674e-11 // Gravitational constant (m³/kg/s²)
const M_EARTH = 5.972e24 // Mass of Earth (kg)
const R_EARTH = 6.371e6 // Radius of Earth (m)
const MU = G * M_EARTH // Standard gravitational parameter (m³/s²)

export interface OrbitParams {
  periapsis: number // km above Earth surface
  apoapsis: number // km above Earth surface
}

export interface OrbitData {
  periapsisAltitude: number // km
  apoapsisAltitude: number // km
  periapsisRadius: number // km from Earth center
  apoapsisRadius: number // km from Earth center
  semiMajorAxis: number // km
  eccentricity: number
  orbitalPeriod: number // seconds
  periapsisVelocity: number // m/s
  apoapsisVelocity: number // m/s
}

export interface HohmannTransfer {
  initialOrbit: OrbitData
  targetOrbit: OrbitData
  transferOrbit: OrbitData
  deltaV1: number // m/s (first burn at periapsis)
  deltaV2: number // m/s (second burn at apoapsis)
  totalDeltaV: number // m/s
  transferTime: number // seconds (half of transfer orbit period)
}

// Calculate orbital velocity at a given radius for a given orbit
export function orbitalVelocity(radius: number, semiMajorAxis: number): number {
  // v = sqrt(μ * (2/r - 1/a))
  return Math.sqrt(MU * (2 / radius - 1 / semiMajorAxis))
}

// Calculate circular orbital velocity at a given radius
export function circularVelocity(radius: number): number {
  return Math.sqrt(MU / radius)
}

// Calculate escape velocity at a given radius
export function escapeVelocity(radius: number): number {
  return Math.sqrt(2 * MU / radius)
}

// Calculate orbital period
export function orbitalPeriod(semiMajorAxis: number): number {
  return 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / MU)
}

// Calculate orbit data from periapsis and apoapsis altitudes
export function calculateOrbit(periapsisAlt: number, apoapsisAlt: number): OrbitData {
  const periapsisRadius = (R_EARTH + periapsisAlt * 1000) // Convert km to m, then to radius from center
  const apoapsisRadius = (R_EARTH + apoapsisAlt * 1000)

  const semiMajorAxis = (periapsisRadius + apoapsisRadius) / 2
  const eccentricity = (apoapsisRadius - periapsisRadius) / (apoapsisRadius + periapsisRadius)

  const period = orbitalPeriod(semiMajorAxis)
  const periapsisVelocity = orbitalVelocity(periapsisRadius, semiMajorAxis)
  const apoapsisVelocity = orbitalVelocity(apoapsisRadius, semiMajorAxis)

  return {
    periapsisAltitude: periapsisAlt,
    apoapsisAltitude: apoapsisAlt,
    periapsisRadius: periapsisRadius / 1000, // Convert back to km
    apoapsisRadius: apoapsisRadius / 1000,
    semiMajorAxis: semiMajorAxis / 1000,
    eccentricity,
    orbitalPeriod: period,
    periapsisVelocity,
    apoapsisVelocity,
  }
}

// Calculate Hohmann transfer between two circular orbits
export function calculateHohmannTransfer(initialAlt: number, targetAlt: number): HohmannTransfer {
  const r1 = R_EARTH + initialAlt * 1000 // Initial orbit radius (m)
  const r2 = R_EARTH + targetAlt * 1000 // Target orbit radius (m)

  // Initial circular orbit velocity
  const v1 = circularVelocity(r1)

  // Target circular orbit velocity
  const v2 = circularVelocity(r2)

  // Transfer orbit semi-major axis
  const aTransfer = (r1 + r2) / 2

  // Velocity at periapsis of transfer orbit (at r1)
  const vTransferPeriapsis = orbitalVelocity(r1, aTransfer)

  // Velocity at apoapsis of transfer orbit (at r2)
  const vTransferApoapsis = orbitalVelocity(r2, aTransfer)

  // Delta-v calculations
  const deltaV1 = Math.abs(vTransferPeriapsis - v1) // First burn
  const deltaV2 = Math.abs(v2 - vTransferApoapsis) // Second burn
  const totalDeltaV = deltaV1 + deltaV2

  // Transfer time is half the transfer orbit period
  const transferTime = orbitalPeriod(aTransfer) / 2

  return {
    initialOrbit: calculateOrbit(initialAlt, initialAlt),
    targetOrbit: calculateOrbit(targetAlt, targetAlt),
    transferOrbit: calculateOrbit(initialAlt, targetAlt),
    deltaV1,
    deltaV2,
    totalDeltaV,
    transferTime,
  }
}

// Format time in human readable format
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs.toFixed(0)}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }
}

// Common orbit presets
export const ORBIT_PRESETS = {
  'leo': {
    name: 'Low Earth Orbit (ISS)',
    altitude: 400,
  },
  'meo': {
    name: 'Medium Earth Orbit (GPS)',
    altitude: 20200,
  },
  'geo': {
    name: 'Geostationary Orbit',
    altitude: 35786,
  },
  'lunar': {
    name: 'Lunar Distance',
    altitude: 384400,
  },
}

// Earth radius in km for visualization
export const EARTH_RADIUS_KM = R_EARTH / 1000
