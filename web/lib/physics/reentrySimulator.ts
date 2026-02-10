// Atmospheric Re-entry Simulator Physics Engine
// Simulates spacecraft re-entry with heat flux, G-loads, and communications blackout

// Physical constants
const GRAVITY = 9.81 // m/s² at sea level
const EARTH_RADIUS = 6371000 // meters
const EARTH_MASS = 5.972e24 // kg
const G_CONST = 6.674e-11 // gravitational constant

// Atmosphere constants
const SEA_LEVEL_DENSITY = 1.225 // kg/m³
const SCALE_HEIGHT = 8500 // m (approximate for lower atmosphere)

// Sutton-Graves constant for Earth
const SUTTON_GRAVES_K = 1.83e-4 // for convective heat flux

// Vehicle parameters
export interface ReentryVehicle {
  mass: number              // kg
  dragCoefficient: number
  liftCoefficient: number
  referenceArea: number     // m²
  noseRadius: number        // m (for heat flux calculation)
  heatShieldMass: number    // kg
  heatShieldCapacity: number // J/kg (ablative capacity)
  maxGLoad: number          // crew tolerance in g's
}

// Parachute parameters
export interface Parachute {
  deployAltitude: number    // m
  dragCoefficient: number
  area: number              // m²
}

// Simulation parameters
export interface ReentryParams {
  entryAltitude: number       // m (typically 120000m / 120km)
  entryVelocity: number       // m/s (orbital ~7800, lunar ~11000)
  entryAngle: number          // degrees (negative = descending, typically -1 to -8)
  vehicle: ReentryVehicle
  parachute: Parachute
}

// Simulation data point
export interface ReentryDataPoint {
  time: number
  altitude: number            // m
  velocity: number            // m/s
  flightPathAngle: number     // degrees
  downrangeDistance: number   // m
  heatFlux: number            // W/m²
  integratedHeat: number      // J/m² total heat absorbed
  heatShieldRemaining: number // percentage 0-100
  gLoad: number               // g's
  isInBlackout: boolean
  mach: number
  dynamicPressure: number     // Pa
  phase: 'entry' | 'peak-heating' | 'deceleration' | 'parachute' | 'landed'
  airDensity: number
}

// Simulation results
export interface ReentryResults {
  data: ReentryDataPoint[]
  maxGLoad: number
  maxHeatFlux: number
  totalHeatLoad: number       // J/m²
  blackoutDuration: number    // seconds
  blackoutStartAlt: number
  blackoutEndAlt: number
  peakHeatingAltitude: number
  terminalVelocity: number
  totalFlightTime: number
  landingVelocity: number
  success: boolean
  failureReason?: string
}

// Extended atmosphere model (up to 120km)
function getAtmosphericDensity(altitude: number): number {
  if (altitude < 0) return SEA_LEVEL_DENSITY
  if (altitude > 150000) return 0

  // Multi-layer atmosphere model
  if (altitude < 11000) {
    // Troposphere
    const T = 288.15 - 0.0065 * altitude
    const p = 101325 * Math.pow(T / 288.15, 5.2561)
    return p / (287.05 * T)
  } else if (altitude < 25000) {
    // Lower stratosphere (isothermal)
    const T = 216.65
    const p = 22632 * Math.exp(-(altitude - 11000) / 6341.62)
    return p / (287.05 * T)
  } else if (altitude < 47000) {
    // Upper stratosphere
    const T = 216.65 + 0.001 * (altitude - 25000)
    const p = 2488.6 * Math.pow(T / 216.65, -34.1632)
    return p / (287.05 * T)
  } else if (altitude < 85000) {
    // Mesosphere (simplified)
    return SEA_LEVEL_DENSITY * Math.exp(-altitude / SCALE_HEIGHT)
  } else {
    // Thermosphere (very thin, exponential decay)
    const baseRho = SEA_LEVEL_DENSITY * Math.exp(-85000 / SCALE_HEIGHT)
    return baseRho * Math.exp(-(altitude - 85000) / 20000)
  }
}

