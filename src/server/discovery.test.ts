import { describe, expect, it } from 'vitest'
import type { NormalizedItem } from '../domain/types'
import { emptyCache, memoryStore } from './cache'
import { FETCH_BUDGET, discoverFeeds, extractLinks, isNationalSection, judgeFeed, sectionName, sectionScore } from './discovery'
import { SourceError, type Fetcher, type FetchResult } from './http'
import type { Publisher } from './publishers'
import { DashboardService } from './service'
import type { SourceDef } from './sources'

const NOW = new Date('2026-10-11T06:00:00Z')
const ago = (h: number) => new Date(NOW.getTime() - h * 3600_000).toUTCString()

const HEADLINES = [
  'Parliament passes election reform bill',
  'RBI raises repo rate to curb inflation',
  'Cabinet approves new scheme for farmers',
  'Flood alert issued across Assam districts',
  'Supreme Court hears plea on police reform',
  'Opposition parties plan joint rally in Delhi',
  'GDP data shows strong manufacturing growth',
]

function feedXml(prefix: string, hoursAgo: number, title = 'India News', lang: 'en' | 'hi' = 'en') {
  const items = HEADLINES.map((h, i) => {
    const text = lang === 'hi' ? `संसद में ${i} विधेयक पारित` : `${h} (${prefix} ${i})`
    return `<item><title>${text}</title><link>https://www.example-news.com/${prefix}/${i}</link><pubDate>${ago(hoursAgo + i * 0.1)}</pubDate></item>`
  }).join('')
  return `<rss><channel><title>${title}</title>${items}</channel></rss>`
}

const ok = (text: string): FetchResult => ({ status: 200, text, etag: null, lastModified: null, notModified: false })

const PUBLISHER: Publisher = {
  id: 'example',
  name: { en: 'Example News', hi: 'उदाहरण' },
  lang: 'en',
  kind: 'reported',
  hosts: [{ host: 'example-news.com' }],
  seeds: ['https://www.example-news.com/rss/'],
}

const SITE: Record<string, string> = {
  'https://www.example-news.com/rss/': `
    <html><head><link rel="alternate" type="application/rss+xml" title="Top stories" href="/rss/top.xml"></head>
    <body>
      <a href="/rss/india-news.xml">India News RSS</a>
      <a href="/rss/sports.xml">Sports RSS</a>
      <a href="/rss/national-archive.xml">National archive</a>
      <a href="/rss/more">More RSS feeds</a>
      <a href="https://evil.example.com/rss/national.xml">National feed elsewhere</a>
      <a href="javascript:void(0)">rss</a>
    </body></html>`,
  'https://www.example-news.com/rss/top.xml': feedXml('top', 1, 'Top stories'),
  'https://www.example-news.com/rss/india-news.xml': feedXml('india', 0.5, 'India News | Latest'),
  'https://www.example-news.com/rss/national-archive.xml': feedXml('archive', 80, 'National archive'),
  'https://www.example-news.com/rss/more': `<html><body><a href="/rss/politics.xml">Politics</a></body></html>`,
  'https://www.example-news.com/rss/politics.xml': feedXml('politics', 2, 'Politics'),
}

function siteFetcher(calls: string[] = []): Fetcher {
  return async (url) => {
    calls.push(url)
    const body = SITE[url]
    if (!body) throw new SourceError('HTTP 404')
    return ok(body)
  }
}

describe('sectionScore', () => {
  it.each([
    ['/rss/india-news.xml', true],
    ['/feeds/rss/business/rssfeed.xml', true],
    ['/rss-v1--category-1061.xml देश', true],
    ['/rss/sports.xml', false],
    ['/cities/lucknow-news/rssfeed.xml', false],
    ['/rss/entertainment.xml', false],
    ['/rss/khel.xml खेल', false],
    ['/rss/latest-news.xml', false],
    ['/rss/top-stories.xml', false],
    ['/rss/uttar-pradesh.xml', false],
    ['/rss/state.xml उत्तर प्रदेश', false],
    ['/rss/delhi-news.xml', false],
  ])('%s → national: %s', (text, national) => {
    expect(sectionScore(text) >= 2).toBe(national)
  })
})

