import {
  AGE_STRUCTURE_BASELINE,
  BRIEFING_CHECKED,
  CPI_SERIES,
  FERTILITY_BASELINE,
  GDP_ANNUAL,
  GDP_QUARTERLY,
  KPI_RECORDS,
  POPULATION_META,
  UNEMPLOYMENT_SERIES,
  UPI_SERIES,
  type KpiRecord,
  type RecordMeta,
} from '../data/briefing'
import { isRoundup } from '../domain/categorize'
import { sourceHealth } from '../domain/freshness'
import { selectLatest } from '../domain/select'
import { clusterStories, rankClusters } from '../domain/stories'
import { PUBLISHERS, matchesPublisher } from './publishers'
import {
  KPI_ORDER,
  LANGS,
  type DashboardSnapshot,
  type DataMeta,
  type Dataset,
  type Datasets,
  type Health,
  type Kpi,
  type KpiId,
  type SeriesPoint,
  type SourceView,
  type UpdateView,
} from '../domain/types'
import type { WbSeriesKey } from './adapters/worldbank'
import type { CacheData, WbCachedSeries } from './cache'
import type { SourceDef } from './sources'

function recordMeta(meta: RecordMeta): DataMeta {
  return {
    provenance: 'release-record',
    cadence: meta.cadence,
    source: meta.source,
    releasedAt: meta.releasedAt,
    checkedAt: BRIEFING_CHECKED,
    nextReleaseDue: meta.nextReleaseDue,
    health: 'ok',
  }
}

function recordKpi(record: KpiRecord): Kpi {
  return { ...record, meta: recordMeta(record.meta) }
}

function recordDataset<Row>(set: { rows: Row[]; meta: RecordMeta }): Dataset<Row> {
  return { rows: set.rows, meta: recordMeta(set.meta) }
}

const WB_LINKS: Record<WbSeriesKey, string> = {
  population: 'https://data.worldbank.org/indicator/SP.POP.TOTL?locations=IN',
  age0to14: 'https://data.worldbank.org/indicator/SP.POP.0014.TO.ZS?locations=IN',
  age15to64: 'https://data.worldbank.org/indicator/SP.POP.1564.TO.ZS?locations=IN',
  age65plus: 'https://data.worldbank.org/indicator/SP.POP.65UP.TO.ZS?locations=IN',
  femaleLfpr: 'https://data.worldbank.org/indicator/SL.TLF.CACT.FE.ZS?locations=IN',
  fertility: 'https://data.worldbank.org/indicator/SP.DYN.TFRT.IN?locations=IN',
}

function wbMeta(key: WbSeriesKey, series: WbCachedSeries | undefined, health: Health): DataMeta {
  return {
    provenance: 'intl-live',
    cadence: 'annual',
    source: { name: 'World Bank WDI', url: WB_LINKS[key] },
    releasedAt: series?.lastUpdated ? { date: series.lastUpdated, precision: 'day' } : null,
    checkedAt: series?.checkedAt ?? null,
    nextReleaseDue: null,
    health,
  }
}

const yearPoint = (year: string, value: number): SeriesPoint => ({ key: year, label: { en: year, hi: year }, value })

function buildRepo(data: CacheData, health: Health): Kpi {
  const baseline = KPI_RECORDS.repo
  const live = data.rbi
  if (!live) return recordKpi(baseline)
  const unchanged = live.repo === baseline.value
  return {
    ...baseline,
    value: live.repo,
    period: unchanged ? baseline.period : { en: 'Current policy rate', hi: 'मौजूदा नीतिगत दर' },
    note: unchanged
      ? baseline.note
      : live.previous != null
        ? { en: `Changed from ${live.previous.toFixed(2)}%`, hi: `${live.previous.toFixed(2)}% से बदली` }
        : null,
    comparisons: unchanged
      ? baseline.comparisons
      : live.previous != null
        ? [{ label: { en: 'Previous', hi: 'पिछली' }, value: live.previous, kind: 'previous' }]
        : [],
    meta: {
      provenance: 'official-live',
      cadence: 'policy',
      source: { name: 'Reserve Bank of India', url: 'https://www.rbi.org.in/' },
      // RBI's homepage gives no decision date; reuse the cited one only while the value still matches it.
      releasedAt: unchanged ? baseline.meta.releasedAt : { date: live.firstObservedAt, precision: 'observed' },
      checkedAt: live.checkedAt,
      nextReleaseDue: null,
      health,
    },
  }
}

