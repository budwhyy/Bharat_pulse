import { describe, expect, it } from 'vitest'
import { aqiBand, BREAKPOINTS, stationAqi, subIndex, type Pollutant } from './aqi'

describe('National AQI', () => {
  it.each(Object.keys(BREAKPOINTS) as Pollutant[])('maps all %s band upper limits', (pollutant) => {
    expect(BREAKPOINTS[pollutant].map((v) => subIndex(pollutant, v))).toEqual([50, 100, 200, 300, 400, 500])
  })
  it('interpolates concentration bands and respects CO precision', () => {
    expect(subIndex('PM2.5', 15)).toBe(25)
    expect(subIndex('PM2.5', 31)).toBe(51)
    expect(subIndex('PM2.5', 75)).toBe(149)
    expect(subIndex('CO', 1.1)).toBe(51)
    expect(subIndex('CO', 1.5)).toBe(73)
    expect(subIndex('PM10', 900)).toBe(500)
  })
  it('requires three valid distinct pollutants, including particles', () => {
    expect(stationAqi({ PM10: 50, NO2: 40, SO2: 80 })).toBe(100)
    expect(stationAqi({ PM10: 50, NO2: 40 })).toBeNull()
    expect(stationAqi({ CO: 1, NO2: 40, SO2: 80 })).toBeNull()
    expect(stationAqi({ PM10: NaN, NO2: 40, SO2: 80 })).toBeNull()
    expect(subIndex('PM10', -1)).toBeNull()
    expect(subIndex('PM10', Infinity)).toBeNull()
  })
  it('assigns bands inclusively', () => {
    expect([50, 100, 200, 300, 400, 500].map(aqiBand)).toEqual(['good', 'satisfactory', 'moderate', 'poor', 'very-poor', 'severe'])
    expect(aqiBand(51)).toBe('satisfactory')
  })
})
