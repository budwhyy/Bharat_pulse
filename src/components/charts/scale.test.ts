import { describe, expect, it } from 'vitest'
import { niceScale } from './plots'

describe('niceScale', () => {
  it('produces round ticks that cover data and reference lines', () => {
    // CPI May–Aug plus the 4% target and 5.5% repo rate.
    const { domain, ticks } = niceScale([3.93, 4.38, 4.45, 4.82, 4, 5.5])
    expect(ticks).toEqual([3, 4, 5, 6])
    expect(domain).toEqual([3, 6])
    // Population in billions needs a fine step.
    expect(niceScale([1.29, 1.31, 1.46]).ticks).toEqual([1.2, 1.3, 1.4, 1.5])
  })

  it('handles small spans and flat series', () => {
    expect(niceScale([1.29, 1.46]).ticks.every((t) => Number.isFinite(t))).toBe(true)
    const flat = niceScale([5, 5, 5])
    expect(flat.domain[0]).toBeLessThan(5)
    expect(flat.domain[1]).toBeGreaterThan(5)
  })
})
