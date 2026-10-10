import { canonicalUrl } from '../domain/canonical'
import { toPlainText } from '../domain/text'
import type { NormalizedItem, UpdateRecord } from '../domain/types'
import { assertFeedLanguage, normalizeFeedItems } from './adapters/news'
import { parseFeedDocument } from './adapters/rss'
import type { Fetcher } from './http'
import { matchesPublisher, type Publisher } from './publishers'
import { NEWS_REFRESH_MINUTES, type NewsSource, type SourceDef } from './sources'

export const DISCOVERY_INTERVAL_MINUTES = 60
/** Most discovered feeds kept at once, across all publishers. */
export const MAX_DISCOVERED = 24
/** A publisher may contribute at most this many feeds in total (fixed + discovered). */
export const MAX_PER_PUBLISHER = 3
/** Pages fetched per publisher per scan (seeds, index pages and candidate feeds together). */
export const FETCH_BUDGET = 10
/** Seeds are depth 0; links found on them depth 1; links found there depth 2. */
export const MAX_DEPTH = 2
export const FRESH_HOURS = 24
/** Discovered feeds with no new item for this long, or failing repeatedly, are retired. */
export const RETIRE_AFTER_HOURS = 72
export const RETIRE_AFTER_FAILURES = 3

const EXCLUDE =
  /(sport|cricket|football|\bipl\b|tennis|hockey|olymp|entertain|bollywood|hollywood|movie|cinema|film|\btv\b|television|celebrit|lifestyle|fashion|beauty|astro|horoscope|rashifal|jyotish|zodiac|religio|spiritual|gadget|technology|\btech\b|mobile|\bautos?\b|travel|food|recipe|photo|gallery|video|podcast|web-?stor|viral|trending|offbeat|weird|world|international|videsh|abroad|\bnri\b|\bcity\b|cities|local|education|career|jobs?\b|\bexams?\b|opinion|editorial|blog|column|crossword|quiz|relationship|parenting|real-estate|brand|partner|sponsor|\bgames?\b|lottery|weather|tender|recruit|vacanc|health|science|books?\b|music|खेल|क्रिकेट|मनोरंजन|बॉलीवुड|धर्म|राशिफल|ज्योतिष|टेक|ऑटो|लाइफस्टाइल|विदेश|दुनिया|वीडियो|फोटो|करियर|शिक्षा|मौसम|शहर)/i
/** Devanagari has no \b; a term must not be preceded by a Devanagari letter or mark (so देश ≠ प्रदेश). */
const HI_START = '(?<![\\u0900-\\u097F])'
const hi = (terms: string[]) => terms.map((t) => HI_START + t).join('|')

/** A national-section term. Catch-all words (top, latest, breaking, home) are only weak hints: those feeds mix in world and entertainment. */
const STRONG = new RegExp(
  `(\\bindia|\\bnational|\\bnation\\b|politic|econom|business|\\bpolicy|government|\\bgovt\\b|parliament|election|\\bdesh\\b|rashtriya|${hi(['देश', 'राष्ट्रीय', 'राजनीति', 'अर्थव्यवस्था', 'कारोबार', 'बिज़नेस', 'बिजनेस'])})`,
  'giu',
)
const WEAK = new RegExp(
  `(news|khabar|\\btop|latest|breaking|\\bhome|default|\\bmain|${hi(['समाचार', 'ख़बर', 'खबर', 'ताज़ा', 'ताजा', 'ब्रेकिंग', 'बड़ी', 'प्रमुख', 'मुख्य'])})`,
  'giu',
)
/** Official publishers' release feeds are national by nature; at news publishers "press releases" are paid wire copy. */
const OFFICIAL_ONLY = /(press-?release|notification|circular)/i
/** State and city sections are local news. */
const REGIONAL = new RegExp(
  `(pradesh|bihar|rajasthan|gujarat|maharashtra|punjab|haryana|uttarakhand|jharkhand|chhattisgarh|odisha|bengal|assam|kerala|karnataka|tamil|telangana|andhra|\\bgoa\\b|jammu|kashmir|himachal|delhi|mumbai|kolkata|chennai|bengaluru|bangalore|hyderabad|lucknow|patna|jaipur|${hi(['प्रदेश', 'बिहार', 'राजस्थान', 'गुजरात', 'महाराष्ट्र', 'पंजाब', 'हरियाणा', 'उत्तराखंड', 'झारखंड', 'छत्तीसगढ़', 'ओडिशा', 'बंगाल', 'असम', 'केरल', 'कर्नाटक', 'तमिलनाडु', 'तेलंगाना', 'आंध्र', 'जम्मू', 'कश्मीर', 'हिमाचल', 'दिल्ली', 'मुंबई'])})`,
  'iu',
)

