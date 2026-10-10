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
  return {
    ...baseline,
    value: latest.value / 1e9,
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

  return {
    generatedAt: now.toISOString(),
    refreshing,
    updates,
    sources: sourceViews,
    kpis: Object.fromEntries(kpiEntries) as Record<KpiId, Kpi>,
    datasets: buildDatasets(data, health.get('world-bank') ?? 'pending'),
  }
}
