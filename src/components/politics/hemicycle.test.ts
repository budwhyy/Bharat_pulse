import { describe, expect, it } from 'vitest'
import { layoutSeats } from './Hemicycle'

describe('layoutSeats', () => {
  it.each([543, 243, 294, 30])('places exactly %i seats, ordered left to right', (total) => {
    const { seats, seatR } = layoutSeats(total)
    expect(seats).toHaveLength(total)
    expect(seatR).toBeGreaterThan(0)
    for (let i = 1; i < seats.length; i++) expect(seats[i]!.angle).toBeLessThanOrEqual(seats[i - 1]!.angle)
  })

  it('does not overlap seats', () => {
    const { seats, seatR } = layoutSeats(543)
    let minGap = Infinity
    for (let i = 0; i < seats.length; i++) {
      for (let j = i + 1; j < seats.length; j++) {
        minGap = Math.min(minGap, Math.hypot(seats[i]!.x - seats[j]!.x, seats[i]!.y - seats[j]!.y))
      }
    }
    expect(minGap).toBeGreaterThanOrEqual(seatR * 2)
  })
})
