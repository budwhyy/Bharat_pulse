export interface RbiRates {
  repo: number
  sdf: number | null
  msf: number | null
}

function rate(html: string, label: string): number | null {
  const pattern = new RegExp(`${label}\\s*(?:&nbsp;|\\s)*</th>\\s*<td[^>]*>\\s*:?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*%`, 'i')
  const value = pattern.exec(html)?.[1]
  const n = value ? Number(value) : NaN
  return Number.isFinite(n) && n > 0 && n < 20 ? n : null
}

/** Reads the "Policy Rates" box on rbi.org.in. Throws if the repo rate is missing. */
export function parseRbiRates(html: string): RbiRates {
  const repo = rate(html, 'Policy Repo Rate')
  if (repo == null) throw new Error('Policy repo rate not found on RBI homepage')
  return {
    repo,
    sdf: rate(html, 'Standing Deposit Facility Rate'),
    msf: rate(html, 'Marginal Standing Facility Rate'),
  }
}
