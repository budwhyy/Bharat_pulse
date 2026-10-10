import { mergeUpdates, pruneUpdates } from '../domain/merge'
import { sourceHealth, staleAfterMs } from '../domain/freshness'
import type { DashboardSnapshot, NormalizedItem, SourceState } from '../domain/types'
import { assertFeedLanguage, normalizeFeedItems } from './adapters/news'
import { parsePibRelease } from './adapters/pib'
import { parseRbiRates } from './adapters/rbi'
import { parseFeed } from './adapters/rss'
import { WB_SERIES, parseWorldBank, worldBankUrl, type WbSeriesKey } from './adapters/worldbank'
import { emptyDiscovery, type CacheData, type CacheStore } from './cache'
import {
  DISCOVERY_INTERVAL_MINUTES,
  MAX_DISCOVERED,
  RETIRE_AFTER_FAILURES,
  RETIRE_AFTER_HOURS,
  discoverFeeds,
  isNationalSection,
} from './discovery'
import type { Fetcher } from './http'
import { PUBLISHERS, type Publisher } from './publishers'
import { buildSnapshot } from './snapshot'
import { SOURCES, type IndicatorSource, type NewsSource, type SourceDef } from './sources'
import { sortTime } from '../domain/select'

export interface ServiceOptions {
  store: CacheStore
  fetcher: Fetcher
  sources?: SourceDef[]
  now?: () => Date
  /** First request with an empty cache waits this long for live data before rendering. */
  coldStartWaitMs?: number
  /** Manual refresh never re-hits a source more often than this. */
  manualMinIntervalMs?: number
  /** PIB release pages fetched per routine refresh to learn publish times (all on a first fetch). */
  pibEnrichLimit?: number
  /** Publishers the discovery scanner may explore. Defaults to none when custom sources are injected. */
  publishers?: Publisher[]
  log?: (message: string) => void
}

export interface DiscoverySummary {
  ran: boolean
  checked: number
  added: number
  retired: number
  active: number
}

const MINUTE = 60_000
const emptyState = (): SourceState => ({
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
  consecutiveFailures: 0,
  itemCount: 0,
})

function retryDelayMs(source: SourceDef, failures: number): number {
  const base = source.refreshMinutes * MINUTE
  if (failures === 0) return base
  return Math.min(15 * MINUTE * 2 ** (failures - 1), Math.max(base, 60 * MINUTE))
}

function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return message.replace(/\s+/g, ' ').slice(0, 140)
}

function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms).unref?.())
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index]!)
    }
  })
  await Promise.all(workers)
  return results
}

/**
 * Owns the source cache. Reads are stale-while-revalidate: a snapshot request
 * returns the cached state immediately and starts a refresh of any source that
 * is due. A failed source keeps its last verified data and is reported as
 * error/stale; nothing is ever substituted for it.
 */
export class DashboardService {
  private data: CacheData | null = null
  private loading: Promise<CacheData> | null = null
  private inflight: Promise<void> | null = null
  private discovering: Promise<DiscoverySummary> | null = null
  private readonly sources: SourceDef[]
  private readonly publishers: Publisher[]
  private readonly now: () => Date

  constructor(private readonly options: ServiceOptions) {
    this.sources = options.sources ?? SOURCES
    this.publishers = options.publishers ?? (options.sources ? [] : PUBLISHERS)
    this.now = options.now ?? (() => new Date())
  }

  /** Fixed registry plus feeds the scanner has added. */
  private allSources(): SourceDef[] {
    return [...this.sources, ...Object.values(this.data?.discovery?.sources ?? {})]
  }

  discoveryDue(now: Date): boolean {
    if (this.publishers.length === 0) return false
    const last = this.data?.discovery?.lastRunAt
    return !last || now.getTime() - Date.parse(last) >= DISCOVERY_INTERVAL_MINUTES * MINUTE
  }

  /** Runs a discovery scan if one is due (or forced); concurrent callers share the same run. */
  async discover(force = false): Promise<DiscoverySummary> {
    const data = await this.load()
    data.discovery ??= emptyDiscovery()
    if (!force && !this.discoveryDue(this.now())) {
      return { ran: false, checked: 0, added: 0, retired: 0, active: Object.keys(data.discovery.sources).length }
    }
    this.discovering ??= this.runDiscovery().finally(() => {
      this.discovering = null
    })
    return this.discovering
  }

