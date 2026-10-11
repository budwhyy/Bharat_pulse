import type { AqiCity } from './types'

/** CPCB National AQI concentration breakpoints. CO is mg/m³; others µg/m³.
 * https://cpcb.gov.in/displaypdf.php?id=bmF0aW9uYWwtYWlyLXF1YWxpdHktaW5kZXgvQWJvdXRfQVFJLnBkZg%3D%3D
 * Finite severe-band upper bounds are the product's capped interpolation limits.
 */
export const BREAKPOINTS = {
  'PM2.5': [30, 60, 90, 120, 250, 500],
  PM10: [50, 100, 250, 350, 430, 600],
  NO2: [40, 80, 180, 280, 400, 800],
  OZONE: [50, 100, 168, 208, 748, 1000],
  CO: [1, 2, 10, 17, 34, 50],
  SO2: [40, 80, 380, 800, 1600, 2400],
  NH3: [200, 400, 800, 1200, 1800, 2400],
} as const
export type Pollutant = keyof typeof BREAKPOINTS
const INDEX = [50, 100, 200, 300, 400, 500]

export function subIndex(pollutant: Pollutant, concentration: number): number | null {
  if (!Number.isFinite(concentration) || concentration < 0) return null
  const bounds = BREAKPOINTS[pollutant]
  const step = pollutant === 'CO' ? 0.1 : 1
  // Match the precision of the published concentration bands before interpolation.
  const value = Math.round(concentration / step) * step
  const band = bounds.findIndex((hi) => value <= hi)
  if (band < 0) return 500
  const lo = band ? bounds[band - 1]! + step : 0
  const idxLo = band ? INDEX[band - 1]! + 1 : 0
  return Math.round(idxLo + (INDEX[band]! - idxLo) * Math.max(0, value - lo) / (bounds[band]! - lo))
}

export function stationAqi(values: Partial<Record<Pollutant, number>>): number | null {
  const indices = Object.entries(values).flatMap(([key, value]) => {
    if (!(key in BREAKPOINTS)) return []
    const index = subIndex(key as Pollutant, value)
    return index === null ? [] : [[key, index] as const]
  })
  if (indices.length < 3 || !indices.some(([key]) => key === 'PM2.5' || key === 'PM10')) return null
  return Math.max(...indices.map(([, index]) => index))
}

export function aqiBand(aqi: number): AqiCity['band'] {
  return aqi <= 50 ? 'good' : aqi <= 100 ? 'satisfactory' : aqi <= 200 ? 'moderate'
    : aqi <= 300 ? 'poor' : aqi <= 400 ? 'very-poor' : 'severe'
}
