import { ALLOWED_HOSTS } from './sources'

export interface FetchOptions {
  etag?: string | null
  lastModified?: string | null
  /** Carry Set-Cookie headers across redirects (PIB keeps its language in a session). */
  cookies?: boolean
  timeoutMs?: number
}

export interface FetchResult {
  status: number
  text: string
  etag: string | null
  lastModified: string | null
  notModified: boolean
}

export type Fetcher = (url: string, options?: FetchOptions) => Promise<FetchResult>

export class SourceError extends Error {}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BharatPulse/0.1 (headline dashboard)'
const MAX_BYTES = 4 * 1024 * 1024
const MAX_REDIRECTS = 5

export function isAllowedUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
  } catch {
    return false
  }
}

/**
 * Server-side fetch for source feeds: allowlisted HTTPS hosts only, a timeout,
 * a size cap, conditional requests, and manual redirects so session cookies
 * can be carried when a source needs them.
 */
export const httpFetcher: Fetcher = async (url, options = {}) => {
  const jar = new Map<string, string>()
  let current = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedUrl(current)) throw new SourceError(`Blocked host: ${new URL(current).hostname}`)
    // Some feed servers return an empty body for specific Accept lists; send what curl sends.
    const headers: Record<string, string> = { 'User-Agent': USER_AGENT, Accept: '*/*' }
    if (hop === 0 && options.etag) headers['If-None-Match'] = options.etag
    if (hop === 0 && options.lastModified) headers['If-Modified-Since'] = options.lastModified
    if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')

    let response: Response
    try {
      response = await fetch(current, {
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(options.timeoutMs ?? 12_000),
      })
    } catch (error) {
      const reason = error instanceof Error && error.name === 'TimeoutError' ? 'Timed out' : 'Network error'
      throw new SourceError(reason)
    }

    if (options.cookies) {
      for (const cookie of response.headers.getSetCookie()) {
        const [pair] = cookie.split(';')
        const eq = pair?.indexOf('=') ?? -1
        if (pair && eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
      }
    }

    if (response.status >= 300 && response.status < 400 && response.status !== 304) {
      const location = response.headers.get('location')
      if (!location) throw new SourceError(`Redirect without location (${response.status})`)
      current = new URL(location, current).toString()
      continue
    }
    if (response.status === 304) {
      return { status: 304, text: '', etag: options.etag ?? null, lastModified: options.lastModified ?? null, notModified: true }
    }
    if (!response.ok) throw new SourceError(`HTTP ${response.status}`)

    const declared = Number(response.headers.get('content-length') ?? 0)
    if (declared > MAX_BYTES) throw new SourceError('Response too large')
    const text = await response.text()
    if (text.length > MAX_BYTES) throw new SourceError('Response too large')
    if (!text.trim()) throw new SourceError('Empty response')
    return {
      status: response.status,
      text,
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      notModified: false,
    }
  }
  throw new SourceError('Too many redirects')
}
