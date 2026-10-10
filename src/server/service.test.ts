import { describe, expect, it } from 'vitest'
import { emptyCache, memoryStore } from './cache'
import type { Fetcher, FetchResult } from './http'
import { SourceError } from './http'
import { DashboardService } from './service'
import type { SourceDef } from './sources'

const FEED_A = 'https://feeds.example.com/a.xml'
const FEED_B = 'https://feeds.example.com/b.xml'

const SOURCES: SourceDef[] = [
  { id: 'a', type: 'news', kind: 'reported', lang: 'en', name: { en: 'A', hi: 'ए' }, homepage: 'https://a', url: FEED_A, refreshMinutes: 10 },
  { id: 'b', type: 'news', kind: 'official', lang: 'en', name: { en: 'B', hi: 'बी' }, homepage: 'https://b', url: FEED_B, refreshMinutes: 10 },
  { id: 'rbi-rates', type: 'indicator', adapter: 'rbi-rates', kind: 'official', lang: 'en', name: { en: 'RBI', hi: 'आरबीआई' }, homepage: 'https://rbi', url: 'https://www.rbi.org.in/', refreshMinutes: 360 },
]

const feed = (...items: Array<[string, string]>) =>
  `<rss><channel>${items
    .map(([title, at]) => `<item><title>${title}</title><link>https://example.com/${encodeURIComponent(title)}</link><pubDate>${at}</pubDate></item>`)
    .join('')}</channel></rss>`

const ok = (text: string): FetchResult => ({ status: 200, text, etag: null, lastModified: null, notModified: false })
const rbiPage = (repo: string) => `<tr><th> Policy Repo Rate </th><td> : ${repo}% </td></tr>`

function setup() {
  let now = new Date('2026-10-11T06:00:00Z')
  const responses = new Map<string, () => FetchResult>()
  const calls: string[] = []
  const fetcher: Fetcher = async (url) => {
    calls.push(url)
    const respond = responses.get(url)
    if (!respond) throw new SourceError('HTTP 503')
    return respond()
  }
  const store = memoryStore(emptyCache())
  const service = new DashboardService({
    store,
    fetcher,
    sources: SOURCES,
    now: () => now,
    coldStartWaitMs: 1000,
  })
  return {
    service,
    store,
    calls,
    responses,
    advance: (minutes: number) => {
      now = new Date(now.getTime() + minutes * 60_000)
    },
  }
}

describe('DashboardService', () => {
  it('waits for live data on a cold start and returns normalized updates', async () => {
    const t = setup()
    t.responses.set(FEED_A, () => ok(feed(['Flood alert in Assam', 'Sun, 11 Oct 2026 05:50:00 GMT'])))
    t.responses.set(FEED_B, () => ok(feed(['Cabinet approves scheme', 'Sun, 11 Oct 2026 05:40:00 GMT'])))
    t.responses.set('https://www.rbi.org.in/', () => ok(rbiPage('5.50')))

    const snap = await t.service.snapshot()
    expect(snap.updates.en.map((u) => u.title)).toEqual(['Flood alert in Assam', 'Cabinet approves scheme'])
    expect(snap.updates.en[1]!.kind).toBe('official')
    expect(snap.sources.every((s) => s.health === 'ok')).toBe(true)
    expect(snap.kpis.repo.meta.provenance).toBe('official-live')
    // The cited decision date is kept while RBI still shows the same rate.
    expect(snap.kpis.repo.meta.releasedAt).toEqual({ date: '2026-10-07', precision: 'day' })
    expect(t.store.saved?.sources.a?.lastSuccessAt).toBe('2026-10-11T06:00:00.000Z')
  })

  it('keeps the last verified items when a source fails, and marks them stale', async () => {
    const t = setup()
    t.responses.set(FEED_A, () => ok(feed(['Original A story', 'Sun, 11 Oct 2026 05:50:00 GMT'])))
    t.responses.set(FEED_B, () => ok(feed(['Original B story', 'Sun, 11 Oct 2026 05:45:00 GMT'])))
    t.responses.set('https://www.rbi.org.in/', () => ok(rbiPage('5.50')))
    await t.service.snapshot()

    // Ten minutes later feed A is down and B has news.
    t.advance(10)
    t.responses.delete(FEED_A)
    t.responses.set(FEED_B, () => ok(feed(['New B story', 'Sun, 11 Oct 2026 06:08:00 GMT'], ['Original B story', 'Sun, 11 Oct 2026 05:45:00 GMT'])))
    await t.service.refresh(SOURCES.filter((s) => s.type === 'news'))
    const snap = await t.service.snapshot()

    const a = snap.sources.find((s) => s.id === 'a')!
    expect(a.health).toBe('error')
    expect(a.lastError).toBe('HTTP 503')
    expect(a.lastSuccessAt).toBe('2026-10-11T06:00:00.000Z')

    const titles = snap.updates.en.map((u) => u.title)
    expect(titles).toEqual(['New B story', 'Original A story', 'Original B story'])
    expect(snap.updates.en.find((u) => u.title === 'Original A story')!.stale).toBe(true)
    expect(snap.updates.en.find((u) => u.title === 'New B story')!.stale).toBe(false)
  })

  it('never invents data: an unreachable indicator falls back to its cited release record', async () => {
    const t = setup()
    t.responses.set(FEED_A, () => ok(feed(['A', 'Sun, 11 Oct 2026 05:50:00 GMT'])))
    t.responses.set(FEED_B, () => ok(feed(['B', 'Sun, 11 Oct 2026 05:50:00 GMT'])))
    const snap = await t.service.snapshot()
    const repo = snap.kpis.repo
    expect(snap.sources.find((s) => s.id === 'rbi-rates')!.health).toBe('error')
    expect(repo.meta.provenance).toBe('release-record')
    expect(repo.meta.source.url).toMatch(/^https:\/\//)
  })

  it('serves the last verified live reading when the source later fails', async () => {
    const t = setup()
    t.responses.set('https://www.rbi.org.in/', () => ok(rbiPage('5.75')))
    await t.service.refresh(SOURCES.filter((s) => s.id === 'rbi-rates'))
    t.advance(60 * 24)
    t.responses.delete('https://www.rbi.org.in/')
    await t.service.refresh(SOURCES.filter((s) => s.id === 'rbi-rates'))

    const snap = await t.service.snapshot()
    expect(snap.kpis.repo.value).toBe(5.75)
    expect(snap.kpis.repo.meta.health).toBe('error')
    expect(snap.kpis.repo.meta.checkedAt).toBe('2026-10-11T06:00:00.000Z')
    // A changed value has no cited decision date; we report when the change was observed.
    expect(snap.kpis.repo.meta.releasedAt?.precision).toBe('observed')
  })

  it('treats an empty feed as a failure instead of wiping cached items', async () => {
    const t = setup()
    t.responses.set(FEED_A, () => ok(feed(['Kept story', 'Sun, 11 Oct 2026 05:50:00 GMT'])))
    await t.service.refresh([SOURCES[0]!])
    t.advance(10)
    t.responses.set(FEED_A, () => ok('<rss><channel></channel></rss>'))
    await t.service.refresh([SOURCES[0]!])
    const snap = await t.service.snapshot()
    expect(snap.sources.find((s) => s.id === 'a')!.lastError).toMatch(/no items/i)
    expect(snap.updates.en.map((u) => u.title)).toContain('Kept story')
  })

  it('respects cadence and rate-limits manual refreshes', async () => {
    const t = setup()
    t.responses.set(FEED_A, () => ok(feed(['A', 'Sun, 11 Oct 2026 05:50:00 GMT'])))
    t.responses.set(FEED_B, () => ok(feed(['B', 'Sun, 11 Oct 2026 05:50:00 GMT'])))
    t.responses.set('https://www.rbi.org.in/', () => ok(rbiPage('5.50')))
    await t.service.snapshot()
    expect(t.calls).toHaveLength(3)

    t.advance(5)
    await t.service.snapshot()
    expect(t.calls).toHaveLength(3) // nothing due yet

    await t.service.refreshNow()
    expect(t.calls).toHaveLength(5) // both feeds, not the healthy RBI source
    await t.service.refreshNow()
    expect(t.calls).toHaveLength(5) // within a minute of the last attempt
  })
})
