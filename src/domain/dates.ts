/** Publishers sometimes stamp items in the future; allow a little clock skew only. */
export const FUTURE_TOLERANCE_MS = 15 * 60 * 1000
const EARLIEST_PLAUSIBLE = Date.UTC(2000, 0, 1)

const HAS_ZONE = /(?:[+-]\d{2}:?\d{2}|\d[zZ]|\s(?:GMT|UTC|UT|[ECMP][SD]T|IST))\s*$/i

/**
 * Parses an RSS/Atom date. Dates without a zone are read in the source's
 * declared offset (e.g. RBI publishes IST without saying so). Returns null for
 * missing, unparseable, implausibly old, or future dates.
 */
export function parseFeedDate(raw: unknown, now: Date, defaultOffset = '+0000'): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  let text = raw.trim()
  if (/\bIST\s*$/i.test(text)) text = text.replace(/\bIST\s*$/i, '+0530')
  if (!HAS_ZONE.test(text)) text = `${text} ${defaultOffset}`
  const ms = Date.parse(text)
  if (!Number.isFinite(ms)) return null
  if (ms < EARLIEST_PLAUSIBLE) return null
  if (ms > now.getTime() + FUTURE_TOLERANCE_MS) return null
  return new Date(ms).toISOString()
}

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
}

/** Parses PIB's "10 OCT 2026 11:08PM" (always IST). */
export function parsePibDate(raw: string, now: Date): string | null {
  const m = /(\d{1,2})\s+([A-Z]{3})[A-Z]*\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(raw)
  if (!m) return null
  const [, d, mon, y, h, min, ampm] = m
  const month = MONTHS[mon!.toUpperCase()]
  if (month === undefined) return null
  let hour = Number(h) % 12
  if (ampm!.toUpperCase() === 'PM') hour += 12
  // IST is UTC+05:30 with no daylight saving.
  const ms = Date.UTC(Number(y), month, Number(d), hour, Number(min)) - 330 * 60 * 1000
  if (!Number.isFinite(ms) || ms > now.getTime() + FUTURE_TOLERANCE_MS) return null
  return new Date(ms).toISOString()
}
