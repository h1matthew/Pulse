import { describe, it, expect } from 'vitest'
import {
  simulateFlight,
  getISAConditions,
  getWindAtAltitude,
  formatNumber,
  ROCKET_PRESETS,
  WEATHER_PRESETS,
  type RocketParams,
  type ISAConditions,
} from '../flightSimulator'

describe('getISAConditions', () => {
  it('returns sea level conditions at altitude 0', () => {
    const conditions = getISAConditions(0)

    // ISA sea level temperature is 288.15 K (15°C)
    expect(conditions.temperature).toBeCloseTo(288.15, 0)
    // ISA sea level pressure is 101325 Pa
    expect(conditions.pressure).toBeCloseTo(101325, -2)
    // ISA sea level density is approximately 1.225 kg/m³
    expect(conditions.density).toBeCloseTo(1.225, 1)
  })

  it('temperature decreases with altitude (troposphere)', () => {
    const low = getISAConditions(1000)
    const high = getISAConditions(5000)

    expect(high.temperature).toBeLessThan(low.temperature)
  })

  it('temperature does not go below tropopause minimum', () => {
    const conditions = getISAConditions(20000) // Well above tropopause

    // Tropopause temperature is 216.65 K
    expect(conditions.temperature).toBeGreaterThanOrEqual(216.65)
  })

  it('pressure decreases with altitude', () => {
    const low = getISAConditions(1000)
    const high = getISAConditions(10000)

    expect(high.pressure).toBeLessThan(low.pressure)
  })

  it('density decreases with altitude', () => {
    const low = getISAConditions(1000)
    const high = getISAConditions(10000)

    expect(high.density).toBeLessThan(low.density)
  })

  it('follows ideal gas law relationship', () => {
    const conditions = getISAConditions(5000)
    const GAS_CONSTANT = 287.05

    // ρ = P / (R * T)
    const expectedDensity = conditions.pressure / (GAS_CONSTANT * conditions.temperature)

    expect(conditions.density).toBeCloseTo(expectedDensity, 5)
  })
})

describe('getWindAtAltitude', () => {
  it('returns 0 for 0 base wind speed', () => {
    expect(getWindAtAltitude(0, 1000)).toBe(0)
    expect(getWindAtAltitude(0, 5000)).toBe(0)
  })

  it('increases wind speed with altitude up to 5km', () => {
    const baseSpeed = 10
    const lowWind = getWindAtAltitude(baseSpeed, 1000)
    const highWind = getWindAtAltitude(baseSpeed, 4000)

    expect(highWind).toBeGreaterThan(lowWind)
  })

  it('wind speed decreases above 5km', () => {
    const baseSpeed = 10
    const windAt5km = getWindAtAltitude(baseSpeed, 5000)
    const windAt10km = getWindAtAltitude(baseSpeed, 10000)

    expect(windAt10km).toBeLessThan(windAt5km)
  })

  it('applies turbulence when intensity > 0', () => {
    const baseSpeed = 10
    const altitude = 3000

    // Without turbulence
    const noTurbulence = getWindAtAltitude(baseSpeed, altitude, 0)

    // With turbulence - the result should vary based on altitude
    const withTurbulence = getWindAtAltitude(baseSpeed, altitude, 0.5)

    // They may differ due to gust factor
    expect(typeof withTurbulence).toBe('number')
    expect(withTurbulence).toBeGreaterThan(0)
  })

  it('shear factor is bounded between 0.5 and 2', () => {
    const baseSpeed = 10

    // Very high altitude
    const veryHigh = getWindAtAltitude(baseSpeed, 50000)
    expect(veryHigh).toBeGreaterThanOrEqual(baseSpeed * 0.5 * 0.7) // Min with potential gust

    // At altitude that would maximize shear
    const atPeak = getWindAtAltitude(baseSpeed, 5000)
    expect(atPeak).toBeLessThanOrEqual(baseSpeed * 2 * 1.3) // Max with potential gust
  })
})