  private async runDiscovery(): Promise<DiscoverySummary> {
    const data = this.data!
    const state = data.discovery
    const now = this.now()

    // Retire discovered feeds that keep failing or have gone quiet.
    let retired = 0
    for (const source of Object.values(state.sources)) {
      const failures = data.sources[source.id]?.consecutiveFailures ?? 0
      const newest = Object.values(data.updates)
        .filter((u) => u.sourceId === source.id)
        .reduce((max, u) => Math.max(max, sortTime(u)), Date.parse(source.discoveredAt ?? now.toISOString()))
      // Re-checked against today's rules too, so tightening a rule cleans up earlier finds.
      const publisher = this.publishers.find((p) => p.id === source.publisherId)
      const qualifies = publisher ? isNationalSection(source.url, publisher, source.name.en) : false
      if (!qualifies || failures >= RETIRE_AFTER_FAILURES || now.getTime() - newest > RETIRE_AFTER_HOURS * 3600_000) {
        delete state.sources[source.id]
        delete data.sources[source.id]
        for (const [id, update] of Object.entries(data.updates)) if (update.sourceId === source.id) delete data.updates[id]
        retired += 1
      }
    }

    let added = 0
    let checked = 0
    try {
      const result = await discoverFeeds({
        fetcher: this.options.fetcher,
        now,
        publishers: this.publishers,
        sources: this.allSources(),
        updates: data.updates,
      })
      checked = result.checked
      for (const source of result.accepted) {
        if (Object.keys(state.sources).length >= MAX_DISCOVERED) break
        state.sources[source.id] = source
        added += 1
      }
      state.lastError = null
      this.options.log?.(
        `discovery: checked ${checked}, added ${added}, retired ${retired}; rejected ${JSON.stringify(result.rejected)}`,
      )
    } catch (error) {
      state.lastError = errorText(error)
    }
    state.lastRunAt = now.toISOString()
    state.checked = checked
    state.added = added
    state.retired = retired
    try {
      await this.options.store.save(data)
    } catch (error) {
      this.options.log?.(`cache save failed: ${errorText(error)}`)
    }
    return { ran: true, checked, added, retired, active: Object.keys(state.sources).length }
  }

  private async load(): Promise<CacheData> {
    if (this.data) return this.data
    this.loading ??= this.options.store.load().then((data) => (this.data = data))
    return this.loading
  }

  isDue(source: SourceDef, now: Date): boolean {
    const state = this.data?.sources[source.id]
    if (!state?.lastAttemptAt) return true
    return now.getTime() - Date.parse(state.lastAttemptAt) >= retryDelayMs(source, state.consecutiveFailures)
  }

  private start(due: SourceDef[]): Promise<void> {
    this.inflight ??= this.refresh(due).finally(() => {
      this.inflight = null
    })
    return this.inflight
  }

  private build(): DashboardSnapshot {
    return buildSnapshot(this.data!, this.allSources(), this.now(), this.inflight !== null, {
      running: this.discovering !== null,
      enabled: this.publishers.length > 0,
      intervalMinutes: DISCOVERY_INTERVAL_MINUTES,
    })
  }

  async snapshot(): Promise<DashboardSnapshot> {
    const data = await this.load()
    data.discovery ??= emptyDiscovery()
    const now = this.now()
    // Hourly scan for new feeds runs in the background and never delays a response. It waits
    // until some stories are cached, because its duplicate-coverage check compares against them.
    if (this.discoveryDue(now) && !this.discovering && Object.keys(data.updates).length > 0) void this.discover()
    const due = this.allSources().filter((s) => this.isDue(s, now))
    if (due.length && !this.inflight) {
      const run = this.start(due)
      const cold = !Object.values(data.sources).some((s) => s.lastSuccessAt)
      if (cold) await Promise.race([run, timeout(this.options.coldStartWaitMs ?? 9000)])
    }
    return this.build()
  }

  /** User-initiated refresh: re-checks news sources not hit in the last minute and any failing indicator. */
  async refreshNow(): Promise<DashboardSnapshot> {
    const data = await this.load()
    if (this.inflight) await Promise.race([this.inflight, timeout(20_000)])
    const now = this.now()
    const minGap = this.options.manualMinIntervalMs ?? MINUTE
    const due = this.allSources().filter((s) => {
      const state = data.sources[s.id]
      const since = state?.lastAttemptAt ? now.getTime() - Date.parse(state.lastAttemptAt) : Infinity
      if (s.type === 'news') return since >= minGap
      return sourceHealth(state, s.refreshMinutes, now) !== 'ok' && since >= 5 * minGap
    })
    if (due.length) await Promise.race([this.start(due), timeout(20_000)])
    return this.build()
  }