describe('section names', () => {
  const pub = (id: string, name: string) => ({ ...PUBLISHER, id, name: { en: name, hi: name } })
  it.each([
    ['India News | Latest India News Today', 'https://x.com/rss/india.xml', 'x', 'X', 'India'],
    ['Industry News, Company News, Manufacturing', 'https://x.com/business/Industry/feeder/default.rss', 'x', 'X', 'Industry'],
    ['NDTV News Search Records Found 1000', 'https://feeds.feedburner.com/ndtvnews-top-stories', 'ndtv', 'NDTV', 'Top stories'],
    ['Latest And Breaking Hindi News Headlines', 'https://www.amarujala.com/rss/breaking-news.xml', 'amar-ujala', 'Amar Ujala', 'Breaking'],
    ['mint', 'https://www.livemint.com/rss/politics', 'mint', 'Mint', 'Politics'],
    ['Elections News in news18.com, Elections Latest', 'https://www.news18.com/commonfeeds/v1/eng/rss/elections.xml', 'news18', 'News18', 'Elections'],
    ['Business News in firstpost, Business Latest News', 'https://www.firstpost.com/commonfeeds/v1/mfp/rss/business.xml', 'firstpost', 'Firstpost', 'Business'],
    ['India-News-Economic Times', 'https://economictimes.indiatimes.com/news/india/rssfeeds/81582957.cms', 'economic-times', 'The Economic Times', 'India'],
    ['Business News Today', 'https://www.thehindu.com/business/feeder/default.rss', 'the-hindu', 'The Hindu', 'Business'],
  ])('%s + %s → %s', (title, url, id, name, expected) => {
    expect(sectionName(title, url, pub(id, name), new Set())).toBe(expected)
  })

  it('falls back to the URL when a title is already taken', () => {
    expect(sectionName('Latest headlines', 'https://x.com/rss/editors-pick.xml', PUBLISHER, new Set(['latest headlines']))).toBe('Editors pick')
  })
})

describe('isNationalSection', () => {
  const reported = { name: { en: 'The Economic Times', hi: 'द इकनॉमिक टाइम्स' }, kind: 'reported' as const }
  const official = { name: { en: 'Reserve Bank of India', hi: 'आरबीआई' }, kind: 'official' as const }
  it('does not let a publisher name vouch for a catch-all feed', () => {
    expect(isNationalSection('https://economictimes.indiatimes.com/rssfeedsdefault.cms', reported, 'News-Economic Times')).toBe(false)
    expect(isNationalSection('https://economictimes.indiatimes.com/news/economy/rss.cms', reported, 'Economy-Economic Times')).toBe(true)
  })
  it('treats press releases as national only for official publishers', () => {
    expect(isNationalSection('https://www.business-standard.com/rss/press-releases.rss', reported, 'Press Releases ANI')).toBe(false)
    expect(isNationalSection('https://rbi.org.in/pressreleases_rss.xml', official, 'Press releases from RBI')).toBe(true)
  })
  it('does not read देश inside प्रदेश', () => {
    expect(isNationalSection('https://www.amarujala.com/rss/up.xml', reported, 'उत्तर प्रदेश समाचार')).toBe(false)
    expect(isNationalSection('https://www.amarujala.com/rss/india-news.xml', reported, 'देश की ख़बरें')).toBe(true)
  })
})

describe('extractLinks', () => {
  it('finds autodiscovery tags and feed anchors, resolves relative URLs, drops non-web links', () => {
    const links = extractLinks(SITE['https://www.example-news.com/rss/']!, 'https://www.example-news.com/rss/')
    const urls = links.map((l) => l.url)
    expect(urls).toContain('https://www.example-news.com/rss/top.xml')
    expect(urls).toContain('https://www.example-news.com/rss/india-news.xml')
    expect(urls).toContain('https://www.example-news.com/rss/more')
    expect(urls.some((u) => u.startsWith('javascript'))).toBe(false)
    expect(links.find((l) => l.url.endsWith('top.xml'))!.text).toBe('Top stories')
  })
})

describe('judgeFeed', () => {
  const item = (i: number, over: Partial<NormalizedItem> = {}): NormalizedItem => ({
    keys: [`url:k${i}`],
    sourceId: 'x',
    lang: 'en',
    kind: 'reported',
    title: HEADLINES[i % HEADLINES.length]!,
    summary: null,
    url: `https://e.com/${i}`,
    category: 'politics',
    publishedAt: new Date(NOW.getTime() - 3600_000).toISOString(),
    seq: 0,
    ...over,
  })
  const items = (n: number, over: Partial<NormalizedItem> = {}) => Array.from({ length: n }, (_, i) => item(i, over))
  const judge = (list: NormalizedItem[], known = new Set<string>(), lang: 'en' | 'hi' = 'en') =>
    judgeFeed({ items: list, lang, now: NOW, knownKeys: known })

  it('accepts a fresh, national, novel feed', () => {
    expect(judge(items(8))).toMatchObject({ ok: true })
  })
  it.each([
    ['too few items', () => judge(items(3))],
    ['wrong language', () => judge(items(8), new Set(), 'hi')],
    ['stale', () => judge(items(8, { publishedAt: new Date(NOW.getTime() - 30 * 3600_000).toISOString() }))],
    ['undated', () => judge(items(8, { publishedAt: null }))],
    ['off-topic', () => judge(items(8, { category: 'general' }))],
    ['duplicate coverage', () => judge(items(8), new Set(items(8).flatMap((i) => i.keys)))],
  ])('rejects: %s', (reason, run) => {
    expect(run()).toMatchObject({ ok: false, reason })
  })
})