/** How likely a link or feed title is a national-news section; -1 means excluded, >= 3 means a national term is present. */
export function sectionScore(text: string): number {
  if (EXCLUDE.test(text) || REGIONAL.test(text)) return -1
  const strong = new Set((text.match(STRONG) ?? []).map((m) => m.toLowerCase())).size
  const weak = new Set((text.match(WEAK) ?? []).map((m) => m.toLowerCase())).size
  return strong * 3 + Math.min(weak, 1)
}

/** A feed title without the publisher's own name (so "Economic Times" can't vouch for itself). */
export function stripPublisher(title: string | null | undefined, publisher: Pick<Publisher, 'name'>): string {
  // Domains first ("… in news18.com"), then the publisher's names, then dangling "in".
  let out = (title ?? '').replace(/\s+in\s+[\w-]+\.(com|in|co\.in)\b/gi, ' ')
  for (const name of [publisher.name.en, publisher.name.hi, publisher.name.en.replace(/^The\s+/i, '')]) {
    out = out.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
  }
  return out
    .replace(/\s+in\s*(?=[,|]|$)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * True when the URL path plus titles show a national-section term and nothing
 * excluded (entertainment, sport, world, state/city, …). Press-release feeds
 * count only for official publishers.
 */
export function isNationalSection(
  url: string,
  publisher: Pick<Publisher, 'name' | 'kind'>,
  ...titles: (string | null | undefined)[]
): boolean {
  let path = url
  try {
    path = new URL(url).pathname
  } catch {
    // use the raw string
  }
  const text = [path, ...titles.map((t) => stripPublisher(t, publisher))].filter(Boolean).join(' ')
  if (OFFICIAL_ONLY.test(text)) return publisher.kind === 'official' && sectionScore(text) >= 0
  return sectionScore(text) >= 3
}

export interface FoundLink {
  url: string
  text: string
}

const FEEDISH = /(rss|feed|atom|\.xml(?:$|\?))/i

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)
  return m ? (m[2] ?? m[3] ?? m[4] ?? null) : null
}

/** Feed links on a page: <link rel="alternate" type="application/rss+xml"> plus feed-looking anchors. */
export function extractLinks(html: string, base: string): FoundLink[] {
  const found = new Map<string, string>()
  const add = (href: string | null, text: string) => {
    if (!href) return
    let url: URL
    try {
      url = new URL(href.replace(/&amp;/g, '&'), base)
    } catch {
      return
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return
    url.hash = ''
    const key = url.toString()
    if (!found.has(key)) found.set(key, text)
  }
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0]
    if (/rel\s*=\s*["']?alternate/i.test(tag) && /type\s*=\s*["']?application\/(rss|atom)\+xml/i.test(tag)) {
      add(attr(tag, 'href'), attr(tag, 'title') ?? '')
    }
  }
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(m[1]!, 'href')
    const text = toPlainText(m[2]).slice(0, 80)
    if (href && (FEEDISH.test(href) || /\b(rss|feed)\b/i.test(text))) add(href, text)
  }
  return [...found].map(([url, text]) => ({ url, text }))
}

export interface Verdict {
  ok: boolean
  reason: string
  score: number
}

/**
 * Accepts a candidate feed only if it is substantial, fresh, in the publisher's
 * language, about national affairs, and adds stories we don't already carry.
 */