// Speed of sound at altitude (simplified)
function getSpeedOfSound(altitude: number): number {
  // Approximate temperature model
  let T: number
  if (altitude < 11000) {
    T = 288.15 - 0.0065 * altitude
  } else if (altitude < 25000) {
    T = 216.65
  } else if (altitude < 47000) {
    T = 216.65 + 0.001 * (altitude - 25000)
  } else {
    T = 270 // Rough average for upper atmosphere
  }
  return Math.sqrt(1.4 * 287.05 * T) // gamma * R * T
}

// Sutton-Graves convective heat flux (W/m²)
function calculateHeatFlux(density: number, velocity: number, noseRadius: number): number {
  // q = k * sqrt(rho/r_n) * V^3
  if (velocity < 100 || density < 1e-10) return 0
  return SUTTON_GRAVES_K * Math.sqrt(density / noseRadius) * Math.pow(velocity, 3)
}

// Gravity at altitude
function gravityAtAltitude(altitude: number): number {
  const r = EARTH_RADIUS + altitude
  return GRAVITY * Math.pow(EARTH_RADIUS / r, 2)
}

// Check for communications blackout (plasma sheath)
function isInBlackout(altitude: number, mach: number): boolean {
  // Blackout typically occurs when:
  // - Mach > 10 (high velocity creates ionized plasma)
  // - Altitude between 30km and 90km (enough atmosphere to ionize)
  return mach > 10 && altitude > 30000 && altitude < 90000
}

