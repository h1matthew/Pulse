// Payload Optimization Engine
// Calculates optimal rocket configurations for different mission profiles

const GRAVITY = 9.81 // m/s²
const EARTH_RADIUS = 6371000 // meters

// Orbit type definitions with delta-V requirements
export const ORBIT_PROFILES = {
  LEO: {
    name: 'Low Earth Orbit (LEO)',
    altitude: 400, // km
    deltaV: 9400, // m/s including gravity/drag losses
    description: 'ISS altitude, satellite constellations',
  },
  MEO: {
    name: 'Medium Earth Orbit (MEO)',
    altitude: 20200, // km
    deltaV: 13500, // m/s
    description: 'GPS, navigation satellites',
  },
  GEO: {
    name: 'Geostationary Orbit (GEO)',
    altitude: 35786, // km
    deltaV: 14500, // m/s
    description: 'Communications, weather satellites',
  },
  TLI: {
    name: 'Trans-Lunar Injection',
    altitude: 384400, // km (Moon)
    deltaV: 16000, // m/s
    description: 'Moon missions',
  },
  escape: {
    name: 'Earth Escape',
    altitude: Infinity,
    deltaV: 17500, // m/s
    description: 'Interplanetary missions',
  },
} as const

export type OrbitType = keyof typeof ORBIT_PROFILES

// Launch site data (latitude affects delta-V)
export const LAUNCH_SITES = {
  'cape-canaveral': {
    name: 'Cape Canaveral',
    latitude: 28.5,
    deltaVBonus: 407, // m/s from Earth rotation
  },
  'baikonur': {
    name: 'Baikonur',
    latitude: 45.6,
    deltaVBonus: 316,
  },
  'kourou': {
    name: 'Kourou (French Guiana)',
    latitude: 5.2,
    deltaVBonus: 463, // Best for equatorial orbits
  },
  'vandenberg': {
    name: 'Vandenberg',
    latitude: 34.7,
    deltaVBonus: 0, // Polar orbits, no rotation bonus
  },
} as const

export type LaunchSite = keyof typeof LAUNCH_SITES

// Engine definitions
export interface Engine {
  id: string
  name: string
  thrust: number        // N (sea level)
  thrustVac: number     // N (vacuum)
  isp: number          // s (sea level)
  ispVac: number       // s (vacuum)
  mass: number         // kg
  cost: number         // $ (simplified)
}

export const ENGINES: Engine[] = [
  {
    id: 'merlin-1d',
    name: 'Merlin 1D',
    thrust: 845000,
    thrustVac: 914000,
    isp: 282,
    ispVac: 311,
    mass: 470,
    cost: 1000000,
  },
  {
    id: 'raptor-2',
    name: 'Raptor 2',
    thrust: 2300000,
    thrustVac: 2500000,
    isp: 327,
    ispVac: 380,
    mass: 1600,
    cost: 1500000,
  },
  {
    id: 'rs-25',
    name: 'RS-25',
    thrust: 1860000,
    thrustVac: 2279000,
    isp: 366,
    ispVac: 452,
    mass: 3527,
    cost: 50000000,
  },
  {
    id: 'be-4',
    name: 'BE-4',
    thrust: 2400000,
    thrustVac: 2600000,
    isp: 310,
    ispVac: 340,
    mass: 2000,
    cost: 3000000,
  },
  {
    id: 'rd-180',
    name: 'RD-180',
    thrust: 3830000,
    thrustVac: 4152000,
    isp: 311,
    ispVac: 338,
    mass: 5480,
    cost: 10000000,
  },
  {
    id: 'vacuum-opt',
    name: 'Vacuum Optimized',
    thrust: 500000,
    thrustVac: 800000,
    isp: 300,
    ispVac: 450,
    mass: 800,
    cost: 2000000,
  },
]

// Stage configuration
export interface StageConfig {
  engineId: string
  engineCount: number
  propellantMass: number  // kg
  structuralMass: number  // kg (tanks, structure, etc.)
}

// Rocket configuration
export interface RocketConfiguration {
  id: string
  name: string
  stages: StageConfig[]
  fairingMass: number     // kg
}

// Payload capacity result
export interface PayloadCapacity {
  configuration: RocketConfiguration
  maxPayload: number      // kg
  deltaVMargin: number    // m/s remaining after reaching orbit
  costPerKg: number       // $/kg to orbit
  totalCost: number       // $ total rocket cost
  twr: number             // Initial thrust-to-weight ratio
}

// Mission profile
export interface MissionProfile {
  targetOrbit: OrbitType | 'custom'
  customDeltaV?: number   // For custom orbits
  launchSite: LaunchSite
}

// Calculate exhaust velocity from Isp
function exhaustVelocity(isp: number): number {
  return isp * GRAVITY
}

// Calculate total stage mass (dry + propellant)
function stageTotalMass(stage: StageConfig): number {
  const engine = ENGINES.find(e => e.id === stage.engineId)
  if (!engine) return 0
  return stage.propellantMass + stage.structuralMass + engine.mass * stage.engineCount
}

