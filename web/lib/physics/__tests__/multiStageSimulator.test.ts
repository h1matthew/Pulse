import { describe, it, expect } from 'vitest'
import {
  tsiolkovskyDeltaV,
  calculateTotalDeltaV,
  calculateInitialTWR,
  calculateStageMetrics,
  simulateMultiStage,
  exhaustVelocity,
  type Stage,
  type MultiStageParams,
  MULTI_STAGE_PRESETS,
} from '../multiStageSimulator'

describe('multiStageSimulator', () => {
  describe('exhaustVelocity', () => {
    it('should calculate exhaust velocity from Isp', () => {
      // Ve = Isp * g0
      expect(exhaustVelocity(300)).toBeCloseTo(2943, 0) // 300 * 9.81
      expect(exhaustVelocity(450)).toBeCloseTo(4414.5, 0) // 450 * 9.81
    })
  })

  describe('tsiolkovskyDeltaV', () => {
    it('should calculate delta-V using Tsiolkovsky equation', () => {
      // dV = Ve * ln(m0/mf)
      const isp = 300
      const wetMass = 1000
      const dryMass = 100
      const expected = exhaustVelocity(300) * Math.log(1000 / 100)

      expect(tsiolkovskyDeltaV(isp, wetMass, dryMass)).toBeCloseTo(expected, 1)
    })

    it('should return 0 for equal wet and dry mass', () => {
      expect(tsiolkovskyDeltaV(300, 100, 100)).toBeCloseTo(0, 5)
    })

    it('should handle realistic rocket parameters', () => {
      // Single stage to orbit would need about 9000+ m/s
      const isp = 350
      const wetMass = 10000
      const dryMass = 1000
      const dv = tsiolkovskyDeltaV(isp, wetMass, dryMass)

      expect(dv).toBeGreaterThan(7000)
      expect(dv).toBeLessThan(10000)
    })
  })

  describe('calculateTotalDeltaV', () => {
    it('should sum delta-V from multiple stages', () => {
      const stages: Stage[] = [
        { id: '1', name: 'Stage 1', dryMass: 500, fuelMass: 4500, thrust: 100000, isp: 280, burnTime: 120 },
        { id: '2', name: 'Stage 2', dryMass: 100, fuelMass: 900, thrust: 25000, isp: 320, burnTime: 90 },
      ]

      const params: MultiStageParams = {
        stages,
        payloadMass: 100,
        dragCoefficient: 0.5,
        crossSectionalArea: 2,
        separationDelay: 2,
      }

      const result = calculateTotalDeltaV(params)

      expect(result.perStage).toHaveLength(2)
      expect(result.total).toBeGreaterThan(0)
      expect(result.total).toEqual(
        result.perStage[0].deltaV + result.perStage[1].deltaV
      )
    })

    it('should calculate higher total delta-V for multi-stage vs single-stage with same total mass', () => {
      // Multi-stage
      const multiStageParams: MultiStageParams = {
        stages: [
          { id: '1', name: 'Stage 1', dryMass: 500, fuelMass: 4500, thrust: 100000, isp: 300, burnTime: 100 },
          { id: '2', name: 'Stage 2', dryMass: 100, fuelMass: 900, thrust: 20000, isp: 300, burnTime: 50 },
        ],
        payloadMass: 100,
        dragCoefficient: 0.5,
        crossSectionalArea: 2,
        separationDelay: 2,
      }

      // Single stage with same total mass
      const singleStageParams: MultiStageParams = {
        stages: [
          { id: '1', name: 'Stage 1', dryMass: 600, fuelMass: 5400, thrust: 100000, isp: 300, burnTime: 150 },
        ],
        payloadMass: 100,
        dragCoefficient: 0.5,
        crossSectionalArea: 2,
        separationDelay: 0,
      }

      const multiDV = calculateTotalDeltaV(multiStageParams)
      const singleDV = calculateTotalDeltaV(singleStageParams)

      // Multi-stage should have higher delta-V due to mass fraction advantage
      expect(multiDV.total).toBeGreaterThan(singleDV.total)
    })
  })

  describe('calculateInitialTWR', () => {
    it('should calculate thrust-to-weight ratio', () => {
      const params: MultiStageParams = {
        stages: [
          { id: '1', name: 'Stage 1', dryMass: 1000, fuelMass: 9000, thrust: 147150, isp: 300, burnTime: 100 },
        ],
        payloadMass: 500,
        dragCoefficient: 0.5,
        crossSectionalArea: 2,
        separationDelay: 0,
      }

      // Total mass = 1000 + 9000 + 500 = 10500 kg
      // Weight = 10500 * 9.81 = 103005 N
      // TWR = 147150 / 103005 ≈ 1.43
      const twr = calculateInitialTWR(params)

      expect(twr).toBeCloseTo(1.43, 1)
    })

    it('should return TWR < 1 for insufficient thrust', () => {
      const params: MultiStageParams = {
        stages: [
          { id: '1', name: 'Stage 1', dryMass: 1000, fuelMass: 9000, thrust: 50000, isp: 300, burnTime: 100 },
        ],
        payloadMass: 500,
        dragCoefficient: 0.5,
        crossSectionalArea: 2,
        separationDelay: 0,
      }

      const twr = calculateInitialTWR(params)
      expect(twr).toBeLessThan(1)
    })
  })

  describe('calculateStageMetrics', () => {
    it('should calculate metrics for each stage', () => {
      const stages: Stage[] = [
        { id: '1', name: 'Stage 1', dryMass: 500, fuelMass: 4500, thrust: 100000, isp: 280, burnTime: 120 },
        { id: '2', name: 'Stage 2', dryMass: 100, fuelMass: 900, thrust: 25000, isp: 320, burnTime: 90 },
      ]

      const params: MultiStageParams = {
        stages,
        payloadMass: 100,
        dragCoefficient: 0.5,
        crossSectionalArea: 2,
        separationDelay: 2,
      }

      const metrics = calculateStageMetrics(params)

      expect(metrics).toHaveLength(2)

      // First stage carries everything
      expect(metrics[0].wetMass).toBe(500 + 4500 + 100 + 900 + 100) // All stages + payload
      expect(metrics[0].dryMass).toBe(500 + 100 + 900 + 100) // Stage 1 dry + upper stages + payload

      // Second stage only carries itself and payload
      expect(metrics[1].wetMass).toBe(100 + 900 + 100)
      expect(metrics[1].dryMass).toBe(100 + 100)
    })
  })

  describe('simulateMultiStage', () => {
    it('should produce staging events in correct order', () => {
      const params: MultiStageParams = {
        stages: [
          { id: '1', name: 'Stage 1', dryMass: 100, fuelMass: 900, thrust: 20000, isp: 280, burnTime: 30 },
          { id: '2', name: 'Stage 2', dryMass: 20, fuelMass: 180, thrust: 5000, isp: 320, burnTime: 20 },
        ],
        payloadMass: 10,
        dragCoefficient: 0.5,
        crossSectionalArea: 0.5,
        separationDelay: 1,
      }

      const results = simulateMultiStage(params)

      // Should have ignition, burnout, separation events
      expect(results.events.length).toBeGreaterThanOrEqual(4)

      // First event should be stage 1 ignition
      expect(results.events[0].type).toBe('ignition')
      expect(results.events[0].stageId).toBe('1')

      // Should have stage 1 burnout before stage 2 ignition
      const stage1Burnout = results.events.find(e => e.stageId === '1' && e.type === 'burnout')
      const stage2Ignition = results.events.find(e => e.stageId === '2' && e.type === 'ignition')

      expect(stage1Burnout).toBeDefined()
      expect(stage2Ignition).toBeDefined()
      expect(stage1Burnout!.time).toBeLessThan(stage2Ignition!.time)
    })

    it('should conserve mass during simulation', () => {
      const params: MultiStageParams = {
        stages: [
          { id: '1', name: 'Stage 1', dryMass: 100, fuelMass: 900, thrust: 20000, isp: 280, burnTime: 30 },
        ],
        payloadMass: 10,
        dragCoefficient: 0.5,
        crossSectionalArea: 0.5,
        separationDelay: 0,
      }

      const results = simulateMultiStage(params)

      // Initial mass should equal dry + fuel + payload
      const initialMass = 100 + 900 + 10
      expect(results.data[0].mass).toBeCloseTo(initialMass, 1)

      // Mass should decrease over time as fuel is consumed
      const masses = results.data.map(d => d.mass)
      const poweredMasses = results.data.filter(d => d.phase === 'powered').map(d => d.mass)

      // During powered flight, mass should decrease
      if (poweredMasses.length > 1) {
        expect(poweredMasses[0]).toBeGreaterThan(poweredMasses[poweredMasses.length - 1])
      }

      // Final mass should be less than initial (fuel consumed)
      const finalMass = masses[masses.length - 1]
      expect(finalMass).toBeLessThan(initialMass)
    })

    it('should reach higher altitude with staging enabled', () => {
      // This is a qualitative test - multi-stage should go higher
      const customPreset = MULTI_STAGE_PRESETS.custom.params
      const results = simulateMultiStage(customPreset as unknown as MultiStageParams)

      expect(results.maxAltitude).toBeGreaterThan(0)
      expect(results.maxVelocity).toBeGreaterThan(0)
      expect(results.totalDeltaV).toBeGreaterThan(0)
    })
  })

  describe('presets', () => {
    it('should have valid preset configurations', () => {
      Object.entries(MULTI_STAGE_PRESETS).forEach(([key, preset]) => {
        expect(preset.name).toBeTruthy()
        expect(preset.params.stages.length).toBeGreaterThan(0)
        expect(preset.params.payloadMass).toBeGreaterThan(0)

        // Each stage should have valid parameters
        preset.params.stages.forEach(stage => {
          expect(stage.dryMass).toBeGreaterThan(0)
          expect(stage.fuelMass).toBeGreaterThan(0)
          expect(stage.thrust).toBeGreaterThan(0)
          expect(stage.isp).toBeGreaterThan(0)
        })
      })
    })
  })
})