// Main simulation function
export function simulateReentry(
  params: ReentryParams,
  timeStep: number = 0.1
): ReentryResults {
  const { entryAltitude, entryVelocity, entryAngle, vehicle, parachute } = params

  const data: ReentryDataPoint[] = []

  let time = 0
  let altitude = entryAltitude
  let velocity = entryVelocity
  let flightPathAngle = entryAngle * Math.PI / 180 // Convert to radians
  let downrangeDistance = 0

  // Heat shield state
  let heatShieldRemaining = 100
  let integratedHeat = 0

  // Track max values and events
  let maxGLoad = 0
  let maxHeatFlux = 0
  let totalHeatLoad = 0
  let blackoutDuration = 0
  let blackoutStartAlt = 0
  let blackoutEndAlt = 0
  let wasInBlackout = false
  let peakHeatingAltitude = entryAltitude
  let peakHeatingSoFar = 0
  let parachuteDeployed = false

  // Failure tracking
  let success = true
  let failureReason: string | undefined

  // Simulation loop
  while (time < 3600 && altitude > 0) { // Max 1 hour
    const g = gravityAtAltitude(altitude)
    const rho = getAtmosphericDensity(altitude)
    const speedOfSound = getSpeedOfSound(altitude)
    const mach = velocity / speedOfSound

    // Dynamic pressure
    const q = 0.5 * rho * velocity * velocity

    // Aerodynamic forces
    const dragForce = q * vehicle.dragCoefficient * vehicle.referenceArea
    const liftForce = q * vehicle.liftCoefficient * vehicle.referenceArea

    // Current mass (heat shield ablation reduces mass slightly)
    const ablatedMass = vehicle.heatShieldMass * (1 - heatShieldRemaining / 100) * 0.5
    const currentMass = vehicle.mass - ablatedMass

    // Accelerations
    const dragAccel = dragForce / currentMass
    const liftAccel = liftForce / currentMass

    // Equations of motion for re-entry (2D planar)
    // dv/dt = -D/m - g*sin(gamma)
    // d(gamma)/dt = (L/m - g*cos(gamma) + v^2*cos(gamma)/r) / v
    const dvdt = -dragAccel - g * Math.sin(flightPathAngle)
    const r = EARTH_RADIUS + altitude
    const dgammadt = (liftAccel - g * Math.cos(flightPathAngle) + velocity * velocity * Math.cos(flightPathAngle) / r) / velocity

    // G-load
    const totalAccel = Math.sqrt(dragAccel * dragAccel + liftAccel * liftAccel)
    const gLoad = totalAccel / 9.81

    // Heat flux
    const heatFlux = calculateHeatFlux(rho, velocity, vehicle.noseRadius)

    // Heat shield ablation
    if (heatFlux > 0) {
      const heatAbsorbed = heatFlux * timeStep // J/m² this step
      integratedHeat += heatAbsorbed
      totalHeatLoad += heatAbsorbed

      // Ablation model - shield absorbs heat and loses mass
      const heatCapacityTotal = vehicle.heatShieldMass * vehicle.heatShieldCapacity / vehicle.referenceArea
      const heatUsedPercent = (integratedHeat / heatCapacityTotal) * 100
      heatShieldRemaining = Math.max(0, 100 - heatUsedPercent)
    }

    // Track peak heating
    if (heatFlux > peakHeatingSoFar) {
      peakHeatingSoFar = heatFlux
      peakHeatingAltitude = altitude
    }

    // Check for blackout
    const inBlackout = isInBlackout(altitude, mach)
    if (inBlackout) {
      blackoutDuration += timeStep
      if (!wasInBlackout) {
        blackoutStartAlt = altitude
      }
    } else if (wasInBlackout) {
      blackoutEndAlt = altitude
    }
    wasInBlackout = inBlackout

    // Determine phase
    let phase: ReentryDataPoint['phase'] = 'entry'
    if (heatFlux > maxHeatFlux * 0.5 && velocity > 1000) {
      phase = 'peak-heating'
    } else if (gLoad > 1 && velocity > 200) {
      phase = 'deceleration'
    }

    // Parachute deployment
    let effectiveDrag = vehicle.dragCoefficient
    let effectiveArea = vehicle.referenceArea
    if (!parachuteDeployed && altitude <= parachute.deployAltitude && velocity < 500) {
      parachuteDeployed = true
    }
    if (parachuteDeployed) {
      effectiveDrag = parachute.dragCoefficient
      effectiveArea = parachute.area
      phase = 'parachute'
    }

    // Track maximums
    if (gLoad > maxGLoad) maxGLoad = gLoad
    if (heatFlux > maxHeatFlux) maxHeatFlux = heatFlux

    // Record data point
    data.push({
      time,
      altitude,
      velocity,
      flightPathAngle: flightPathAngle * 180 / Math.PI,
      downrangeDistance,
      heatFlux,
      integratedHeat,
      heatShieldRemaining,
      gLoad,
      isInBlackout: inBlackout,
      mach,
      dynamicPressure: q,
      phase,
      airDensity: rho,
    })

    // Check for failure conditions
    if (heatShieldRemaining <= 0 && velocity > 1000) {
      success = false
      failureReason = 'Heat shield burnthrough'
      break
    }
    if (gLoad > vehicle.maxGLoad * 1.5) {
      success = false
      failureReason = `Excessive G-load (${gLoad.toFixed(1)}g exceeded ${vehicle.maxGLoad}g limit)`
      break
    }

    // Update state
    velocity += dvdt * timeStep
    flightPathAngle += dgammadt * timeStep

    // Update position
    const dAltitude = velocity * Math.sin(flightPathAngle) * timeStep
    const dDownrange = velocity * Math.cos(flightPathAngle) * timeStep
    altitude += dAltitude
    downrangeDistance += dDownrange

    // Clamp flight path angle
    flightPathAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, flightPathAngle))

    // Check for skip-out
    if (altitude > entryAltitude * 1.1 && velocity > 7000) {
      success = false
      failureReason = 'Skip-out trajectory - vehicle escaped to space'
      break
    }

    time += timeStep
  }

  // Record landing
  const finalPoint = data[data.length - 1]
  if (finalPoint && altitude <= 0) {
    data.push({
      ...finalPoint,
      time: time,
      altitude: 0,
      velocity: parachuteDeployed ? finalPoint.velocity : 0,
      phase: 'landed',
      heatFlux: 0,
      gLoad: 0,
      isInBlackout: false,
    })
  }

  const terminalVelocity = parachuteDeployed
    ? Math.sqrt((2 * vehicle.mass * GRAVITY) / (SEA_LEVEL_DENSITY * parachute.dragCoefficient * parachute.area))
    : finalPoint?.velocity || 0

  return {
    data,
    maxGLoad,
    maxHeatFlux,
    totalHeatLoad,
    blackoutDuration,
    blackoutStartAlt,
    blackoutEndAlt,
    peakHeatingAltitude,
    terminalVelocity,
    totalFlightTime: time,
    landingVelocity: finalPoint?.velocity || 0,
    success,
    failureReason,
  }
}

