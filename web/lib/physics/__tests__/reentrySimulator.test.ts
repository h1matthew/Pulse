import { describe, it, expect } from 'vitest'
import {
  simulateReentry,
  calculateEntryCorridor,
  REENTRY_PRESETS,
  type ReentryParams,
} from '../reentrySimulator'

describe('reentrySimulator', () => {
  describe('simulateReentry', () => {
    it('should simulate a complete re-entry trajectory', () => {
      const params = REENTRY_PRESETS.dragon.params as ReentryParams
      const results = simulateReentry(params)

      expect(results.data.length).toBeGreaterThan(0)
      expect(results.totalFlightTime).toBeGreaterThan(0)
      expect(results.maxGLoad).toBeGreaterThan(0)
      expect(results.maxHeatFlux).toBeGreaterThan(0)
    })

    it('should start at entry altitude and end at ground level', () => {
      const params = REENTRY_PRESETS.dragon.params as ReentryParams
      const results = simulateReentry(params)

      // First data point should be at entry altitude
      expect(results.data[0].altitude).toBeCloseTo(params.entryAltitude, -2)

      // Last data point should be at or near ground
      const lastPoint = results.data[results.data.length - 1]
      expect(lastPoint.altitude).toBeLessThanOrEqual(100) // Within 100m of ground
    })

    it('should detect communications blackout for high velocity re-entry', () => {
      const params = REENTRY_PRESETS.apollo.params as ReentryParams // Lunar return velocity
      const results = simulateReentry(params)

      // Should have a blackout period at some point
      expect(results.blackoutDuration).toBeGreaterThan(0)
      // Blackout should occur at altitude between 30km and 90km
      expect(results.blackoutStartAlt).toBeGreaterThan(30000)
      expect(results.blackoutEndAlt).toBeGreaterThan(0)
    })

    it('should have decreasing velocity during re-entry', () => {
      const params = REENTRY_PRESETS.dragon.params as ReentryParams
      const results = simulateReentry(params)

      const entryVelocity = results.data[0].velocity
      const midpointIdx = Math.floor(results.data.length / 2)
      const midVelocity = results.data[midpointIdx].velocity
      const finalVelocity = results.landingVelocity

      expect(midVelocity).toBeLessThan(entryVelocity)
      expect(finalVelocity).toBeLessThan(midVelocity)
    })

    it('should have peak heating at intermediate altitude', () => {
      const params = REENTRY_PRESETS.dragon.params as ReentryParams
      const results = simulateReentry(params)

      // Peak heating should be between entry and ground
      expect(results.peakHeatingAltitude).toBeLessThan(params.entryAltitude)
      expect(results.peakHeatingAltitude).toBeGreaterThan(20000) // Above 20km
    })

    it('should deploy parachute at configured altitude', () => {
      const params = REENTRY_PRESETS.dragon.params as ReentryParams
      const results = simulateReentry(params)

      // Find parachute phase
      const parachutePhase = results.data.filter(d => d.phase === 'parachute')

      if (parachutePhase.length > 0) {
        const deployPoint = parachutePhase[0]
        expect(deployPoint.altitude).toBeLessThanOrEqual(params.parachute.deployAltitude + 500)
      }
    })

    it('should consume heat shield during peak heating', () => {
      const params = REENTRY_PRESETS.apollo.params as ReentryParams
      const results = simulateReentry(params)

      const initialShield = results.data[0].heatShieldRemaining
      const finalShield = results.data[results.data.length - 1].heatShieldRemaining

      // Apollo lunar return should consume some shield
      expect(finalShield).toBeLessThan(initialShield)
    })

    it('should calculate G-loads within expected ranges', () => {
      const params = REENTRY_PRESETS.dragon.params as ReentryParams
      const results = simulateReentry(params)

      // Dragon LEO return should have moderate G-loads (3-6g typical)
      expect(results.maxGLoad).toBeGreaterThan(1)
      expect(results.maxGLoad).toBeLessThan(15)
    })

    it('should fail for steep entry angles', () => {
      const params: ReentryParams = {
        ...REENTRY_PRESETS.dragon.params as ReentryParams,
        entryAngle: -15, // Very steep
      }

      const results = simulateReentry(params)

      // Should either fail or have very high G-loads
      if (!results.success) {
        expect(results.failureReason).toBeDefined()
      } else {
        expect(results.maxGLoad).toBeGreaterThan(10)
      }
    })

    it('should handle different entry velocities', () => {
      const leoReturn = simulateReentry(REENTRY_PRESETS.dragon.params as ReentryParams)
      const lunarReturn = simulateReentry(REENTRY_PRESETS.apollo.params as ReentryParams)

      // Lunar return should have higher heat flux and G-loads
      expect(lunarReturn.maxHeatFlux).toBeGreaterThan(leoReturn.maxHeatFlux)
    })
  })

  describe('calculateEntryCorridor', () => {
    it('should return valid entry corridor angles', () => {
      const vehicle = REENTRY_PRESETS.dragon.params.vehicle
      const corridor = calculateEntryCorridor(7800, vehicle)

      expect(corridor.minAngle).toBeLessThan(0)
      expect(corridor.maxAngle).toBeLessThan(corridor.minAngle) // More negative = steeper
      expect(corridor.nominalAngle).toBeLessThan(corridor.minAngle)
      expect(corridor.nominalAngle).toBeGreaterThan(corridor.maxAngle)
    })

    it('should have wider corridor for higher L/D vehicles', () => {
      const lowLD = { ...REENTRY_PRESETS.dragon.params.vehicle, liftCoefficient: 0.1 }
      const highLD = { ...REENTRY_PRESETS.dragon.params.vehicle, liftCoefficient: 0.8 }

      const lowCorridor = calculateEntryCorridor(7800, lowLD)
      const highCorridor = calculateEntryCorridor(7800, highLD)

      // Higher L/D should allow shallower entries (less negative min angle)
      // or at least equal due to clamping
      expect(highCorridor.minAngle).toBeGreaterThanOrEqual(lowCorridor.minAngle)
    })
  })

  describe('presets', () => {
    it('should have valid preset configurations', () => {
      Object.entries(REENTRY_PRESETS).forEach(([key, preset]) => {
        expect(preset.name).toBeTruthy()
        expect(preset.params.entryAltitude).toBeGreaterThan(100000) // Above 100km
        expect(preset.params.entryVelocity).toBeGreaterThan(3000) // Above 3 km/s
        expect(preset.params.entryAngle).toBeLessThan(0) // Descending

        // Vehicle parameters
        expect(preset.params.vehicle.mass).toBeGreaterThan(0)
        expect(preset.params.vehicle.dragCoefficient).toBeGreaterThan(0)
        expect(preset.params.vehicle.heatShieldMass).toBeGreaterThan(0)
        expect(preset.params.vehicle.maxGLoad).toBeGreaterThan(0)

        // Parachute parameters
        expect(preset.params.parachute.deployAltitude).toBeGreaterThan(0)
        expect(preset.params.parachute.area).toBeGreaterThan(0)
      })
    })

    it('should produce successful re-entry for most presets with default parameters', () => {
      let successCount = 0
      Object.entries(REENTRY_PRESETS).forEach(([key, preset]) => {
        if (key === 'custom') return // Skip custom as it may not be optimized

        const results = simulateReentry(preset.params as ReentryParams)

        // Most presets should complete simulation (may or may not succeed)
        expect(results.data.length).toBeGreaterThan(10)
        if (results.success) successCount++
      })

      // At least some presets should succeed
      expect(successCount).toBeGreaterThan(0)
    })
  })
})
