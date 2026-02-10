// Multi-Stage Rocket Simulator Physics Engine
// Simulates staged rockets with proper mass jettisoning and multi-stage delta-V calculations

import { getISAConditions, type ISAConditions } from './flightSimulator'

// Physical constants
const GRAVITY = 9.81 // m/s² at sea level
const EARTH_RADIUS = 6371000 // meters

// Stage definition
export interface Stage {
  id: string
  name: string
  dryMass: number      // kg (structure without fuel)
  fuelMass: number     // kg
  thrust: number       // N
  isp: number          // seconds (specific impulse)
  burnTime: number     // seconds (calculated from fuel flow rate if needed)
}

// Simulation parameters
export interface MultiStageParams {
  stages: Stage[]          // Bottom to top (index 0 = first stage)
  payloadMass: number      // kg
  dragCoefficient: number
  crossSectionalArea: number // m²
  separationDelay: number  // seconds between burnout and separation
}

// Event during flight
export interface StagingEvent {
  time: number
  stageId: string
  stageName: string
  type: 'ignition' | 'burnout' | 'separation'
  altitude: number
  velocity: number
  deltaV: number         // deltaV expended at this point
}

// Data point during simulation
export interface MultiStageDataPoint {
  time: number
  altitude: number
  velocity: number
  acceleration: number
  mass: number
  thrust: number
  drag: number
  weight: number
  currentStage: number    // Index of currently firing stage (-1 if coasting)
  phase: 'powered' | 'separation' | 'coast' | 'descent'
  deltaVExpended: number  // Total delta-V used so far
  airDensity: number
  twr: number            // Current thrust-to-weight ratio
}

// Results of simulation
export interface MultiStageResults {
  data: MultiStageDataPoint[]
  events: StagingEvent[]
  maxAltitude: number
  maxVelocity: number
  totalDeltaV: number
  theoreticalDeltaV: number  // From Tsiolkovsky equation
  stageContributions: { stageId: string; deltaV: number }[]
  timeToApogee: number
  totalFlightTime: number
}

// Calculate exhaust velocity from Isp
export function exhaustVelocity(isp: number): number {
  return isp * GRAVITY
}

// Calculate theoretical delta-V for a single stage using Tsiolkovsky equation
export function tsiolkovskyDeltaV(isp: number, wetMass: number, dryMass: number): number {
  const ve = exhaustVelocity(isp)
  return ve * Math.log(wetMass / dryMass)
}

// Calculate theoretical delta-V for a multi-stage rocket
export function calculateTotalDeltaV(params: MultiStageParams): { total: number; perStage: { stageId: string; deltaV: number }[] } {
  const { stages, payloadMass } = params
  const contributions: { stageId: string; deltaV: number }[] = []
  let totalDV = 0

  // Work from top stage down, since each stage carries all stages above it
  // But firing order is bottom to top
  for (let i = stages.length - 1; i >= 0; i--) {
    const stage = stages[i]

    // Calculate mass carried by this stage (all stages above + payload)
    let payloadForThisStage = payloadMass
    for (let j = i + 1; j < stages.length; j++) {
      payloadForThisStage += stages[j].dryMass + stages[j].fuelMass
    }

    const wetMass = stage.dryMass + stage.fuelMass + payloadForThisStage
    const dryMass = stage.dryMass + payloadForThisStage  // After fuel is burned

    const stageDV = tsiolkovskyDeltaV(stage.isp, wetMass, dryMass)
    contributions.unshift({ stageId: stage.id, deltaV: stageDV })
    totalDV += stageDV
  }

  return { total: totalDV, perStage: contributions }
}

// Calculate TWR for initial conditions
export function calculateInitialTWR(params: MultiStageParams): number {
  const { stages, payloadMass } = params
  if (stages.length === 0) return 0

  const totalMass = payloadMass + stages.reduce((sum, s) => sum + s.dryMass + s.fuelMass, 0)
  const firstStageThrust = stages[0].thrust

  return firstStageThrust / (totalMass * GRAVITY)
}

// Calculate stage metrics for display
export interface StageMetrics {
  stageId: string
  stageName: string
  wetMass: number        // Including payload above
  dryMass: number        // Including payload above
  deltaV: number
  massRatio: number
  twr: number           // At stage ignition (estimated)
}

export function calculateStageMetrics(params: MultiStageParams): StageMetrics[] {
  const { stages, payloadMass } = params
  const metrics: StageMetrics[] = []

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]

    // Calculate mass above this stage (all upper stages + payload)
    let massAbove = payloadMass
    for (let j = i + 1; j < stages.length; j++) {
      massAbove += stages[j].dryMass + stages[j].fuelMass
    }

    const wetMass = stage.dryMass + stage.fuelMass + massAbove
    const dryMass = stage.dryMass + massAbove
    const massRatio = wetMass / dryMass
    const deltaV = tsiolkovskyDeltaV(stage.isp, wetMass, dryMass)
    const twr = stage.thrust / (wetMass * GRAVITY)

    metrics.push({
      stageId: stage.id,
      stageName: stage.name,
      wetMass,
      dryMass,
      deltaV,
      massRatio,
      twr,
    })
  }

  return metrics
}