// Calculate stage dry mass (no propellant)
function stageDryMass(stage: StageConfig): number {
  const engine = ENGINES.find(e => e.id === stage.engineId)
  if (!engine) return 0
  return stage.structuralMass + engine.mass * stage.engineCount
}

// Calculate stage thrust
function stageThrust(stage: StageConfig, isVacuum: boolean = false): number {
  const engine = ENGINES.find(e => e.id === stage.engineId)
  if (!engine) return 0
  return (isVacuum ? engine.thrustVac : engine.thrust) * stage.engineCount
}

// Calculate stage Isp
function stageIsp(stage: StageConfig, isVacuum: boolean = false): number {
  const engine = ENGINES.find(e => e.id === stage.engineId)
  if (!engine) return 0
  return isVacuum ? engine.ispVac : engine.isp
}

// Calculate stage cost
function stageCost(stage: StageConfig): number {
  const engine = ENGINES.find(e => e.id === stage.engineId)
  if (!engine) return 0
  // Engine cost + propellant cost (simplified: $5/kg) + structure cost ($100/kg)
  return engine.cost * stage.engineCount + stage.propellantMass * 5 + stage.structuralMass * 100
}

// Calculate required delta-V for mission
export function calculateRequiredDeltaV(profile: MissionProfile): number {
  if (profile.targetOrbit === 'custom') {
    return profile.customDeltaV || 9400
  }

  const orbitDV = ORBIT_PROFILES[profile.targetOrbit].deltaV
  const siteBonus = LAUNCH_SITES[profile.launchSite].deltaVBonus

  return orbitDV - siteBonus
}

// Calculate maximum payload for a configuration
export function calculateMaxPayload(
  config: RocketConfiguration,
  requiredDeltaV: number
): PayloadCapacity | null {
  // Binary search for max payload
  let lowPayload = 0
  let highPayload = 500000 // 500 tons max
  let bestPayload = 0
  let bestMargin = 0

  while (highPayload - lowPayload > 10) { // 10kg precision
    const midPayload = (lowPayload + highPayload) / 2
    const result = simulateLaunch(config, midPayload, requiredDeltaV)

    if (result.success) {
      bestPayload = midPayload
      bestMargin = result.deltaVMargin
      lowPayload = midPayload
    } else {
      highPayload = midPayload
    }
  }

  if (bestPayload === 0) return null

  // Calculate costs
  const totalCost = config.stages.reduce((sum, s) => sum + stageCost(s), 0) + config.fairingMass * 500
  const costPerKg = bestPayload > 0 ? totalCost / bestPayload : Infinity

  // Calculate initial TWR
  const totalMass = config.stages.reduce((sum, s) => sum + stageTotalMass(s), 0) + config.fairingMass + bestPayload
  const firstStageThrust = stageThrust(config.stages[0], false)
  const twr = firstStageThrust / (totalMass * GRAVITY)

  return {
    configuration: config,
    maxPayload: bestPayload,
    deltaVMargin: bestMargin,
    costPerKg,
    totalCost,
    twr,
  }
}

// Simulate launch with given payload
function simulateLaunch(
  config: RocketConfiguration,
  payload: number,
  requiredDeltaV: number
): { success: boolean; deltaVMargin: number } {
  let totalDeltaV = 0

  // Calculate delta-V for each stage (bottom to top)
  for (let i = 0; i < config.stages.length; i++) {
    const stage = config.stages[i]
    const isUpperStage = i > 0

    // Mass above this stage (upper stages + fairing + payload)
    let massAbove = payload + config.fairingMass
    for (let j = i + 1; j < config.stages.length; j++) {
      massAbove += stageTotalMass(config.stages[j])
    }

    // Wet and dry mass for this stage
    const wetMass = stageTotalMass(stage) + massAbove
    const dryMass = stageDryMass(stage) + massAbove

    if (dryMass <= 0) return { success: false, deltaVMargin: 0 }

    // Use vacuum Isp for upper stages
    const isp = stageIsp(stage, isUpperStage)
    const ve = exhaustVelocity(isp)

    // Tsiolkovsky rocket equation
    const stageDV = ve * Math.log(wetMass / dryMass)
    totalDeltaV += stageDV

    // Check TWR for first stage
    if (i === 0) {
      const twr = stageThrust(stage, false) / (wetMass * GRAVITY)
      if (twr < 1.1) return { success: false, deltaVMargin: 0 } // Need TWR > 1.1 minimum
    }
  }

  const deltaVMargin = totalDeltaV - requiredDeltaV
  return {
    success: deltaVMargin >= 0,
    deltaVMargin,
  }
}

