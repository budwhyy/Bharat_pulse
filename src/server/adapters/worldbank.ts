export const WB_SERIES = {
  population: 'SP.POP.TOTL',
  age0to14: 'SP.POP.0014.TO.ZS',
  age15to64: 'SP.POP.1564.TO.ZS',
  age65plus: 'SP.POP.65UP.TO.ZS',
  femaleLfpr: 'SL.TLF.CACT.FE.ZS',
  fertility: 'SP.DYN.TFRT.IN',
} as const

export type WbSeriesKey = keyof typeof WB_SERIES

export interface WbObservation {
  year: string
  value: number
}

export interface WbSeries {
  /** Date the World Bank last updated the indicator. */
  lastUpdated: string | null
  points: WbObservation[]
}

export function worldBankUrl(indicator: string): string {
  return `https://api.worldbank.org/v2/country/IND/indicator/${indicator}?format=json&per_page=40&date=2006:2030`
}

/** Parses a World Bank v2 JSON response into ascending, non-null observations. */
export function parseWorldBank(json: string): WbSeries {
  const data = JSON.parse(json) as unknown
  if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
    const message = Array.isArray(data) ? (data[0] as any)?.message?.[0]?.value : null
    throw new Error(message ? `World Bank: ${message}` : 'Unexpected World Bank response')
  }
  const meta = data[0] as { lastupdated?: string }
  const points = (data[1] as Array<{ date?: string; value?: number | null }>)
    .filter((row) => typeof row.value === 'number' && Number.isFinite(row.value) && /^\d{4}$/.test(row.date ?? ''))
    .map((row) => ({ year: row.date!, value: row.value! }))
    .sort((a, b) => a.year.localeCompare(b.year))
  if (points.length === 0) throw new Error('World Bank series has no values')
  return { lastUpdated: meta?.lastupdated ?? null, points }
}