export function judgeFeed(input: {
  items: NormalizedItem[]
  lang: 'en' | 'hi'
  now: Date
  knownKeys: ReadonlySet<string>
}): Verdict {
  const { items, now, knownKeys } = input
  if (items.length < 5) return { ok: false, reason: 'too few items', score: 0 }
  try {
    assertFeedLanguage(items, input.lang)
  } catch {
    return { ok: false, reason: 'wrong language', score: 0 }
  }
  const dated = items.map((i) => (i.publishedAt ? Date.parse(i.publishedAt) : NaN)).filter(Number.isFinite)
  if (dated.length < items.length / 2) return { ok: false, reason: 'undated', score: 0 }
  const newest = Math.max(...dated)
  if (now.getTime() - newest > FRESH_HOURS * 3600_000) return { ok: false, reason: 'stale', score: 0 }
  const relevance = items.filter((i) => i.category !== 'general').length / items.length
  if (relevance < 0.5) return { ok: false, reason: 'off-topic', score: 0 }
  const novelty = items.filter((i) => !i.keys.some((k) => knownKeys.has(k))).length / items.length
  if (novelty < 0.4) return { ok: false, reason: 'duplicate coverage', score: 0 }
  const fresh = dated.filter((t) => now.getTime() - t < 6 * 3600_000).length
  return { ok: true, reason: 'accepted', score: fresh + relevance * 5 + novelty * 3 }
}

function shortHash(text: string): string {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0).toString(36)
}

const GENERIC_TITLE = /(records found|rss ?feed|latest and breaking|home ?page|search|^\s*$)/i
const PATH_NOISE = new Set(['rss', 'rssfeed', 'rssfeeds', 'feed', 'feeds', 'feeder', 'commonfeeds', 'v1', 'eng', 'mfp', 'default', 'index', 'xml', 'news'])

/** "/feeds/rss/business/rssfeed.xml" → "Business"; "/ndtvnews-top-stories" → "Top stories". */
export function slugName(url: string, publisherId: string): string | null {
  let path: string
  try {
    path = new URL(url).pathname
  } catch {
    return null
  }
  const prefix = publisherId.replace(/-/g, '')
  const parts = path
    .split('/')
    .map((p) => p.replace(/\.(xml|rss|cms|aspx?)$/i, '').toLowerCase())
    .flatMap((p) => p.split(/--/))
    .map((p) => p.replace(new RegExp(`^${prefix}(news|khabar)?-?`), ''))
    .filter((p) => p && !PATH_NOISE.has(p) && !/^-?\d+$/.test(p) && !/^category-?\d+$/.test(p))
  const last = parts.at(-1)
  if (!last) return null
  const words = last.replace(/[-_]+/g, ' ').replace(/\bnews\b/g, '').trim()
  return words ? words[0]!.toUpperCase() + words.slice(1) : null
}

/**
 * A short section label: the feed title's first clause ("India News | Latest…"
 * → "India News"), or the URL slug when the title is generic or already used.
 */
export function sectionName(title: string | null, url: string, publisher: Publisher, taken: ReadonlySet<string>): string {
  const cleaned = stripPublisher(title, publisher).replace(/^[\s|–—,-]+|[\s|–—,-]+$/g, '')
  const head = (cleaned.split(/\s[|–—-]\s|\||,/)[0] ?? '').trim().replace(/[\s-]+news(\s+today)?$/i, '').replace(/^news[\s-]+/i, '')
  const generic = !head || GENERIC_TITLE.test(head) || /^news$/i.test(head)
  const slug = slugName(url, publisher.id)
  let name = !generic && head.split(/\s+/).length <= 5 ? head : (slug ?? head)
  if (taken.has(name.toLowerCase()) && slug) name = slug
  return name.slice(0, 32)
}

export interface DiscoveryResult {
  accepted: NewsSource[]
  checked: number
  rejected: Record<string, number>
  errors: string[]
}

interface QueueEntry {
  url: string
  depth: number
  score: number
  /** Anchor text of the link that led here. */
  text: string
}

/**
 * One scan. For each vetted publisher: breadth-first, best-scored-first crawl
 * from its seed pages through index pages (bounded by depth and a fetch
 * budget); every fetched URL that parses as a feed is judged; the best passing
 * feeds fill that publisher's remaining slots.
 */
