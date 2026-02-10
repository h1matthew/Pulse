import { describe, it, expect } from 'vitest'
import {
  orbitalVelocity,
  circularVelocity,
  escapeVelocity,
  orbitalPeriod,
  calculateOrbit,
  calculateHohmannTransfer,
  formatTime,
  ORBIT_PRESETS,
  EARTH_RADIUS_KM,
} from '../orbitalMechanics'

// Physical constants for verification
const G = 6.674e-11 // Gravitational constant
const M_EARTH = 5.972e24 // Mass of Earth
const R_EARTH = 6.371e6 // Radius of Earth (m)
const MU = G * M_EARTH // Standard gravitational parameter

describe('orbitalVelocity', () => {
  it('calculates correct velocity for circular orbit', () => {
    // For a circular orbit, orbital velocity should equal circular velocity
    const radius = R_EARTH + 400e3 // 400 km altitude (ISS)
    const semiMajorAxis = radius // Circular orbit

    const result = orbitalVelocity(radius, semiMajorAxis)
    const expected = circularVelocity(radius)

    expect(result).toBeCloseTo(expected, 0)
  })

  it('calculates higher velocity at periapsis than apoapsis', () => {
    // For elliptical orbit from 200km to 400km altitude
    const periapsisRadius = R_EARTH + 200e3
    const apoapsisRadius = R_EARTH + 400e3
    const semiMajorAxis = (periapsisRadius + apoapsisRadius) / 2

    const vPeriapsis = orbitalVelocity(periapsisRadius, semiMajorAxis)
    const vApoapsis = orbitalVelocity(apoapsisRadius, semiMajorAxis)

    expect(vPeriapsis).toBeGreaterThan(vApoapsis)
  })
})

describe('circularVelocity', () => {
  it('calculates approximately 7.66 km/s for ISS orbit (400 km)', () => {
    const radius = R_EARTH + 400e3 // 400 km altitude
    const result = circularVelocity(radius)

    // ISS orbital velocity is approximately 7.66 km/s
    expect(result / 1000).toBeCloseTo(7.66, 1)
  })

  it('decreases with altitude', () => {
    const lowOrbitVelocity = circularVelocity(R_EARTH + 200e3)
    const highOrbitVelocity = circularVelocity(R_EARTH + 1000e3)

    expect(lowOrbitVelocity).toBeGreaterThan(highOrbitVelocity)
  })

  it('matches formula v = sqrt(μ/r)', () => {
    const radius = R_EARTH + 500e3
    const result = circularVelocity(radius)
    const expected = Math.sqrt(MU / radius)

    expect(result).toBeCloseTo(expected, 5)
  })
})

describe('escapeVelocity', () => {
  it('calculates approximately 11.2 km/s at Earth surface', () => {
    const result = escapeVelocity(R_EARTH)
    // Earth escape velocity is approximately 11.2 km/s
    expect(result / 1000).toBeCloseTo(11.2, 0)
  })

  it('is sqrt(2) times circular velocity at same radius', () => {
    const radius = R_EARTH + 400e3
    const vCircular = circularVelocity(radius)
    const vEscape = escapeVelocity(radius)

    expect(vEscape / vCircular).toBeCloseTo(Math.sqrt(2), 5)
  })

  it('decreases with altitude', () => {
    const lowEscape = escapeVelocity(R_EARTH)
    const highEscape = escapeVelocity(R_EARTH + 1000e3)

    expect(lowEscape).toBeGreaterThan(highEscape)
  })
})

describe('orbitalPeriod', () => {
  it('calculates approximately 90 minutes for ISS orbit', () => {
    const semiMajorAxis = R_EARTH + 400e3 // 400 km altitude
    const result = orbitalPeriod(semiMajorAxis)

    // ISS orbital period is approximately 92 minutes
    const minutes = result / 60
    expect(minutes).toBeCloseTo(92, -1)
  })

  it('increases with semi-major axis', () => {
    const lowOrbitPeriod = orbitalPeriod(R_EARTH + 200e3)
    const highOrbitPeriod = orbitalPeriod(R_EARTH + 1000e3)

    expect(highOrbitPeriod).toBeGreaterThan(lowOrbitPeriod)
  })

  it('calculates approximately 24 hours for geostationary orbit', () => {
    const geoRadius = R_EARTH + 35786e3 // GEO altitude
    const result = orbitalPeriod(geoRadius)

    // GEO period should be about 24 hours (86400 seconds)
    const hours = result / 3600
    expect(hours).toBeCloseTo(24, 0)
  })
})

