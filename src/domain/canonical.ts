const TRACKING_PARAM = /^(utm_.*|fbclid|gclid|mc_[a-z]+|ref|reg|lang|from|cmp|ito|at_.*|src|source|ns_.*|ncid|ocid|amp)$/i

/**
 * Canonical form used to dedupe the same report across feeds and fetches:
 * https, no "www."/"m.", no fragment, no tracking parameters, no AMP or
 * trailing-slash variants. PIB release links collapse to their release id.
 */
export function canonicalUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase().replace(/^(www|m|amp)\./, '')
  const prid = url.searchParams.get('PRID') ?? url.searchParams.get('prid')
  if (host === 'pib.gov.in' && prid && /^\d+$/.test(prid)) return `pib:${prid}`

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key)
  }
  url.searchParams.sort()

  let path = url.pathname.replace(/\/amp(\/|$)/i, '/').replace(/\.amp(\.html?)?$/i, '$1')
  path = path.replace(/\/{2,}/g, '/')
  if (path.length > 1) path = path.replace(/\/+$/, '')

  const query = url.searchParams.toString()
  return `https://${host}${path}${query ? `?${query}` : ''}`
}

/** All keys an item can be recognised by: canonical URL and source-scoped GUID. */
export function dedupeKeys(sourceId: string, url: string, guid: string | null): string[] {
  const keys: string[] = []
  const canonical = canonicalUrl(url)
  if (canonical) keys.push(`url:${canonical}`)
  if (guid) {
    const guidCanonical = /^https?:\/\//i.test(guid) ? canonicalUrl(guid) : null
    if (guidCanonical) keys.push(`url:${guidCanonical}`)
    keys.push(`guid:${sourceId}:${guid.trim()}`)
  }
  return [...new Set(keys)]
}
