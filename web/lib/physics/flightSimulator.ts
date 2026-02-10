// Physical constants
const GRAVITY = 9.81 // m/s²
const SEA_LEVEL_AIR_DENSITY = 1.225 // kg/m³ at sea level
const SCALE_HEIGHT = 8500 // meters - characteristic height for atmosphere

// ISA (International Standard Atmosphere) constants
const ISA_SEA_LEVEL_TEMP = 288.15 // K (15°C)
const ISA_LAPSE_RATE = 0.0065 // K/m
const ISA_TROPOPAUSE_TEMP = 216.65 // K minimum temperature
const ISA_SEA_LEVEL_PRESSURE = 101325 // Pa
const GAS_CONSTANT = 287.05 // J/(kg·K) for dry air

// Simple exponential air density (basic model)
function getAirDensitySimple(altitude: number): number {
  return SEA_LEVEL_AIR_DENSITY * Math.exp(-altitude / SCALE_HEIGHT)
}

// ISA atmospheric model - more accurate temperature, pressure, and density
export interface ISAConditions {
  temperature: number // K
  pressure: number // Pa
  density: number // kg/m³
}

export function getISAConditions(altitude: number): ISAConditions {
  // Troposphere model (up to ~11km)
  const temperature = Math.max(ISA_TROPOPAUSE_TEMP, ISA_SEA_LEVEL_TEMP - ISA_LAPSE_RATE * altitude)

  // Pressure calculation using barometric formula
  const pressureRatio = Math.pow(temperature / ISA_SEA_LEVEL_TEMP, GRAVITY / (ISA_LAPSE_RATE * GAS_CONSTANT))
  const pressure = ISA_SEA_LEVEL_PRESSURE * pressureRatio

  // Density from ideal gas law
  const density = pressure / (GAS_CONSTANT * temperature)

  return { temperature, pressure, density }
}

// Wind model with altitude-based wind shear
export function getWindAtAltitude(
  baseSpeed: number,
  altitude: number,
  turbulenceIntensity: number = 0
): number {
  if (baseSpeed <= 0) return 0

  // Wind shear: increases ~10% per 1000m up to about 5km
  // Then decreases in the free atmosphere
  let shearFactor: number
  if (altitude < 5000) {
    shearFactor = 1 + (altitude / 1000) * 0.1
  } else {
    // Above 5km, wind gradually decreases
    shearFactor = 1.5 - ((altitude - 5000) / 10000) * 0.3
  }
  shearFactor = Math.max(0.5, Math.min(2, shearFactor))

  // Random gust component (deterministic based on altitude for repeatability)
  let gustFactor = 1
  if (turbulenceIntensity > 0) {
    const gustPhase = (altitude * 0.01) % (Math.PI * 2)
    gustFactor = 1 + Math.sin(gustPhase) * turbulenceIntensity * 0.3
  }

  return baseSpeed * shearFactor * gustFactor
}

export interface RocketParams {
  thrust: number // N
  rocketMass: number // kg (dry mass)
  fuelMass: number // kg
  burnTime: number // s
  dragCoefficient: number // dimensionless
  crossSectionalArea: number // m²
  // Enhanced physics options
  windSpeed?: number // m/s at ground level
  windDirection?: number // degrees (0 = north, affects horizontal drift)
  turbulenceIntensity?: number // 0-1 scale
  useAdvancedAtmosphere?: boolean
}

export interface FlightDataPoint {
  time: number // s
  altitude: number // m
  velocity: number // m/s
  acceleration: number // m/s²
  mass: number // kg
  thrust: number // N
  drag: number // N
  weight: number // N
  phase: 'powered' | 'coast' | 'descent'
  // Enhanced physics data
  airDensity?: number // kg/m³
  temperature?: number // K
  windSpeed?: number // m/s at current altitude
  horizontalDrift?: number // m (cumulative)
}

export interface FlightResults {
  data: FlightDataPoint[]
  maxAltitude: number
  maxVelocity: number
  timeToApogee: number
  burnoutAltitude: number
  burnoutVelocity: number
  totalFlightTime: number
  // Enhanced physics results
  maxHorizontalDrift?: number // m
  windEnabled?: boolean
}

// Weather presets for easy selection
export const WEATHER_PRESETS = {
  calm: { windSpeed: 2, turbulenceIntensity: 0.1, label: 'Calm' },
  breezy: { windSpeed: 6, turbulenceIntensity: 0.3, label: 'Breezy' },
  windy: { windSpeed: 12, turbulenceIntensity: 0.5, label: 'Windy' },
  none: { windSpeed: 0, turbulenceIntensity: 0, label: 'No Wind' },
} as const

export type WeatherPreset = keyof typeof WEATHER_PRESETS