describe('discoverFeeds', () => {
  it('crawls recursively within the publisher, validates, and fills free slots', async () => {
    const calls: string[] = []
    const result = await discoverFeeds({
      fetcher: siteFetcher(calls),
      now: NOW,
      publishers: [PUBLISHER],
      sources: [],
      updates: {},
    })
    const urls = result.accepted.map((s) => s.url)
    // Found on the seed page, and two levels down via an index page.
    expect(urls).toContain('https://www.example-news.com/rss/india-news.xml')
    expect(urls).toContain('https://www.example-news.com/rss/politics.xml')
    expect(urls).not.toContain('https://www.example-news.com/rss/national-archive.xml') // stale
    expect(result.rejected.stale).toBe(1)
    // A catch-all "Top stories" feed is not accepted: it mixes in world and entertainment.
    expect(urls).not.toContain('https://www.example-news.com/rss/top.xml')
    // Never left the publisher, never fetched excluded sections.
    expect(calls.some((u) => u.includes('evil.example.com'))).toBe(false)
    expect(calls.some((u) => u.includes('sports'))).toBe(false)
    expect(calls.length).toBeLessThanOrEqual(FETCH_BUDGET)
    // Named after the section, flagged as discovered, at most three per publisher.
    expect(result.accepted.length).toBeLessThanOrEqual(3)
    const india = result.accepted.find((s) => s.url.endsWith('india-news.xml'))!
    expect(india.name.en).toBe('Example News · India')
    expect(india.discovered).toBe(true)
  })

  it('skips feeds that are already sources and respects the per-publisher cap', async () => {
    const existing: SourceDef[] = [1, 2].map((n) => ({
      id: `fixed-${n}`,
      type: 'news',
      kind: 'reported',
      lang: 'en',
      name: { en: 'x', hi: 'x' },
      homepage: 'https://www.example-news.com/',
      url: n === 1 ? 'https://www.example-news.com/rss/india-news.xml' : 'https://www.example-news.com/rss/other.xml',
      refreshMinutes: 10,
    }))
    const result = await discoverFeeds({ fetcher: siteFetcher(), now: NOW, publishers: [PUBLISHER], sources: existing, updates: {} })
    expect(result.accepted).toHaveLength(1)
    expect(result.accepted[0]!.url).not.toContain('india-news')
  })
})

describe('DashboardService discovery', () => {
  const fixed: SourceDef[] = [
    {
      id: 'fixed',
      type: 'news',
      kind: 'reported',
      lang: 'en',
      name: { en: 'Fixed', hi: 'Fixed' },
      homepage: 'https://www.example-news.com/',
      url: 'https://www.example-news.com/fixed.xml',
      refreshMinutes: 10,
    },
  ]

  it('adds discovered feeds as sources, runs at most hourly, and retires failing ones', async () => {
    let now = NOW
    let downUrl: string | null = null
    const base = siteFetcher()
    const fetcher: Fetcher = async (url, options) => {
      if (url.endsWith('fixed.xml')) return ok(feedXml('fixed', 0.2))
      if (url === downUrl) throw new SourceError('HTTP 503')
      return base(url, options)
    }
    const service = new DashboardService({
      store: memoryStore(emptyCache()),
      fetcher,
      sources: fixed,
      publishers: [PUBLISHER],
      now: () => now,
      coldStartWaitMs: 1000,
    })
    await service.snapshot()
    const first = await service.discover()
    expect(first.ran).toBe(true)
    expect(first.added).toBeGreaterThanOrEqual(2)

    const snap = await service.snapshot()
    const discovered = snap.sources.filter((s) => s.discovered)
    expect(discovered.length).toBe(first.added)
    expect(snap.discovery.active).toBe(first.added)
    expect(snap.discovery.nextRunAt).toBe(new Date(NOW.getTime() + 3600_000).toISOString())

    // Not due again within the hour.
    now = new Date(NOW.getTime() + 30 * 60_000)
    expect((await service.discover()).ran).toBe(false)

    // A discovered feed that keeps failing is retired on the next scan.
    const victim = service['allSources']().find((s: SourceDef) => s.id === discovered[0]!.id) as SourceDef
    downUrl = victim.url
    for (let i = 0; i < 3; i++) {
      now = new Date(now.getTime() + 61 * 60_000)
      await service.refresh([victim])
    }
    const later = await service.discover(true)
    expect(later.retired).toBeGreaterThanOrEqual(1)
    const after = await service.snapshot()
    expect(after.sources.some((s) => s.id === victim.id)).toBe(false)
  })
})