// Calculate safe entry corridor (min/max entry angles)
export function calculateEntryCorridor(
  velocity: number,
  vehicle: ReentryVehicle
): { minAngle: number; maxAngle: number; nominalAngle: number } {
  // Simplified corridor calculation
  // Too steep = excessive G-load and heating
  // Too shallow = skip-out

  // Approximate values based on velocity
  const velocityRatio = velocity / 7800 // Normalize to LEO velocity

  // Steeper entry for faster vehicles
  const baseMin = -1.0 * velocityRatio
  const baseMax = -8.0 * velocityRatio

  // Adjust for vehicle L/D ratio
  const ldRatio = vehicle.liftCoefficient / vehicle.dragCoefficient
  const ldAdjustment = ldRatio * 0.5

  return {
    minAngle: Math.max(-0.5, baseMin + ldAdjustment),
    maxAngle: Math.min(-15, baseMax - ldAdjustment),
    nominalAngle: (baseMin + baseMax) / 2,
  }
}

// Preset vehicles
export const REENTRY_PRESETS = {
  'apollo': {
    name: 'Apollo Command Module',
    params: {
      entryAltitude: 120000,
      entryVelocity: 11000, // Lunar return
      entryAngle: -6.5,
      vehicle: {
        mass: 5900,
        dragCoefficient: 1.2,
        liftCoefficient: 0.4,
        referenceArea: 12.02,
        noseRadius: 4.69,
        heatShieldMass: 1400,
        heatShieldCapacity: 8e6, // J/kg
        maxGLoad: 10,
      },
      parachute: {
        deployAltitude: 7000,
        dragCoefficient: 1.4,
        area: 1100, // 3 main chutes
      },
    },
  },
  'dragon': {
    name: 'Crew Dragon',
    params: {
      entryAltitude: 120000,
      entryVelocity: 7800, // LEO return
      entryAngle: -1.5,
      vehicle: {
        mass: 12500,
        dragCoefficient: 1.1,
        liftCoefficient: 0.35,
        referenceArea: 16.6,
        noseRadius: 2.3,
        heatShieldMass: 850,
        heatShieldCapacity: 12e6,
        maxGLoad: 8,
      },
      parachute: {
        deployAltitude: 5500,
        dragCoefficient: 1.5,
        area: 1200,
      },
    },
  },
  'soyuz': {
    name: 'Soyuz Descent Module',
    params: {
      entryAltitude: 120000,
      entryVelocity: 7900,
      entryAngle: -1.8,
      vehicle: {
        mass: 2900,
        dragCoefficient: 1.3,
        liftCoefficient: 0.3,
        referenceArea: 4.6,
        noseRadius: 2.2,
        heatShieldMass: 600,
        heatShieldCapacity: 6e6,
        maxGLoad: 9,
      },
      parachute: {
        deployAltitude: 8500,
        dragCoefficient: 1.3,
        area: 900,
      },
    },
  },
  'shuttle': {
    name: 'Space Shuttle Orbiter',
    params: {
      entryAltitude: 120000,
      entryVelocity: 7800,
      entryAngle: -1.2,
      vehicle: {
        mass: 100000,
        dragCoefficient: 0.9,
        liftCoefficient: 0.8, // High L/D for cross-range
        referenceArea: 250,
        noseRadius: 0.3, // Sharp leading edges
        heatShieldMass: 8000,
        heatShieldCapacity: 10e6,
        maxGLoad: 3,
      },
      parachute: {
        deployAltitude: 3000, // Drag chute only
        dragCoefficient: 1.2,
        area: 50,
      },
    },
  },
  'custom': {
    name: 'Custom Vehicle',
    params: {
      entryAltitude: 120000,
      entryVelocity: 7800,
      entryAngle: -2,
      vehicle: {
        mass: 5000,
        dragCoefficient: 1.0,
        liftCoefficient: 0.3,
        referenceArea: 10,
        noseRadius: 2.0,
        heatShieldMass: 500,
        heatShieldCapacity: 8e6,
        maxGLoad: 8,
      },
      parachute: {
        deployAltitude: 5000,
        dragCoefficient: 1.4,
        area: 400,
      },
    },
  },
} as const

export type ReentryPreset = keyof typeof REENTRY_PRESETS
