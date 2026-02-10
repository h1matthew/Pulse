import { describe, it, expect } from 'vitest'
import {
  calculateRequiredDeltaV,
  calculateMaxPayload,
  calculateAllCapacities,
  generateParetoFrontier,
  getRecommendation,
  ORBIT_PROFILES,
  LAUNCH_SITES,
  ENGINES,
  ROCKET_CONFIGURATIONS,
  type MissionProfile,
} from '../payloadOptimizer'

describe('payloadOptimizer', () => {
  describe('calculateRequiredDeltaV', () => {
    it('should return base orbit delta-V minus launch site bonus', () => {
      const profile: MissionProfile = {
        targetOrbit: 'LEO',
        launchSite: 'cape-canaveral',
      }

      const required = calculateRequiredDeltaV(profile)
      const expected = ORBIT_PROFILES.LEO.deltaV - LAUNCH_SITES['cape-canaveral'].deltaVBonus

      expect(required).toBe(expected)
    })

    it('should use custom delta-V when orbit is custom', () => {
      const profile: MissionProfile = {
        targetOrbit: 'custom',
        customDeltaV: 12000,
        launchSite: 'kourou',
      }

      const required = calculateRequiredDeltaV(profile)

      // Custom delta-V should return a value based on the custom input
      expect(required).toBeGreaterThan(0)
      expect(required).toBeLessThanOrEqual(12000)
    })

    it('should return higher delta-V for harder orbits', () => {
      const leoProfile: MissionProfile = { targetOrbit: 'LEO', launchSite: 'cape-canaveral' }
      const geoProfile: MissionProfile = { targetOrbit: 'GEO', launchSite: 'cape-canaveral' }
      const escapeProfile: MissionProfile = { targetOrbit: 'escape', launchSite: 'cape-canaveral' }

      const leoDV = calculateRequiredDeltaV(leoProfile)
      const geoDV = calculateRequiredDeltaV(geoProfile)
      const escapeDV = calculateRequiredDeltaV(escapeProfile)

      expect(geoDV).toBeGreaterThan(leoDV)
      expect(escapeDV).toBeGreaterThan(geoDV)
    })

    it('should give Kourou the highest launch bonus (equatorial)', () => {
      const kourouBonus = LAUNCH_SITES.kourou.deltaVBonus
      const capeBonus = LAUNCH_SITES['cape-canaveral'].deltaVBonus
      const vandenbergBonus = LAUNCH_SITES.vandenberg.deltaVBonus

      expect(kourouBonus).toBeGreaterThan(capeBonus)
      expect(kourouBonus).toBeGreaterThan(vandenbergBonus)
    })
  })

  describe('calculateMaxPayload', () => {
    it('should calculate positive payload for LEO missions', () => {
      const falcon9 = ROCKET_CONFIGURATIONS.find(r => r.id === 'falcon-9')!
      const requiredDV = calculateRequiredDeltaV({ targetOrbit: 'LEO', launchSite: 'cape-canaveral' })

      const result = calculateMaxPayload(falcon9, requiredDV)

      expect(result).not.toBeNull()
      expect(result!.maxPayload).toBeGreaterThan(0)
    })

    it('should return lower payload for higher orbits', () => {
      const falcon9 = ROCKET_CONFIGURATIONS.find(r => r.id === 'falcon-9')!

      const leoDV = calculateRequiredDeltaV({ targetOrbit: 'LEO', launchSite: 'cape-canaveral' })
      const geoDV = calculateRequiredDeltaV({ targetOrbit: 'GEO', launchSite: 'cape-canaveral' })

      const leoResult = calculateMaxPayload(falcon9, leoDV)
      const geoResult = calculateMaxPayload(falcon9, geoDV)

      if (leoResult && geoResult) {
        expect(geoResult.maxPayload).toBeLessThan(leoResult.maxPayload)
      }
    })

    it('should calculate positive delta-V margin', () => {
      const falcon9 = ROCKET_CONFIGURATIONS.find(r => r.id === 'falcon-9')!
      const requiredDV = calculateRequiredDeltaV({ targetOrbit: 'LEO', launchSite: 'cape-canaveral' })

      const result = calculateMaxPayload(falcon9, requiredDV)

      expect(result).not.toBeNull()
      expect(result!.deltaVMargin).toBeGreaterThanOrEqual(0)
    })

    it('should calculate TWR > 1 for viable configurations', () => {
      const falcon9 = ROCKET_CONFIGURATIONS.find(r => r.id === 'falcon-9')!
      const requiredDV = calculateRequiredDeltaV({ targetOrbit: 'LEO', launchSite: 'cape-canaveral' })

      const result = calculateMaxPayload(falcon9, requiredDV)

      expect(result).not.toBeNull()
      expect(result!.twr).toBeGreaterThan(1)
    })
  })

  describe('calculateAllCapacities', () => {
    it('should return results for all configurations that can reach orbit', () => {
      const profile: MissionProfile = {
        targetOrbit: 'LEO',
        launchSite: 'cape-canaveral',
      }

      const results = calculateAllCapacities(profile)

      expect(results.length).toBeGreaterThan(0)
      results.forEach(r => {
        expect(r.maxPayload).toBeGreaterThan(0)
        expect(r.configuration).toBeDefined()
      })
    })

    it('should return results sorted by payload capacity (descending)', () => {
      const profile: MissionProfile = {
        targetOrbit: 'LEO',
        launchSite: 'cape-canaveral',
      }

      const results = calculateAllCapacities(profile)

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].maxPayload).toBeGreaterThanOrEqual(results[i].maxPayload)
      }
    })
  })

  describe('generateParetoFrontier', () => {
    it('should return subset of input results', () => {
      const profile: MissionProfile = {
        targetOrbit: 'LEO',
        launchSite: 'cape-canaveral',
      }

      const results = calculateAllCapacities(profile)
      const pareto = generateParetoFrontier(results)

      expect(pareto.length).toBeLessThanOrEqual(results.length)
      expect(pareto.length).toBeGreaterThan(0)
    })

    it('should contain non-dominated solutions only', () => {
      const profile: MissionProfile = {
        targetOrbit: 'LEO',
        launchSite: 'cape-canaveral',
      }

      const results = calculateAllCapacities(profile)
      const pareto = generateParetoFrontier(results)

      // Each Pareto solution should not be dominated by another
      pareto.forEach(p => {
        const dominated = pareto.filter(other =>
          other.maxPayload > p.maxPayload && other.totalCost < p.totalCost
        )
        expect(dominated.length).toBe(0)
      })
    })

    it('should have decreasing cost for decreasing payload on frontier', () => {
      const profile: MissionProfile = {
        targetOrbit: 'LEO',
        launchSite: 'cape-canaveral',
      }

      const results = calculateAllCapacities(profile)
      const pareto = generateParetoFrontier(results)

      // Pareto frontier: as payload decreases, cost should also decrease
      const sorted = [...pareto].sort((a, b) => b.maxPayload - a.maxPayload)
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].totalCost).toBeLessThanOrEqual(sorted[i - 1].totalCost)
      }
    })
  })

  describe('getRecommendation', () => {
    it('should return a recommendation when results exist', () => {
      const profile: MissionProfile = {
        targetOrbit: 'LEO',
        launchSite: 'cape-canaveral',
      }

      const results = calculateAllCapacities(profile)
      const recommendation = getRecommendation(results, 0.5)

      expect(recommendation).not.toBeNull()
      expect(recommendation!.recommended).toBeDefined()
      expect(recommendation!.reason).toBeTruthy()
    })

    it('should favor payload when priority is high', () => {
      const profile: MissionProfile = {
        targetOrbit: 'LEO',
        launchSite: 'cape-canaveral',
      }

      const results = calculateAllCapacities(profile)
      const payloadFocused = getRecommendation(results, 0.9)
      const costFocused = getRecommendation(results, 0.1)

      if (payloadFocused && costFocused) {
        // Payload-focused should have same or higher payload
        expect(payloadFocused.recommended.maxPayload).toBeGreaterThanOrEqual(
          costFocused.recommended.maxPayload
        )
      }
    })

    it('should favor cost when priority is low', () => {
      const profile: MissionProfile = {
        targetOrbit: 'LEO',
        launchSite: 'cape-canaveral',
      }

      const results = calculateAllCapacities(profile)
      const payloadFocused = getRecommendation(results, 0.9)
      const costFocused = getRecommendation(results, 0.1)

      if (payloadFocused && costFocused) {
        // Cost-focused should have same or lower cost
        expect(costFocused.recommended.totalCost).toBeLessThanOrEqual(
          payloadFocused.recommended.totalCost
        )
      }
    })

    it('should return null for empty results', () => {
      const recommendation = getRecommendation([], 0.5)
      expect(recommendation).toBeNull()
    })
  })

  describe('data integrity', () => {
    it('should have valid engine configurations', () => {
      ENGINES.forEach(engine => {
        expect(engine.id).toBeTruthy()
        expect(engine.name).toBeTruthy()
        expect(engine.thrust).toBeGreaterThan(0)
        expect(engine.thrustVac).toBeGreaterThanOrEqual(engine.thrust)
        expect(engine.isp).toBeGreaterThan(0)
        expect(engine.ispVac).toBeGreaterThanOrEqual(engine.isp)
        expect(engine.mass).toBeGreaterThan(0)
        expect(engine.cost).toBeGreaterThan(0)
      })
    })

    it('should have valid rocket configurations', () => {
      ROCKET_CONFIGURATIONS.forEach(config => {
        expect(config.id).toBeTruthy()
        expect(config.name).toBeTruthy()
        expect(config.stages.length).toBeGreaterThan(0)
        expect(config.fairingMass).toBeGreaterThanOrEqual(0)

        config.stages.forEach(stage => {
          const engine = ENGINES.find(e => e.id === stage.engineId)
          expect(engine).toBeDefined()
          expect(stage.engineCount).toBeGreaterThan(0)
          expect(stage.propellantMass).toBeGreaterThan(0)
          expect(stage.structuralMass).toBeGreaterThan(0)
        })
      })
    })

    it('should have increasing delta-V requirements for orbit types', () => {
      expect(ORBIT_PROFILES.LEO.deltaV).toBeLessThan(ORBIT_PROFILES.MEO.deltaV)
      expect(ORBIT_PROFILES.MEO.deltaV).toBeLessThan(ORBIT_PROFILES.GEO.deltaV)
      expect(ORBIT_PROFILES.GEO.deltaV).toBeLessThan(ORBIT_PROFILES.TLI.deltaV)
      expect(ORBIT_PROFILES.TLI.deltaV).toBeLessThan(ORBIT_PROFILES.escape.deltaV)
    })
  })
})
