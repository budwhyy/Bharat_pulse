import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { emptyCache, memoryStore } from './cache'
import { buildSnapshot } from './snapshot'
import { configuredSources, PULSE_SOURCES, type SourceDef } from './sources'
import { DashboardService } from './service'
import type { UpdateRecord, SourceState } from '../domain/types'
import type { FetchResult } from './http'

const NOW = new Date('2026-10-11T06:00:00Z')
const healthy: SourceState = { lastAttemptAt: NOW.toISOString(), lastSuccessAt: NOW.toISOString(), lastError: null, consecutiveFailures: 0, itemCount: 1 }
const sources: SourceDef[] = [{ id: 'the-hindu', type: 'news', kind: 'reported', lang: 'en', name: { en: 'The Hindu', hi: 'द हिंदू' }, url: 'https://www.thehindu.com/news/national/?service=rss', homepage: 'https://www.thehindu.com/', refreshMinutes: 10 }, ...PULSE_SOURCES]
const record = (id: string, over: Partial<UpdateRecord> = {}): UpdateRecord => ({ id, keys: [id], sourceId: 'the-hindu', kind: 'reported', lang: 'en', title: 'Delhi cabinet approves city transport investment', summary: null, url: `https://www.thehindu.com/${id}`, category: 'policy', publishedAt: '2026-10-11T05:00:00Z', firstSeenAt: '2026-10-11T05:00:00Z', timeBasis: 'published', seq: 1, ...over })
const ok = (text: string): FetchResult => ({ text, status: 200, notModified: false, etag: null, lastModified: null })

describe('pulse snapshot', () => {
  it('filters removed sources and digests, marks stale clusters, and counts recent states', () => {
    const data = emptyCache()
    data.updates = { a: record('a'), removed: record('removed', { sourceId: 'removed' }), digest: record('digest', { title: 'Top 10 news today: morning roundup' }), old: record('old', { publishedAt: '2026-10-09T05:00:00Z' }) }
    const snap = buildSnapshot(data, sources, NOW, false)
    expect(snap.pulse.clusters.en).toHaveLength(1)
    expect(snap.pulse.clusters.en[0]?.stale).toBe(true)
    expect(snap.pulse.stateCounts.en.DL).toBe(1)
    expect(snap.pulse.clusterTimes.en).toEqual([Date.parse('2026-10-11T05:00:00Z')])
    expect(snap.fx).toBeNull()
    expect(snap.aqi.cities).toEqual([])
  })
  it('counts a publisher once across fixed and discovered feeds', () => {
    const data = emptyCache()
    data.updates = { a: record('a'), b: record('b', { sourceId: 'discovered-hindu' }) }
    const source: SourceDef = { ...sources[0]!, type: 'news', id: 'discovered-hindu', url: 'https://www.thehindu.com/news/national/feed', publisherId: 'the-hindu' }
    expect(buildSnapshot(data, [...sources, source], NOW, false).pulse.clusters.en[0]?.outlets).toHaveLength(1)
  })
  it('preserves daily business dates and cached alert status; excludes expired alerts', () => {
    const data = emptyCache()
    data.sources['fbil-rates'] = healthy
    data.fx = [{ date: '2026-10-08', value: 91, displayTime: null }, { date: '2026-10-09', value: 92, displayTime: null }]
    data.alerts = ['2026-10-11T05:00:00Z', '2026-10-09T05:00:00Z'].map((at) => ({ id: at, at, title: 'Severe flood Delhi', category: 'Met', authority: 'NDMA', states: ['DL'], url: 'https://sachet.ndma.gov.in/' }))
    const snap = buildSnapshot(data, sources, NOW, false)
    expect(snap.fx).toMatchObject({ value: 92, previous: 91, date: '2026-10-09', meta: { cadence: 'daily', health: 'ok' } })
    expect(snap.alerts).toHaveLength(1)
    expect(snap.alerts[0]?.stale).toBe(true)
    data.fx = [{ date: '2026-10-01', value: 92, displayTime: null }]
    expect(buildSnapshot(data, sources, NOW, false).fx?.meta.health).toBe('stale')
  })
  it('does not expose a cached AQI when the key has been removed', () => {
    const data = emptyCache()
    data.aqi = [{ city: 'Delhi', aqi: 50, band: 'good', at: NOW.toISOString(), stations: 1 }]
    const snap = buildSnapshot(data, configuredSources(false), NOW, false)
    expect(snap.aqi).toEqual({ enabled: false, unavailableReason: 'needs-key', cities: [], meta: null })
    expect(snap.sources.some((s) => s.id === 'cpcb-aqi')).toBe(false)
  })
})