export async function discoverFeeds(ctx: {
  fetcher: Fetcher
  now: Date
  publishers: Publisher[]
  sources: SourceDef[]
  updates: Record<string, UpdateRecord>
  concurrency?: number
}): Promise<DiscoveryResult> {
  const knownKeys = new Set<string>()
  for (const record of Object.values(ctx.updates)) for (const key of record.keys) knownKeys.add(key)
  const knownFeeds = new Set(ctx.sources.map((s) => canonicalUrl(s.url)).filter(Boolean) as string[])

  const result: DiscoveryResult = { accepted: [], checked: 0, rejected: {}, errors: [] }
  const reject = (reason: string) => {
    result.rejected[reason] = (result.rejected[reason] ?? 0) + 1
  }

  const scanPublisher = async (publisher: Publisher) => {
    const existing = ctx.sources.filter(
      (s) => s.type === 'news' && ((s as NewsSource).publisherId === publisher.id || matchesPublisher(s.url, publisher)),
    ).length
    const slots = MAX_PER_PUBLISHER - existing
    if (slots <= 0) return

    const queue: QueueEntry[] = publisher.seeds.map((url) => ({ url, depth: 0, score: 100, text: '' }))
    const visited = new Set<string>()
    const passed: { source: NewsSource; score: number }[] = []
    const takenNames = new Set<string>()
    let budget = FETCH_BUDGET

    while (queue.length && budget > 0) {
      queue.sort((a, b) => b.score - a.score)
      const entry = queue.shift()!
      const canonical = canonicalUrl(entry.url) ?? entry.url
      if (visited.has(canonical)) continue
      visited.add(canonical)
      budget -= 1
      result.checked += 1

      let text: string
      try {
        text = (await ctx.fetcher(entry.url, { timeoutMs: 10_000 })).text
      } catch (error) {
        result.errors.push(`${publisher.id}: ${error instanceof Error ? error.message : 'fetch failed'}`)
        continue
      }

      let doc: ReturnType<typeof parseFeedDocument> | null = null
      try {
        doc = parseFeedDocument(text)
      } catch {
        doc = null
      }

      if (doc) {
        if (knownFeeds.has(canonical)) {
          reject('already a source')
          continue
        }
        if (!isNationalSection(entry.url, publisher, doc.title, entry.text)) {
          reject('not a national section')
          continue
        }
        const section = sectionName(doc.title, entry.url, publisher, takenNames)
        takenNames.add(section.toLowerCase())
        const provisional: NewsSource = {
          id: `d-${publisher.id}-${shortHash(canonical)}`,
          type: 'news',
          kind: publisher.kind,
          lang: publisher.lang,
          name: {
            en: `${publisher.name.en} · ${section}`,
            hi: `${publisher.name.hi} · ${section}`,
          },
          homepage: publisher.seeds[0]!,
          url: entry.url,
          refreshMinutes: NEWS_REFRESH_MINUTES,
          defaultCategory: publisher.defaultCategory,
          defaultOffset: publisher.defaultOffset,
          discovered: true,
          publisherId: publisher.id,
          discoveredAt: ctx.now.toISOString(),
        }
        const items = normalizeFeedItems(doc.items, provisional, ctx.now)
        const verdict = judgeFeed({ items, lang: publisher.lang, now: ctx.now, knownKeys })
        if (verdict.ok) passed.push({ source: provisional, score: verdict.score })
        else reject(verdict.reason)
        continue
      }

      // Not a feed: an index page. Recurse into its links, best candidates first.
      if (entry.depth >= MAX_DEPTH) continue
      for (const link of extractLinks(text, entry.url)) {
        if (!matchesPublisher(link.url, publisher)) continue
        const score = sectionScore(`${new URL(link.url).pathname} ${link.text}`)
        if (score < 0) continue
        queue.push({ url: link.url, depth: entry.depth + 1, score, text: link.text })
      }
    }

    passed.sort((a, b) => b.score - a.score)
    for (const { source } of passed.slice(0, slots)) {
      knownFeeds.add(canonicalUrl(source.url) ?? source.url)
      result.accepted.push(source)
    }
  }

  const publishers = [...ctx.publishers]
  const workers = Array.from({ length: Math.min(ctx.concurrency ?? 4, publishers.length) }, async () => {
    while (publishers.length) await scanPublisher(publishers.shift()!)
  })
  await Promise.all(workers)
  return result
}
