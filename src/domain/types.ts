/**
 * Stable dashboard records. Every source adapter normalizes into these shapes;
 * the UI only ever reads them. All timestamps are ISO-8601 strings so the
 * snapshot serializes identically on the server and in the browser.
 */

export type Lang = 'en' | 'hi'
export const LANGS: readonly Lang[] = ['en', 'hi']

export type Localized = { en: string; hi: string }

/** News categories. `general` is national news that matched no rule. */
export type Category = 'politics' | 'economy' | 'policy' | 'society' | 'risk' | 'general'
export const BALANCED_CATEGORIES = ['politics', 'economy', 'policy', 'society', 'risk'] as const

/** Official = government/regulator announcement; reported = a publisher's report. */
export type UpdateKind = 'official' | 'reported'

export type Health = 'ok' | 'stale' | 'error' | 'pending'

export interface UpdateRecord {
  /** Dedupe key (canonical URL or source+GUID). */
  id: string
  /** Every key this record is known by, so later fetches dedupe against any of them. */
  keys: string[]
  sourceId: string
  lang: Lang
  kind: UpdateKind
  title: string
  /** Publisher-provided teaser, stripped and clamped. Never full article text. */
  summary: string | null
  /** Link to the original report. */
  url: string
  category: Category
  /** Time the publisher states, if it was present and plausible. */
  publishedAt: string | null
  /** When this server first saw the item. */
  firstSeenAt: string
  /**
   * What orders and labels this item:
   * - published: the publisher's own timestamp;
   * - first-seen: no publisher time, but the source was being watched, so it appeared within one refresh interval;
   * - unknown: no publisher time and the item was already present when watching began (first fetch or after an outage).
   */
  timeBasis: 'published' | 'first-seen' | 'unknown'
  /** Tie-breaker for identical times (e.g. PIB release id); higher is newer. */
  seq: number
}

/** One normalized item from a single fetch, before it is merged into the cache. */
export type NormalizedItem = Omit<UpdateRecord, 'id' | 'firstSeenAt' | 'timeBasis'>

export interface SourceState {
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
  consecutiveFailures: number
  itemCount: number
  etag?: string | null
  lastModified?: string | null
}

// ---------------------------------------------------------------------------
// Indicators

export type Cadence = 'monthly' | 'quarterly' | 'annual' | 'policy'

/**
 * official-live: fetched from an official Indian source on a schedule.
 * intl-live: fetched from an international statistical API (World Bank).
 * release-record: a dated release transcribed from a cited report; not auto-updated.
 */
export type Provenance = 'official-live' | 'intl-live' | 'release-record'

export interface ReleaseDate {
  date: string
  /** `observed` = the source publishes no release date; this is when a change was first seen. */
  precision: 'day' | 'month' | 'year' | 'observed'
}

export interface SourceRef {
  name: string
  url: string
}

export interface DataMeta {
  provenance: Provenance
  cadence: Cadence
  source: SourceRef
  releasedAt: ReleaseDate | null
  /** Last time the value was confirmed against its source (manual date for release records). */
  checkedAt: string | null
  /** Approximate date a newer official release is expected. */
  nextReleaseDue: string | null
  health: Health
}

export type KpiId = 'gdp' | 'cpi' | 'repo' | 'unemployment' | 'upi' | 'population' | 'flfpr' | 'wpi'
export const KPI_ORDER: readonly KpiId[] = ['gdp', 'cpi', 'repo', 'unemployment', 'upi', 'population', 'flfpr', 'wpi']

export type Unit = 'percent' | 'billion-transactions' | 'billion-people'

/** A reference point shown beside the headline value (previous period, target, a component). */
export interface Comparison {
  label: Localized
  value: number
  kind: 'previous' | 'target' | 'component'
}

export interface Kpi {
  id: KpiId
  value: number | null
  comparisons: Comparison[]
  unit: Unit
  decimals: number
  period: Localized
  note: Localized | null
  meta: DataMeta
}

export interface SeriesPoint {
  key: string
  label: Localized
  value: number
  note?: Localized
  projected?: boolean
}

export interface UnemploymentPoint {
  key: string
  label: Localized
  all: number
  urban: number
  rural: number
}

export interface UpiPoint {
  key: string
  label: Localized
  /** Transactions, billions. */
  volume: number
  /** Value, ₹ lakh crore. */
  value: number
}

export interface Dataset<Row> {
  rows: Row[]
  meta: DataMeta
}

export interface Datasets {
  gdpQuarterly: Dataset<SeriesPoint>
  gdpAnnual: Dataset<SeriesPoint>
  cpi: Dataset<SeriesPoint>
  unemployment: Dataset<UnemploymentPoint>
  upi: Dataset<UpiPoint>
  population: Dataset<SeriesPoint>
  ageStructure: Dataset<SeriesPoint>
  femaleLfpr: Dataset<SeriesPoint>
  fertility: Dataset<SeriesPoint>
}

// ---------------------------------------------------------------------------
// Snapshot sent to the browser

export interface SourceView {
  id: string
  name: Localized
  type: 'news' | 'indicator'
  kind: UpdateKind
  lang: Lang
  homepage: string
  health: Health
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  /** Short, sanitized reason for the last failure. */
  lastError: string | null
}

export interface UpdateView extends UpdateRecord {
  sourceName: Localized
  /** The item's source is not currently healthy; this is the last verified copy. */
  stale: boolean
  /** Shown in a language other than the one requested (no matching-language item). */
  languageFallback: boolean
}

export interface DashboardSnapshot {
  generatedAt: string
  refreshing: boolean
  updates: Record<Lang, UpdateView[]>
  sources: SourceView[]
  kpis: Record<KpiId, Kpi>
  datasets: Datasets
}