function buildPopulation(data: CacheData, health: Health): Kpi {
  const baseline = KPI_RECORDS.population
  const series = data.worldBank.population
  const latest = series?.points.at(-1)
  if (!series || !latest) return recordKpi(baseline)
  const fertility = data.worldBank.fertility?.points.at(-1)
  const prior = series.points.at(-2)
  return {
    ...baseline,
    value: latest.value / 1e9,
    comparisons: prior ? [{ label: { en: prior.year, hi: prior.year }, value: prior.value / 1e9, kind: 'previous' }] : [],
    period: { en: `${latest.year} · World Bank estimate`, hi: `${latest.year} · विश्व बैंक अनुमान` },
    note: fertility
      ? {
          en: `Fertility ${fertility.value.toFixed(1)} births per woman (${fertility.year})`,
          hi: `प्रजनन दर ${fertility.value.toFixed(1)} बच्चे प्रति महिला (${fertility.year})`,
        }
      : null,
    meta: wbMeta('population', series, health),
  }
}

function buildDatasets(data: CacheData, wbHealth: Health): Datasets {
  const wb = data.worldBank

  const population: Dataset<SeriesPoint> = wb.population
    ? {
        rows: wb.population.points.slice(-16).map((p) => yearPoint(p.year, p.value / 1e9)),
        meta: wbMeta('population', wb.population, wbHealth),
      }
    : { rows: [], meta: recordMeta(POPULATION_META) }

  // Age shares must come from the same year to be comparable.
  const shareKeys = ['age0to14', 'age15to64', 'age65plus'] as const
  const commonYear = shareKeys
    .map((k) => wb[k]?.points.at(-1)?.year)
    .reduce<string | null | undefined>((acc, y) => (acc === undefined ? y ?? null : acc === y ? acc : null), undefined)
  const ageStructure: Dataset<SeriesPoint> =
    commonYear && shareKeys.every((k) => wb[k])
      ? {
          rows: shareKeys.map((k, i) => ({
            ...AGE_STRUCTURE_BASELINE[i]!,
            value: wb[k]!.points.at(-1)!.value,
          })),
          meta: wbMeta('age15to64', wb.age15to64, wbHealth),
        }
      : { rows: AGE_STRUCTURE_BASELINE, meta: recordMeta(POPULATION_META) }

  const femaleLfpr: Dataset<SeriesPoint> = {
    rows: wb.femaleLfpr ? wb.femaleLfpr.points.slice(-16).map((p) => yearPoint(p.year, p.value)) : [],
    meta: wbMeta('femaleLfpr', wb.femaleLfpr, wbHealth),
  }

  const fertility: Dataset<SeriesPoint> = wb.fertility
    ? {
        rows: wb.fertility.points.slice(-16).map((p) => yearPoint(p.year, p.value)),
        meta: wbMeta('fertility', wb.fertility, wbHealth),
      }
    : { rows: FERTILITY_BASELINE, meta: recordMeta(POPULATION_META) }

  return {
    gdpQuarterly: recordDataset(GDP_QUARTERLY),
    gdpAnnual: recordDataset(GDP_ANNUAL),
    cpi: recordDataset(CPI_SERIES),
    unemployment: recordDataset(UNEMPLOYMENT_SERIES),
    upi: recordDataset(UPI_SERIES),
    population,
    ageStructure,
    femaleLfpr,
    fertility,
  }
}