  /** Refreshes the given sources concurrently, then prunes and persists once. */
  async refresh(sources: SourceDef[]): Promise<void> {
    await this.load()
    await Promise.all(sources.map((source) => this.refreshSource(source)))
    this.data!.updates = pruneUpdates(this.data!.updates, this.now())
    try {
      await this.options.store.save(this.data!)
    } catch (error) {
      this.options.log?.(`cache save failed: ${errorText(error)}`)
    }
  }

  private async refreshSource(source: SourceDef): Promise<void> {
    const data = this.data!
    const previous = data.sources[source.id] ?? emptyState()
    const attemptAt = this.now().toISOString()
    try {
      const patch =
        source.type === 'news' ? await this.refreshNews(source, previous) : await this.refreshIndicator(source)
      data.sources[source.id] = {
        ...previous,
        ...patch,
        lastAttemptAt: attemptAt,
        lastSuccessAt: this.now().toISOString(),
        lastError: null,
        consecutiveFailures: 0,
      }
    } catch (error) {
      data.sources[source.id] = {
        ...previous,
        lastAttemptAt: attemptAt,
        lastError: errorText(error),
        consecutiveFailures: previous.consecutiveFailures + 1,
      }
      this.options.log?.(`${source.id}: ${errorText(error)}`)
    }
  }

  private async refreshNews(source: NewsSource, state: SourceState): Promise<Partial<SourceState>> {
    const response = await this.options.fetcher(source.url, {
      etag: state.etag,
      lastModified: state.lastModified,
      cookies: source.cookies,
    })
    if (response.notModified) return {}
    const now = this.now()
    // "First seen" only bounds an undated item's time if we were already following this source.
    const watching =
      state.lastSuccessAt !== null && now.getTime() - Date.parse(state.lastSuccessAt) <= staleAfterMs(source.refreshMinutes)
    let items = normalizeFeedItems(parseFeed(response.text), source, now)
    if (items.length === 0) throw new Error('Feed returned no items')
    assertFeedLanguage(items, source.lang)
    if (source.pib) items = await this.enrichPib(items, source, watching ? (this.options.pibEnrichLimit ?? 10) : items.length)
    this.data!.updates = mergeUpdates(this.data!.updates, items, this.now(), watching).records
    return { itemCount: items.length, etag: response.etag, lastModified: response.lastModified }
  }

  /** PIB's feed has no dates: read "Posted On" from the newest release pages not yet dated. */
  private async enrichPib(items: NormalizedItem[], source: NewsSource, limit: number): Promise<NormalizedItem[]> {
    const known = new Map<string, boolean>()
    for (const record of Object.values(this.data!.updates)) {
      for (const key of record.keys) known.set(key, Boolean(record.publishedAt))
    }
    const needs = items
      .filter((item) => !item.keys.some((k) => known.get(k)))
      .sort((a, b) => b.seq - a.seq)
      .slice(0, limit)

    const enriched = new Map<NormalizedItem, NormalizedItem>()
    await mapLimit(needs, 3, async (item) => {
      try {
        const page = await this.options.fetcher(item.url, { cookies: source.cookies, timeoutMs: 8000 })
        const release = parsePibRelease(page.text, item.title, this.now())
        enriched.set(item, {
          ...item,
          publishedAt: release.publishedAt ?? item.publishedAt,
          summary: release.summary ?? item.summary,
        })
      } catch {
        // Keep the item; it falls back to its first-seen time.
      }
    })
    return items.map((item) => enriched.get(item) ?? item)
  }

  private async refreshIndicator(source: IndicatorSource): Promise<Partial<SourceState>> {
    const nowIso = this.now().toISOString()
    if (source.adapter === 'rbi-rates') {
      const response = await this.options.fetcher(source.url)
      const rates = parseRbiRates(response.text)
      const prior = this.data!.rbi
      const changed = prior !== null && prior.repo !== rates.repo
      this.data!.rbi = {
        ...rates,
        checkedAt: nowIso,
        firstObservedAt: prior && !changed ? prior.firstObservedAt : nowIso,
        previous: changed ? prior.repo : (prior?.previous ?? null),
      }
      return { itemCount: 1 }
    }

    const keys = Object.keys(WB_SERIES) as WbSeriesKey[]
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const response = await this.options.fetcher(worldBankUrl(WB_SERIES[key]), { timeoutMs: 15_000 })
        return parseWorldBank(response.text)
      }),
    )
    let failed = 0
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') this.data!.worldBank[keys[index]!] = { ...result.value, checkedAt: nowIso }
      else failed += 1
    })
    if (failed) throw new Error(`${failed} of ${keys.length} World Bank series failed`)
    return { itemCount: keys.length }
  }
}