describe('calculateOrbit', () => {
  it('returns correct orbit data for circular orbit', () => {
    const altitude = 400 // km
    const orbit = calculateOrbit(altitude, altitude)

    expect(orbit.periapsisAltitude).toBe(altitude)
    expect(orbit.apoapsisAltitude).toBe(altitude)
    expect(orbit.eccentricity).toBeCloseTo(0, 5)
  })

  it('calculates correct eccentricity for elliptical orbit', () => {
    const periapsis = 200 // km
    const apoapsis = 400 // km
    const orbit = calculateOrbit(periapsis, apoapsis)

    // e = (ra - rp) / (ra + rp)
    const rp = EARTH_RADIUS_KM + periapsis
    const ra = EARTH_RADIUS_KM + apoapsis
    const expectedEccentricity = (ra - rp) / (ra + rp)

    expect(orbit.eccentricity).toBeCloseTo(expectedEccentricity, 5)
  })

  it('has higher velocity at periapsis than apoapsis', () => {
    const orbit = calculateOrbit(200, 1000)

    expect(orbit.periapsisVelocity).toBeGreaterThan(orbit.apoapsisVelocity)
  })

  it('calculates correct semi-major axis', () => {
    const periapsis = 200 // km
    const apoapsis = 800 // km
    const orbit = calculateOrbit(periapsis, apoapsis)

    const rp = EARTH_RADIUS_KM + periapsis
    const ra = EARTH_RADIUS_KM + apoapsis
    const expectedSMA = (rp + ra) / 2

    expect(orbit.semiMajorAxis).toBeCloseTo(expectedSMA, 1)
  })
})

describe('calculateHohmannTransfer', () => {
  it('calculates transfer from LEO to GEO', () => {
    const initialAlt = 400 // km (LEO)
    const targetAlt = 35786 // km (GEO)
    const transfer = calculateHohmannTransfer(initialAlt, targetAlt)

    expect(transfer.initialOrbit.periapsisAltitude).toBe(initialAlt)
    expect(transfer.targetOrbit.periapsisAltitude).toBe(targetAlt)
    expect(transfer.totalDeltaV).toBeGreaterThan(0)
  })

  it('has total delta-v as sum of two burns', () => {
    const transfer = calculateHohmannTransfer(400, 1000)

    expect(transfer.totalDeltaV).toBeCloseTo(transfer.deltaV1 + transfer.deltaV2, 5)
  })

  it('has correct transfer orbit', () => {
    const initialAlt = 200 // km
    const targetAlt = 600 // km
    const transfer = calculateHohmannTransfer(initialAlt, targetAlt)

    // Transfer orbit should have periapsis at initial altitude and apoapsis at target
    expect(transfer.transferOrbit.periapsisAltitude).toBe(initialAlt)
    expect(transfer.transferOrbit.apoapsisAltitude).toBe(targetAlt)
  })

  it('calculates positive delta-v for raising orbit', () => {
    const transfer = calculateHohmannTransfer(400, 800)

    expect(transfer.deltaV1).toBeGreaterThan(0)
    expect(transfer.deltaV2).toBeGreaterThan(0)
  })

  it('calculates transfer time as half the transfer orbit period', () => {
    const transfer = calculateHohmannTransfer(400, 800)

    expect(transfer.transferTime).toBeCloseTo(transfer.transferOrbit.orbitalPeriod / 2, 1)
  })
})

describe('formatTime', () => {
  it('formats seconds for values under 60', () => {
    expect(formatTime(30)).toBe('30.0s')
    expect(formatTime(59.5)).toBe('59.5s')
  })

  it('formats minutes and seconds for values under 3600', () => {
    expect(formatTime(90)).toBe('1m 30s')
    expect(formatTime(120)).toBe('2m 0s')
    expect(formatTime(3599)).toBe('59m 59s')
  })

  it('formats hours and minutes for values over 3600', () => {
    expect(formatTime(3600)).toBe('1h 0m')
    expect(formatTime(5400)).toBe('1h 30m')
    expect(formatTime(86400)).toBe('24h 0m')
  })
})

describe('ORBIT_PRESETS', () => {
  it('has LEO preset at approximately ISS altitude', () => {
    expect(ORBIT_PRESETS.leo.altitude).toBe(400)
    expect(ORBIT_PRESETS.leo.name).toContain('Low Earth')
  })

  it('has GEO preset at geostationary altitude', () => {
    expect(ORBIT_PRESETS.geo.altitude).toBe(35786)
    expect(ORBIT_PRESETS.geo.name).toContain('Geostationary')
  })

  it('has MEO preset for GPS altitude', () => {
    expect(ORBIT_PRESETS.meo.altitude).toBe(20200)
    expect(ORBIT_PRESETS.meo.name).toContain('GPS')
  })

  it('has lunar preset at Moon distance', () => {
    expect(ORBIT_PRESETS.lunar.altitude).toBe(384400)
    expect(ORBIT_PRESETS.lunar.name).toContain('Lunar')
  })
})

describe('EARTH_RADIUS_KM', () => {
  it('is approximately 6371 km', () => {
    expect(EARTH_RADIUS_KM).toBeCloseTo(6371, 0)
  })
})