export function simulateFlight(params: RocketParams, timeStep: number = 0.05): FlightResults {
  const {
    thrust,
    rocketMass,
    fuelMass,
    burnTime,
    dragCoefficient,
    crossSectionalArea,
    windSpeed = 0,
    turbulenceIntensity = 0,
    useAdvancedAtmosphere = false,
  } = params

  const data: FlightDataPoint[] = []
  let time = 0
  let altitude = 0
  let velocity = 0
  let horizontalDrift = 0
  let maxAltitude = 0
  let maxVelocity = 0
  let maxHorizontalDrift = 0
  let timeToApogee = 0
  let burnoutAltitude = 0
  let burnoutVelocity = 0
  let hasReachedApogee = false
  let hasLaunched = false

  const windEnabled = windSpeed > 0

  // Simulation loop - continues until rocket lands or 5 min timeout
  while (time < 300) {
    // Calculate current mass (fuel depletes linearly during burn)
    let currentMass: number
    let currentThrust: number
    let phase: 'powered' | 'coast' | 'descent'

    if (time < burnTime) {
      // Powered flight - fuel is being consumed
      const fuelRemaining = fuelMass * (1 - time / burnTime)
      currentMass = rocketMass + fuelRemaining
      currentThrust = thrust
      phase = 'powered'
    } else {
      // Coast/descent phase - no fuel left
      currentMass = rocketMass
      currentThrust = 0
      phase = velocity > 0 ? 'coast' : 'descent'
    }

    // Calculate forces
    const weight = currentMass * GRAVITY

    // Get atmospheric conditions
    let airDensity: number
    let temperature: number | undefined

    if (useAdvancedAtmosphere) {
      const isa = getISAConditions(altitude)
      airDensity = isa.density
      temperature = isa.temperature
    } else {
      airDensity = getAirDensitySimple(altitude)
    }

    // Calculate wind at current altitude
    const currentWindSpeed = windEnabled
      ? getWindAtAltitude(windSpeed, altitude, turbulenceIntensity)
      : 0

    // Drag force: D = 0.5 * ρ * v² * Cd * A
    // Drag opposes motion, so it's negative when going up, positive when falling
    const dragMagnitude = 0.5 * airDensity * velocity * velocity * dragCoefficient * crossSectionalArea
    const drag = velocity > 0 ? dragMagnitude : -dragMagnitude

    // Wind drag effect (horizontal)
    // Wind pushes the rocket horizontally, creating drift
    const windDragForce = windEnabled
      ? 0.5 * airDensity * currentWindSpeed * currentWindSpeed * dragCoefficient * crossSectionalArea * 0.5
      : 0

    // Net force and acceleration (vertical)
    const netForce = currentThrust - weight - drag
    const acceleration = netForce / currentMass

    // Update horizontal drift (wind effect)
    if (windEnabled && currentMass > 0) {
      const horizontalAccel = windDragForce / currentMass
      horizontalDrift += horizontalAccel * timeStep * timeStep * 0.5
    }

    // Record data point
    data.push({
      time,
      altitude,
      velocity,
      acceleration,
      mass: currentMass,
      thrust: currentThrust,
      drag: dragMagnitude,
      weight,
      phase,
      airDensity,
      temperature,
      windSpeed: currentWindSpeed,
      horizontalDrift: windEnabled ? horizontalDrift : undefined,
    })

    // Track maximums
    if (altitude > maxAltitude) {
      maxAltitude = altitude
    }
    if (Math.abs(velocity) > maxVelocity) {
      maxVelocity = Math.abs(velocity)
    }
    if (Math.abs(horizontalDrift) > maxHorizontalDrift) {
      maxHorizontalDrift = Math.abs(horizontalDrift)
    }

    // Detect apogee
    if (!hasReachedApogee && velocity <= 0 && time > 0) {
      timeToApogee = time
      hasReachedApogee = true
    }

    // Record burnout conditions
    if (time < burnTime && time + timeStep >= burnTime) {
      burnoutAltitude = altitude
      burnoutVelocity = velocity
    }

    // Update velocity and position using simple Euler integration
    velocity += acceleration * timeStep
    altitude += velocity * timeStep

    // Track that we've actually launched (altitude > 0)
    if (altitude > 0.1) {
      hasLaunched = true
    }

    // Detect landing - only after we've gone up
    if (hasLaunched && altitude <= 0) {
      // Record final landing point
      data.push({
        time,
        altitude: 0,
        velocity: 0,
        acceleration: 0,
        mass: currentMass,
        thrust: 0,
        drag: 0,
        weight,
        phase: 'descent',
        horizontalDrift: windEnabled ? horizontalDrift : undefined,
      })
      break // Exit simulation loop on landing
    }

    time += timeStep
  }

  return {
    data,
    maxAltitude,
    maxVelocity,
    timeToApogee,
    burnoutAltitude,
    burnoutVelocity,
    totalFlightTime: time,
    maxHorizontalDrift: windEnabled ? maxHorizontalDrift : undefined,
    windEnabled,
  }
}

// Helper function to format numbers nicely
export function formatNumber(value: number, decimals: number = 1): string {
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(decimals) + 'k'
  }
  return value.toFixed(decimals)
}

// Presets for common model rockets
export const ROCKET_PRESETS = {
  'estes-a8': {
    name: 'Estes A8-3',
    params: {
      thrust: 9.7,
      rocketMass: 0.03,
      fuelMass: 0.003,
      burnTime: 0.5,
      dragCoefficient: 0.75,
      crossSectionalArea: 0.0004,
    },
  },
  'estes-b6': {
    name: 'Estes B6-4',
    params: {
      thrust: 12.5,
      rocketMass: 0.05,
      fuelMass: 0.006,
      burnTime: 0.8,
      dragCoefficient: 0.7,
      crossSectionalArea: 0.0005,
    },
  },
  'estes-c6': {
    name: 'Estes C6-5',
    params: {
      thrust: 14.0,
      rocketMass: 0.08,
      fuelMass: 0.012,
      burnTime: 1.6,
      dragCoefficient: 0.65,
      crossSectionalArea: 0.0006,
    },
  },
  'custom': {
    name: 'Custom Rocket',
    params: {
      thrust: 100,
      rocketMass: 0.5,
      fuelMass: 0.2,
      burnTime: 3,
      dragCoefficient: 0.5,
      crossSectionalArea: 0.002,
    },
  },
}