/** Builds the serializable snapshot the browser renders. Pure: same cache + clock → same output. */
export function buildSnapshot(
  data: CacheData,
  sources: SourceDef[],
  now: Date,
  refreshing: boolean,
  discovery: { running: boolean; enabled: boolean; intervalMinutes: number } = {
    running: false,
    enabled: false,
    intervalMinutes: 60,
  },
  aqiUnavailableReason: 'needs-key' | 'needs-verification' = 'needs-key',
): DashboardSnapshot {
  const health = new Map<string, Health>(
    sources.map((s) => [s.id, sourceHealth(data.sources[s.id], s.refreshMinutes, now)]),
  )
  const byId = new Map(sources.map((s) => [s.id, s]))

  const sourceViews: SourceView[] = sources.map((s) => {
    const state = data.sources[s.id]
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      kind: s.kind,
      lang: s.lang,
      homepage: s.homepage,
      health: health.get(s.id)!,
      lastAttemptAt: state?.lastAttemptAt ?? null,
      lastSuccessAt: state?.lastSuccessAt ?? null,
      lastError: state?.lastError ?? null,
      discovered: s.type === 'news' && Boolean(s.discovered),
    }
  })

  // Roundups are dropped at ingest; filtering here too covers items cached before a rule existed.
  const records = Object.values(data.updates).filter((r) => byId.has(r.sourceId) && !isRoundup(r.title))
  const updates = Object.fromEntries(
    LANGS.map((lang) => [
      lang,
      selectLatest(records, lang).map(
        ({ record, languageFallback }): UpdateView => ({
          ...record,
          sourceName: byId.get(record.sourceId)!.name,
          stale: health.get(record.sourceId) !== 'ok',
          languageFallback,
        }),
      ),
    ]),
  ) as DashboardSnapshot['updates']

  const kpiEntries = KPI_ORDER.map((id): [KpiId, Kpi] => {
    if (id === 'repo') return [id, buildRepo(data, health.get('rbi-rates') ?? 'pending')]
    if (id === 'population') return [id, buildPopulation(data, health.get('world-bank') ?? 'pending')]
    return [id, recordKpi(KPI_RECORDS[id])]
  })

  const clusters = clusterStories(records.map((record) => {
    const source = byId.get(record.sourceId)!
    const publisher = PUBLISHERS.find((p) => source.type === 'news' && (p.id === source.publisherId || matchesPublisher(source.url, p)))
    return { record, name: publisher?.name ?? source.name, outletId: publisher?.id ?? source.id }
  }), now)
  const pulse: DashboardSnapshot['pulse'] = {
    clusters: { en: [], hi: [] }, stateCounts: { en: {}, hi: {} }, clusterTimes: { en: [], hi: [] },
  }
  for (const lang of LANGS) {
    const languageClusters = clusters.filter((c) => c.lang === lang)
    pulse.clusters[lang] = rankClusters(languageClusters).slice(0, 30).map(({ score: _score, ...cluster }) => ({
      ...cluster, stale: cluster.outlets.some((o) => health.get(o.sourceId) !== 'ok'),
    }))
    pulse.clusterTimes[lang] = languageClusters.map((c) => Date.parse(c.firstReportedAt))
    for (const cluster of languageClusters) {
      if (Date.parse(cluster.latestAt) < now.getTime() - 3 * 3600_000) continue
      for (const state of cluster.states) pulse.stateCounts[lang][state] = (pulse.stateCounts[lang][state] ?? 0) + 1
    }
  }
  const indicatorMeta = (id: string, cadence: DataMeta['cadence'], releasedAt: DataMeta['releasedAt']): DataMeta => ({
    provenance: 'official-live', cadence, releasedAt,
    source: { name: byId.get(id)?.name.en ?? id, url: byId.get(id)?.homepage ?? '' },
    checkedAt: data.sources[id]?.lastSuccessAt ?? null, nextReleaseDue: null, health: health.get(id) ?? 'pending',
  })
  const latestFx = data.fx?.at(-1)
  const fxMeta = latestFx ? indicatorMeta('fbil-rates', 'daily', { date: latestFx.date, precision: 'day' }) : null
  // Weekends/holidays retain their business-day date. An unusually old observation
  // cannot appear current merely because the HTTP request succeeded.
  if (fxMeta?.health === 'ok' && now.getTime() - Date.parse(latestFx!.date) > 5 * 86400_000) fxMeta.health = 'stale'
  const aqiEnabled = byId.has('cpcb-aqi')
  const aqiCities = aqiEnabled ? data.aqi ?? [] : []
  const aqiMeta = aqiEnabled ? indicatorMeta('cpcb-aqi', 'hourly', null) : null
  if (aqiMeta?.health === 'ok' && aqiCities.some((c) => now.getTime() - Date.parse(c.at) > 3 * 3600_000)) aqiMeta.health = 'stale'

  return {
    generatedAt: now.toISOString(),
    refreshing,
    updates,
    pulse,
    fx: latestFx && fxMeta && byId.has('fbil-rates') ? {
      pair: 'INR / 1 USD', value: latestFx.value, date: latestFx.date, displayTime: latestFx.displayTime,
      previous: data.fx.at(-2)?.value ?? null, series: data.fx.slice(-22).map(({ date, value }) => ({ date, value })), meta: fxMeta,
    } : null,
    alerts: byId.has('ndma-sachet') ? (data.alerts ?? []).filter((a) => Date.parse(a.at) <= now.getTime() && Date.parse(a.at) >= now.getTime() - 24 * 3600_000).map((a) => ({ ...a, stale: health.get('ndma-sachet') !== 'ok' })) : [],
    aqi: { enabled: aqiEnabled, ...(!aqiEnabled ? { unavailableReason: aqiUnavailableReason } : {}), cities: aqiCities, meta: aqiMeta },
    sources: sourceViews,
    kpis: Object.fromEntries(kpiEntries) as Record<KpiId, Kpi>,
    datasets: buildDatasets(data, health.get('world-bank') ?? 'pending'),
    discovery: {
      enabled: discovery.enabled,
      running: discovery.running,
      lastRunAt: data.discovery?.lastRunAt ?? null,
      nextRunAt: data.discovery?.lastRunAt
        ? new Date(Date.parse(data.discovery.lastRunAt) + discovery.intervalMinutes * 60_000).toISOString()
        : null,
      checked: data.discovery?.checked ?? 0,
      added: data.discovery?.added ?? 0,
      retired: data.discovery?.retired ?? 0,
      active: Object.keys(data.discovery?.sources ?? {}).length,
      lastError: data.discovery?.lastError ?? null,
    },
  }
}