describe('pulse refresh', () => {
  it('does not activate CPCB from a key alone, and rejects direct refresh until units are verified', async () => {
    const source = PULSE_SOURCES.find((s) => s.id === 'cpcb-aqi')!
    let calls = 0
    const service = new DashboardService({ sources: [source], store: memoryStore(), now: () => NOW, dataGovInApiKey: 'fixture-secret', fetcher: async () => { calls++; throw new Error('Must not fetch') } })
    await service.refresh([source])
    expect(calls).toBe(0)
    expect((await service.snapshot()).sources[0]?.lastError).toBe('CPCB pollutant units need verification')
    const gated = new DashboardService({ sources: [], store: memoryStore(), now: () => NOW, dataGovInApiKey: 'fixture-secret', fetcher: async () => { throw new Error('Must not fetch') } })
    expect((await gated.snapshot()).aqi.unavailableReason).toBe('needs-verification')
  })
  it('keeps last verified reference data after a failed refresh', async () => {
    let failed = false
    const store = memoryStore()
    const source = PULSE_SOURCES.find((s) => s.id === 'fbil-rates')!
    const service = new DashboardService({ sources: [source], store, now: () => NOW, fetcher: async () => {
      if (failed) throw new Error('Network error')
      return ok(JSON.stringify([{ subProdName: 'INR / 1 USD', rate: 92, processRunDate: '2026-10-09 00:00:00' }]))
    } })
    await service.refresh([source])
    failed = true
    await service.refresh([source])
    const snap = await service.snapshot()
    expect(snap.fx?.value).toBe(92)
    expect(snap.fx?.meta.health).toBe('error')
    expect(service.isDue(source, new Date(NOW.getTime() + 1_000))).toBe(false)
  })
  it('does not leak key-bearing exceptions to public source state', async () => {
    const source = PULSE_SOURCES.find((s) => s.id === 'cpcb-aqi')!
    const service = new DashboardService({ sources: [source], store: memoryStore(), now: () => NOW, dataGovInApiKey: 'fixture-secret', cpcbConcentrationVerified: true, fetcher: async (url) => { throw new Error(url) } })
    await service.refresh([source])
    const snap = await service.snapshot()
    expect(JSON.stringify(snap)).not.toContain('fixture-secret')
    expect(snap.sources[0]?.lastError).toBe('4 of 4 CPCB cities unavailable')
  })
})

// Optional, local-only performance check against the real cache; never required in CI.
it.runIf(process.env.PULSE_BENCH === '1')('measures clustering on the local cache', async () => {
  const data = { ...emptyCache(), ...JSON.parse(await readFile('data/cache/cache.json', 'utf8')) }
  const news = Object.values(data.updates) as UpdateRecord[]
  const at = new Date(Math.max(...news.map((u) => Date.parse(u.publishedAt ?? u.firstSeenAt))))
  const start = performance.now()
  const snap = buildSnapshot(data, [...configuredSources(false), ...Object.values(data.discovery.sources) as SourceDef[]], at, false)
  const ms = performance.now() - start
  console.log(`Pulse benchmark: ${news.length} cached records, ${snap.pulse.clusterTimes.en.length + snap.pulse.clusterTimes.hi.length} clusters, ${ms.toFixed(1)} ms`)
  expect(ms).toBeLessThan(2000)
})