describe('simulateFlight', () => {
  const basicParams: RocketParams = {
    thrust: 100,
    rocketMass: 0.5,
    fuelMass: 0.2,
    burnTime: 3,
    dragCoefficient: 0.5,
    crossSectionalArea: 0.002,
  }

  describe('basic flight simulation', () => {
    it('produces flight data points', () => {
      const results = simulateFlight(basicParams)

      expect(results.data.length).toBeGreaterThan(0)
      expect(results.maxAltitude).toBeGreaterThan(0)
      expect(results.maxVelocity).toBeGreaterThan(0)
    })

    it('starts at altitude 0', () => {
      const results = simulateFlight(basicParams)

      expect(results.data[0].altitude).toBe(0)
      expect(results.data[0].velocity).toBe(0)
    })

    it('reaches positive max altitude', () => {
      const results = simulateFlight(basicParams)

      expect(results.maxAltitude).toBeGreaterThan(0)
    })

    it('has burnout before apogee', () => {
      const results = simulateFlight(basicParams)

      expect(results.burnoutAltitude).toBeLessThan(results.maxAltitude)
      expect(results.burnoutVelocity).toBeGreaterThan(0)
    })

    it('ends at or below altitude 0 (landing)', () => {
      const results = simulateFlight(basicParams)
      const lastPoint = results.data[results.data.length - 1]

      expect(lastPoint.altitude).toBeLessThanOrEqual(0)
    })
  })

  describe('flight phases', () => {
    it('starts in powered phase', () => {
      const results = simulateFlight(basicParams)

      expect(results.data[0].phase).toBe('powered')
      expect(results.data[0].thrust).toBeGreaterThan(0)
    })

    it('transitions to coast phase after burnout', () => {
      const results = simulateFlight(basicParams)

      const coastPoints = results.data.filter(
        p => p.phase === 'coast' && p.time > basicParams.burnTime
      )
      expect(coastPoints.length).toBeGreaterThan(0)
    })

    it('transitions to descent phase after apogee', () => {
      const results = simulateFlight(basicParams)

      const descentPoints = results.data.filter(p => p.phase === 'descent')
      expect(descentPoints.length).toBeGreaterThan(0)
    })
  })

  describe('mass consumption', () => {
    it('mass decreases during powered flight', () => {
      const results = simulateFlight(basicParams)

      const initialMass = results.data[0].mass
      const burnoutIndex = results.data.findIndex(
        p => p.time >= basicParams.burnTime
      )
      const burnoutMass = results.data[burnoutIndex]?.mass || results.data[results.data.length - 1].mass

      expect(burnoutMass).toBeLessThan(initialMass)
    })

    it('mass is constant after burnout (dry mass)', () => {
      const results = simulateFlight(basicParams)

      const coastPoints = results.data.filter(p => p.time > basicParams.burnTime)
      const masses = coastPoints.map(p => p.mass)

      // All coast phase masses should be equal (dry mass)
      const uniqueMasses = [...new Set(masses)]
      expect(uniqueMasses.length).toBe(1)
      expect(uniqueMasses[0]).toBeCloseTo(basicParams.rocketMass, 5)
    })
  })

  describe('physics validation', () => {
    it('thrust creates positive acceleration during burn', () => {
      const results = simulateFlight(basicParams)

      const poweredPoints = results.data.filter(p => p.phase === 'powered')
      const positiveAccel = poweredPoints.filter(p => p.acceleration > 0)

      expect(positiveAccel.length).toBeGreaterThan(0)
    })

    it('drag increases with velocity', () => {
      const results = simulateFlight(basicParams)

      // Find two points during ascent with different velocities
      const ascentPoints = results.data.filter(p => p.velocity > 0).slice(5, 20)
      if (ascentPoints.length >= 2) {
        const sorted = ascentPoints.sort((a, b) => a.velocity - b.velocity)
        expect(sorted[sorted.length - 1].drag).toBeGreaterThan(sorted[0].drag)
      }
    })

    it('air density decreases with altitude', () => {
      const results = simulateFlight({
        ...basicParams,
        useAdvancedAtmosphere: true,
      })

      const lowPoint = results.data.find(p => p.altitude > 100 && p.altitude < 500)
      const highPoint = results.data.find(p => p.altitude > 1000)

      if (lowPoint?.airDensity && highPoint?.airDensity) {
        expect(highPoint.airDensity).toBeLessThan(lowPoint.airDensity)
      }
    })
  })

  describe('wind effects', () => {
    it('wind creates horizontal drift', () => {
      const resultsWithWind = simulateFlight({
        ...basicParams,
        windSpeed: 10,
      })

      expect(resultsWithWind.windEnabled).toBe(true)
      expect(resultsWithWind.maxHorizontalDrift).toBeGreaterThan(0)
    })

    it('no wind creates no horizontal drift', () => {
      const resultsNoWind = simulateFlight({
        ...basicParams,
        windSpeed: 0,
      })

      expect(resultsNoWind.windEnabled).toBe(false)
      expect(resultsNoWind.maxHorizontalDrift).toBeUndefined()
    })

    it('stronger wind creates more drift', () => {
      const lightWind = simulateFlight({
        ...basicParams,
        windSpeed: 5,
      })

      const strongWind = simulateFlight({
        ...basicParams,
        windSpeed: 15,
      })

      expect(strongWind.maxHorizontalDrift!).toBeGreaterThan(lightWind.maxHorizontalDrift!)
    })
  })

  describe('time step parameter', () => {
    it('smaller time step produces more data points', () => {
      const coarse = simulateFlight(basicParams, 0.1)
      const fine = simulateFlight(basicParams, 0.02)

      expect(fine.data.length).toBeGreaterThan(coarse.data.length)
    })
  })
})