// Gravity at altitude (inverse square law)
function gravityAtAltitude(altitude: number): number {
  const r = EARTH_RADIUS + altitude
  return GRAVITY * Math.pow(EARTH_RADIUS / r, 2)
}

// Main simulation function
export function simulateMultiStage(
  params: MultiStageParams,
  timeStep: number = 0.05
): MultiStageResults {
  const { stages, payloadMass, dragCoefficient, crossSectionalArea, separationDelay } = params

  const data: MultiStageDataPoint[] = []
  const events: StagingEvent[] = []

  let time = 0
  let altitude = 0
  let velocity = 0
  let deltaVExpended = 0
  let maxAltitude = 0
  let maxVelocity = 0
  let timeToApogee = 0
  let hasReachedApogee = false
  let hasLaunched = false

  // Track current stage and its fuel state
  let currentStageIndex = 0
  let currentStageFuelRemaining = stages.length > 0 ? stages[0].fuelMass : 0
  let separationTimer = 0
  let inSeparation = false

  // Calculate remaining mass at any point
  function getCurrentMass(): number {
    let mass = payloadMass

    // Add mass of all stages at or above current stage
    for (let i = currentStageIndex; i < stages.length; i++) {
      mass += stages[i].dryMass
      if (i === currentStageIndex) {
        mass += currentStageFuelRemaining
      } else {
        mass += stages[i].fuelMass
      }
    }

    return mass
  }

  // Record initial ignition event
  if (stages.length > 0) {
    events.push({
      time: 0,
      stageId: stages[0].id,
      stageName: stages[0].name,
      type: 'ignition',
      altitude: 0,
      velocity: 0,
      deltaV: 0,
    })
  }

  // Calculate theoretical delta-V for comparison
  const theoretical = calculateTotalDeltaV(params)

  // Simulation loop
  while (time < 600 && currentStageIndex <= stages.length) { // Max 10 minutes
    const currentMass = getCurrentMass()
    const g = gravityAtAltitude(altitude)
    const weight = currentMass * g

    // Get atmospheric conditions
    const isa = getISAConditions(Math.max(0, altitude))
    const airDensity = altitude < 0 ? 1.225 : isa.density

    // Determine thrust and phase
    let currentThrust = 0
    let phase: 'powered' | 'separation' | 'coast' | 'descent' = 'coast'

    if (currentStageIndex < stages.length && !inSeparation) {
      const stage = stages[currentStageIndex]

      if (currentStageFuelRemaining > 0) {
        currentThrust = stage.thrust
        phase = 'powered'

        // Consume fuel
        const massFlowRate = stage.thrust / exhaustVelocity(stage.isp)
        const fuelConsumed = massFlowRate * timeStep
        currentStageFuelRemaining = Math.max(0, currentStageFuelRemaining - fuelConsumed)

        // Track delta-V expended
        const prevMass = currentMass
        const newMass = getCurrentMass()
        if (newMass > 0) {
          const instantDV = exhaustVelocity(stage.isp) * Math.log(prevMass / newMass)
          deltaVExpended += instantDV
        }
      } else if (currentStageFuelRemaining <= 0 && !inSeparation) {
        // Burnout - record event and start separation
        events.push({
          time,
          stageId: stage.id,
          stageName: stage.name,
          type: 'burnout',
          altitude,
          velocity,
          deltaV: deltaVExpended,
        })

        inSeparation = true
        separationTimer = 0
        phase = 'separation'
      }
    } else if (inSeparation) {
      phase = 'separation'
      separationTimer += timeStep

      if (separationTimer >= separationDelay) {
        // Perform separation
        const separatingStage = stages[currentStageIndex]
        events.push({
          time,
          stageId: separatingStage.id,
          stageName: separatingStage.name,
          type: 'separation',
          altitude,
          velocity,
          deltaV: deltaVExpended,
        })

        currentStageIndex++
        inSeparation = false

        // Ignite next stage if available
        if (currentStageIndex < stages.length) {
          currentStageFuelRemaining = stages[currentStageIndex].fuelMass
          events.push({
            time,
            stageId: stages[currentStageIndex].id,
            stageName: stages[currentStageIndex].name,
            type: 'ignition',
            altitude,
            velocity,
            deltaV: deltaVExpended,
          })
        }
      }
    }

    if (phase === 'coast' && velocity < 0) {
      phase = 'descent'
    }

    // Calculate drag
    const dragMagnitude = 0.5 * airDensity * velocity * velocity * dragCoefficient * crossSectionalArea
    const drag = velocity > 0 ? dragMagnitude : -dragMagnitude

    // Net force and acceleration
    const netForce = currentThrust - weight - drag
    const acceleration = currentMass > 0 ? netForce / currentMass : 0
    const twr = currentMass > 0 ? currentThrust / (currentMass * g) : 0

    // Record data point
    data.push({
      time,
      altitude: Math.max(0, altitude),
      velocity,
      acceleration,
      mass: currentMass,
      thrust: currentThrust,
      drag: dragMagnitude,
      weight,
      currentStage: phase === 'powered' ? currentStageIndex : -1,
      phase,
      deltaVExpended,
      airDensity,
      twr,
    })

    // Track maximums
    if (altitude > maxAltitude) {
      maxAltitude = altitude
    }
    if (Math.abs(velocity) > maxVelocity) {
      maxVelocity = Math.abs(velocity)
    }

    // Detect apogee
    if (!hasReachedApogee && velocity <= 0 && time > 0 && hasLaunched) {
      timeToApogee = time
      hasReachedApogee = true
    }

    // Update state
    velocity += acceleration * timeStep
    altitude += velocity * timeStep

    if (altitude > 0.1) {
      hasLaunched = true
    }

    // Check for landing
    if (hasLaunched && altitude <= 0) {
      data.push({
        time,
        altitude: 0,
        velocity: 0,
        acceleration: 0,
        mass: currentMass,
        thrust: 0,
        drag: 0,
        weight,
        currentStage: -1,
        phase: 'descent',
        deltaVExpended,
        airDensity: 1.225,
        twr: 0,
      })
      break
    }

    time += timeStep
  }

  // Calculate per-stage contributions from events
  const stageContributions: { stageId: string; deltaV: number }[] = []
  let prevDeltaV = 0
  for (const event of events) {
    if (event.type === 'burnout') {
      stageContributions.push({
        stageId: event.stageId,
        deltaV: event.deltaV - prevDeltaV,
      })
      prevDeltaV = event.deltaV
    }
  }

  return {
    data,
    events,
    maxAltitude,
    maxVelocity,
    totalDeltaV: deltaVExpended,
    theoreticalDeltaV: theoretical.total,
    stageContributions,
    timeToApogee,
    totalFlightTime: time,
  }
}