// Generate Pareto-optimal configurations
export function generateParetoFrontier(
  results: PayloadCapacity[]
): PayloadCapacity[] {
  // Sort by payload descending
  const sorted = [...results].sort((a, b) => b.maxPayload - a.maxPayload)

  const pareto: PayloadCapacity[] = []
  let minCostSoFar = Infinity

  for (const r of sorted) {
    if (r.totalCost < minCostSoFar) {
      pareto.push(r)
      minCostSoFar = r.totalCost
    }
  }

  return pareto
}

// Pre-defined rocket configurations
export const ROCKET_CONFIGURATIONS: RocketConfiguration[] = [
  {
    id: 'falcon-9',
    name: 'Falcon 9-class',
    stages: [
      {
        engineId: 'merlin-1d',
        engineCount: 9,
        propellantMass: 395700,
        structuralMass: 22200,
      },
      {
        engineId: 'vacuum-opt',
        engineCount: 1,
        propellantMass: 92670,
        structuralMass: 4000,
      },
    ],
    fairingMass: 1700,
  },
  {
    id: 'falcon-heavy',
    name: 'Falcon Heavy-class',
    stages: [
      {
        engineId: 'merlin-1d',
        engineCount: 27, // 3 cores
        propellantMass: 1187100, // 3 cores
        structuralMass: 66600,
      },
      {
        engineId: 'vacuum-opt',
        engineCount: 1,
        propellantMass: 92670,
        structuralMass: 4000,
      },
    ],
    fairingMass: 1700,
  },
  {
    id: 'starship',
    name: 'Starship-class',
    stages: [
      {
        engineId: 'raptor-2',
        engineCount: 33,
        propellantMass: 3400000,
        structuralMass: 200000,
      },
      {
        engineId: 'raptor-2',
        engineCount: 6,
        propellantMass: 1200000,
        structuralMass: 100000,
      },
    ],
    fairingMass: 0, // Integrated
  },
  {
    id: 'sls-block1',
    name: 'SLS Block 1-class',
    stages: [
      {
        engineId: 'rs-25',
        engineCount: 4,
        propellantMass: 730000,
        structuralMass: 85000,
      },
      {
        engineId: 'vacuum-opt',
        engineCount: 1,
        propellantMass: 30000,
        structuralMass: 3000,
      },
    ],
    fairingMass: 8000,
  },
  {
    id: 'small-launcher',
    name: 'Small Launcher',
    stages: [
      {
        engineId: 'merlin-1d',
        engineCount: 1,
        propellantMass: 40000,
        structuralMass: 3000,
      },
      {
        engineId: 'vacuum-opt',
        engineCount: 1,
        propellantMass: 8000,
        structuralMass: 500,
      },
    ],
    fairingMass: 500,
  },
  {
    id: 'heavy-lifter',
    name: 'Heavy Lifter',
    stages: [
      {
        engineId: 'rd-180',
        engineCount: 4,
        propellantMass: 1000000,
        structuralMass: 80000,
      },
      {
        engineId: 'vacuum-opt',
        engineCount: 2,
        propellantMass: 150000,
        structuralMass: 10000,
      },
    ],
    fairingMass: 5000,
  },
]

// Calculate all payload capacities for a mission
export function calculateAllCapacities(
  profile: MissionProfile
): PayloadCapacity[] {
  const requiredDV = calculateRequiredDeltaV(profile)
  const results: PayloadCapacity[] = []

  for (const config of ROCKET_CONFIGURATIONS) {
    const capacity = calculateMaxPayload(config, requiredDV)
    if (capacity) {
      results.push(capacity)
    }
  }

  // Sort by payload capacity
  return results.sort((a, b) => b.maxPayload - a.maxPayload)
}

// Get recommended configuration based on priorities
export function getRecommendation(
  results: PayloadCapacity[],
  priorityPayload: number = 0.5 // 0 = cost, 1 = payload
): { recommended: PayloadCapacity; reason: string } | null {
  if (results.length === 0) return null

  const pareto = generateParetoFrontier(results)
  if (pareto.length === 0) return null

  // Normalize values
  const maxPayload = Math.max(...pareto.map(r => r.maxPayload))
  const minCost = Math.min(...pareto.map(r => r.totalCost))
  const maxCost = Math.max(...pareto.map(r => r.totalCost))

  // Score each option
  let bestScore = -Infinity
  let best: PayloadCapacity | null = null

  for (const r of pareto) {
    const payloadScore = r.maxPayload / maxPayload
    const costScore = 1 - (r.totalCost - minCost) / (maxCost - minCost || 1)
    const score = payloadScore * priorityPayload + costScore * (1 - priorityPayload)

    if (score > bestScore) {
      bestScore = score
      best = r
    }
  }

  if (!best) return null

  const reason = priorityPayload > 0.7
    ? `Best payload capacity (${(best.maxPayload / 1000).toFixed(1)} tons)`
    : priorityPayload < 0.3
    ? `Most cost-effective ($${(best.costPerKg).toFixed(0)}/kg)`
    : `Balanced payload/cost ratio`

  return { recommended: best, reason }
}