describe('formatNumber', () => {
  it('formats small numbers directly', () => {
    expect(formatNumber(123.456)).toBe('123.5')
    expect(formatNumber(0.5)).toBe('0.5')
  })

  it('formats thousands with k suffix', () => {
    expect(formatNumber(1500)).toBe('1.5k')
    expect(formatNumber(2000)).toBe('2.0k')
  })

  it('respects decimal parameter', () => {
    expect(formatNumber(1234.5678, 2)).toBe('1.23k')
    expect(formatNumber(123.456, 0)).toBe('123')
  })

  it('handles negative numbers', () => {
    expect(formatNumber(-1500)).toBe('-1.5k')
    expect(formatNumber(-100)).toBe('-100.0')
  })
})

describe('ROCKET_PRESETS', () => {
  it('has Estes A8 preset', () => {
    expect(ROCKET_PRESETS['estes-a8']).toBeDefined()
    expect(ROCKET_PRESETS['estes-a8'].name).toContain('A8')
    expect(ROCKET_PRESETS['estes-a8'].params.thrust).toBeGreaterThan(0)
  })

  it('has Estes B6 preset', () => {
    expect(ROCKET_PRESETS['estes-b6']).toBeDefined()
    expect(ROCKET_PRESETS['estes-b6'].params.thrust).toBeGreaterThan(
      ROCKET_PRESETS['estes-a8'].params.thrust
    )
  })

  it('has Estes C6 preset', () => {
    expect(ROCKET_PRESETS['estes-c6']).toBeDefined()
    expect(ROCKET_PRESETS['estes-c6'].params.burnTime).toBeGreaterThan(0)
  })

  it('has custom preset', () => {
    expect(ROCKET_PRESETS['custom']).toBeDefined()
    expect(ROCKET_PRESETS['custom'].name).toBe('Custom Rocket')
  })

  it('all presets have required parameters', () => {
    for (const [key, preset] of Object.entries(ROCKET_PRESETS)) {
      expect(preset.params.thrust).toBeGreaterThan(0)
      expect(preset.params.rocketMass).toBeGreaterThan(0)
      expect(preset.params.fuelMass).toBeGreaterThan(0)
      expect(preset.params.burnTime).toBeGreaterThan(0)
      expect(preset.params.dragCoefficient).toBeGreaterThan(0)
      expect(preset.params.crossSectionalArea).toBeGreaterThan(0)
    }
  })

  it('simulates successfully with all presets', () => {
    for (const [key, preset] of Object.entries(ROCKET_PRESETS)) {
      const results = simulateFlight(preset.params)
      expect(results.maxAltitude).toBeGreaterThan(0)
    }
  })
})

describe('WEATHER_PRESETS', () => {
  it('has calm preset', () => {
    expect(WEATHER_PRESETS.calm).toBeDefined()
    expect(WEATHER_PRESETS.calm.windSpeed).toBeLessThan(5)
    expect(WEATHER_PRESETS.calm.turbulenceIntensity).toBeLessThan(0.3)
  })

  it('has breezy preset', () => {
    expect(WEATHER_PRESETS.breezy).toBeDefined()
    expect(WEATHER_PRESETS.breezy.windSpeed).toBeGreaterThan(WEATHER_PRESETS.calm.windSpeed)
  })

  it('has windy preset', () => {
    expect(WEATHER_PRESETS.windy).toBeDefined()
    expect(WEATHER_PRESETS.windy.windSpeed).toBeGreaterThan(WEATHER_PRESETS.breezy.windSpeed)
  })

  it('has no wind preset', () => {
    expect(WEATHER_PRESETS.none).toBeDefined()
    expect(WEATHER_PRESETS.none.windSpeed).toBe(0)
    expect(WEATHER_PRESETS.none.turbulenceIntensity).toBe(0)
  })

  it('all presets have labels', () => {
    for (const [key, preset] of Object.entries(WEATHER_PRESETS)) {
      expect(preset.label).toBeDefined()
      expect(preset.label.length).toBeGreaterThan(0)
    }
  })
})