// Preset rockets
export const MULTI_STAGE_PRESETS = {
  'saturn-v': {
    name: 'Saturn V (scaled)',
    params: {
      stages: [
        {
          id: 's-ic',
          name: 'S-IC (First)',
          dryMass: 130000,
          fuelMass: 2160000,
          thrust: 34020000,
          isp: 263,
          burnTime: 168,
        },
        {
          id: 's-ii',
          name: 'S-II (Second)',
          dryMass: 40100,
          fuelMass: 456100,
          thrust: 5115000,
          isp: 421,
          burnTime: 360,
        },
        {
          id: 's-ivb',
          name: 'S-IVB (Third)',
          dryMass: 13500,
          fuelMass: 106000,
          thrust: 1033000,
          isp: 421,
          burnTime: 165,
        },
      ],
      payloadMass: 130000,
      dragCoefficient: 0.5,
      crossSectionalArea: 78.5,
      separationDelay: 2,
    },
  },
  'falcon-9': {
    name: 'Falcon 9 (approx)',
    params: {
      stages: [
        {
          id: 'stage-1',
          name: 'Stage 1',
          dryMass: 22200,
          fuelMass: 395700,
          thrust: 7607000,
          isp: 282,
          burnTime: 162,
        },
        {
          id: 'stage-2',
          name: 'Stage 2',
          dryMass: 4000,
          fuelMass: 92670,
          thrust: 934000,
          isp: 348,
          burnTime: 348,
        },
      ],
      payloadMass: 22800,
      dragCoefficient: 0.4,
      crossSectionalArea: 10.75,
      separationDelay: 3,
    },
  },
  'model-rocket': {
    name: 'Model Rocket (single)',
    params: {
      stages: [
        {
          id: 'motor',
          name: 'Motor',
          dryMass: 0.08,
          fuelMass: 0.012,
          thrust: 14,
          isp: 80,
          burnTime: 1.6,
        },
      ],
      payloadMass: 0.02,
      dragCoefficient: 0.65,
      crossSectionalArea: 0.0006,
      separationDelay: 0,
    },
  },
  'custom': {
    name: 'Custom Rocket',
    params: {
      stages: [
        {
          id: 'stage-1',
          name: 'Stage 1',
          dryMass: 500,
          fuelMass: 4500,
          thrust: 100000,
          isp: 280,
          burnTime: 120,
        },
        {
          id: 'stage-2',
          name: 'Stage 2',
          dryMass: 100,
          fuelMass: 900,
          thrust: 25000,
          isp: 320,
          burnTime: 90,
        },
      ],
      payloadMass: 100,
      dragCoefficient: 0.5,
      crossSectionalArea: 2,
      separationDelay: 2,
    },
  },
} as const

export type MultiStagePreset = keyof typeof MULTI_STAGE_PRESETS
