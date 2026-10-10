/**
 * Release records transcribed from the Bharat Pulse briefing (11 Oct 2026).
 *
 * These are dated, cited releases — not live readings and not demo data. They
 * are shown with provenance "release record", a release date, the date they
 * were last checked by hand, and the date a newer release is expected so the
 * UI can warn once they are likely superseded. Live adapters (RBI, World Bank)
 * replace the matching records whenever a fetch succeeds.
 */
import type {
  Cadence,
  KpiId,
  Localized,
  ReleaseDate,
  SeriesPoint,
  SourceRef,
  UnemploymentPoint,
  Unit,
  UpiPoint,
} from '../domain/types'

/** Date the briefing's figures were compiled and checked by hand. */
export const BRIEFING_CHECKED = '2026-10-11'

export const CITATIONS = {
  gdpQ1: { name: 'MoSPI via ANI (Times of Oman)', url: 'https://timesofoman.com/article/176276-indias-gdp-grows-by-78-in-apr-jun-quarter-beats-rbis-estimate' },
  gdpFy26: { name: 'Outlook', url: 'https://www.outlookindia.com/amp/story/business/indias-gdp-grows-78-in-q4-full-year-growth-at-77' },
  gdpSeries: { name: 'News Arena India', url: 'https://newsarenaindia.com/economy/india-gdp-grows-7-8-in-q3-fy26-seen-at-7-6/70997' },
  cpi: { name: 'MoSPI via Deccan Chronicle', url: 'https://www.deccanchronicle.com/nation/retail-inflation-for-august-2026-rises-to-482pc-telangana-tops-the-list-with-627pc-1987572' },
  wpi: { name: 'PTI via DT Next', url: 'https://www.dtnext.in/news/business/retail-inflation-rises-to-482-pc-in-august' },
  rbi: { name: 'RBI MPC via GK Today', url: 'https://www.gktoday.in/rbi-hikes-repo-rate-by-25-basis-points-to-5-50/' },
  plfs: { name: 'MoSPI PLFS monthly bulletin', url: 'https://www.mospi.gov.in/uploads/latestReleases/latest_release_1789465219488_2c7319c0-05c4-4d44-9eac-a99be911de26_Monthly_Press_note_Aug_2026.pdf' },
  upi: { name: 'NPCI via Outlook Money', url: 'https://www.outlookmoney.com/banking/upi-processes-2407-billion-transactions-worth-rs-2937-lakh-crore-in-september' },
  states2026: { name: 'India TV (ECI results)', url: 'https://www.indiatvnews.com/news/india/assembly-elections-2026-check-complete-party-wise-seats-in-west-bengal-tamil-nadu-assam-kerala-puducherry-2026-05-05-1039978' },
  vijay: { name: 'The Quint', url: 'https://www.thequint.com/amp/story/news/breaking-news/joseph-vijay-sworn-in-tamil-nadu-chief-minister' },
  bihar: { name: 'Deccan Herald', url: 'https://www.deccanherald.com/elections/bihar/bihar-assembly-elections-2025-results-nda-cruises-to-victory-by-winning-202-seats-and-a-vote-share-of-over-40-3798063' },
  genz: { name: 'Reuters via Khaleej Times', url: 'https://www.khaleejtimes.com/world/asia/india-gen-z-cjp-protests-dent-narendra-modi-image' },
  cec: { name: 'ThePrint', url: 'https://theprint.in/politics/india-bloc-parties-to-meet-on-30-sep-to-discuss-demand-for-cec-gyanesh-kumars-removal-sir-issue/3054336/' },
  lpg: { name: 'Business Today', url: 'https://www.businesstoday.in/latest/economy/story/lpg-consumption-falls-8-in-h1-2026-as-west-asia-conflict-disrupts-supplies-540664-2026-07-02' },
  tariff: { name: 'Reuters via Asharq Al-Awsat', url: 'https://english.aawsat.com/node/5299974' },
  census: { name: 'ThePrint', url: 'https://theprint.in/india/census-2027-question-on-caste-among-40-notified-by-centre-for-enumeration/3014569/' },
  population: { name: 'UNFPA via ETV Bharat', url: 'https://www.etvbharat.com/en/!bharat/un-report-on-india-population-fertility-dropes-below-replacement-rate-enn25061002567' },
  labourCodes: { name: 'Lakshmikumaran & Sridharan', url: 'https://employmentlaw.lkslaw.com/what-changed-2025' },
  eci: { name: 'Election Commission of India', url: 'https://results.eci.gov.in/' },
} satisfies Record<string, SourceRef>

export interface RecordMeta {
  cadence: Cadence
  source: SourceRef
  releasedAt: ReleaseDate
  nextReleaseDue: string | null
}

export interface KpiRecord {
  id: KpiId
  value: number
  unit: Unit
  decimals: number
  period: Localized
  note: Localized | null
  meta: RecordMeta
}

const GDP_META: RecordMeta = {
  cadence: 'quarterly',
  source: CITATIONS.gdpQ1,
  releasedAt: { date: '2026-08-31', precision: 'day' },
  nextReleaseDue: '2026-11-30',
}
const CPI_META: RecordMeta = {
  cadence: 'monthly',
  source: CITATIONS.cpi,
  releasedAt: { date: '2026-09-01', precision: 'month' },
  nextReleaseDue: '2026-10-13',
}
const PLFS_META: RecordMeta = {
  cadence: 'monthly',
  source: CITATIONS.plfs,
  releasedAt: { date: '2026-09-01', precision: 'month' },
  nextReleaseDue: '2026-10-16',
}
const UPI_META: RecordMeta = {
  cadence: 'monthly',
  source: CITATIONS.upi,
  releasedAt: { date: '2026-10-01', precision: 'month' },
  nextReleaseDue: '2026-11-02',
}
export const POPULATION_META: RecordMeta = {
  cadence: 'annual',
  source: CITATIONS.population,
  releasedAt: { date: '2025-06-01', precision: 'month' },
  nextReleaseDue: null,
}

export const KPI_RECORDS: Record<KpiId, KpiRecord> = {
  gdp: {
    id: 'gdp',
    value: 7.8,
    unit: 'percent',
    decimals: 1,
    period: { en: 'Apr–Jun 2026 (Q1 FY27)', hi: 'अप्रैल–जून 2026 (Q1 FY27)' },
    note: { en: 'vs 6.9% a year earlier · first estimate', hi: 'एक साल पहले 6.9% · पहला अनुमान' },
    meta: GDP_META,
  },
  cpi: {
    id: 'cpi',
    value: 4.82,
    unit: 'percent',
    decimals: 2,
    period: { en: 'Aug 2026', hi: 'अगस्त 2026' },
    note: { en: 'Highest in 8 months · RBI target 4%', hi: '8 महीनों में सबसे ऊँची · आरबीआई लक्ष्य 4%' },
    meta: CPI_META,
  },
  repo: {
    id: 'repo',
    value: 5.5,
    unit: 'percent',
    decimals: 2,
    period: { en: 'Effective 7 Oct 2026', hi: '7 अक्टूबर 2026 से लागू' },
    note: { en: '+25 bp, first hike since 2023', hi: '+25 आधार अंक, 2023 के बाद पहली बढ़ोतरी' },
    meta: { cadence: 'policy', source: CITATIONS.rbi, releasedAt: { date: '2026-10-07', precision: 'day' }, nextReleaseDue: null },
  },
  unemployment: {
    id: 'unemployment',
    value: 5.0,
    unit: 'percent',
    decimals: 1,
    period: { en: 'Aug 2026 · age 15+', hi: 'अगस्त 2026 · 15+ आयु' },
    note: { en: 'Urban 6.8% · rural 4.1%', hi: 'शहरी 6.8% · ग्रामीण 4.1%' },
    meta: PLFS_META,
  },
  upi: {
    id: 'upi',
    value: 24.07,
    unit: 'billion-transactions',
    decimals: 2,
    period: { en: 'Sep 2026', hi: 'सितंबर 2026' },
    note: { en: '+23% y/y · ₹29.37 lakh crore', hi: 'सालाना +23% · ₹29.37 लाख करोड़' },
    meta: UPI_META,
  },
  population: {
    id: 'population',
    value: 1.46,
    unit: 'billion-people',
    decimals: 2,
    period: { en: '2025 · UN estimate', hi: '2025 · संयुक्त राष्ट्र अनुमान' },
    note: { en: 'Fertility 1.9, below replacement', hi: 'प्रजनन दर 1.9, प्रतिस्थापन स्तर से नीचे' },
    meta: POPULATION_META,
  },
  flfpr: {
    id: 'flfpr',
    value: 34.8,
    unit: 'percent',
    decimals: 1,
    period: { en: 'Aug 2026 · women 15+', hi: 'अगस्त 2026 · 15+ आयु की महिलाएँ' },
    note: { en: 'Up from 33.7% a year earlier', hi: 'एक साल पहले 33.7% से बढ़कर' },
    meta: PLFS_META,
  },
  wpi: {
    id: 'wpi',
    value: 9.92,
    unit: 'percent',
    decimals: 2,
    period: { en: 'Aug 2026', hi: 'अगस्त 2026' },
    note: { en: 'Food, fuel and manufactured goods', hi: 'खाद्य, ईंधन और विनिर्मित वस्तुएँ' },
    meta: {
      cadence: 'monthly',
      source: CITATIONS.wpi,
      releasedAt: { date: '2026-09-01', precision: 'month' },
      nextReleaseDue: '2026-10-15',
    },
  },
}

// ---------------------------------------------------------------------------
// Series

const q = (key: string, en: string, hi: string, value: number, note?: Localized): SeriesPoint => ({
  key,
  label: { en, hi },
  value,
  ...(note ? { note } : {}),
})

export const GDP_QUARTERLY: { rows: SeriesPoint[]; meta: RecordMeta } = {
  rows: [
    q('Q1 FY26', 'Apr–Jun 2025', 'अप्रैल–जून 2025', 6.9),
    q('Q2 FY26', 'Jul–Sep 2025', 'जुलाई–सितंबर 2025', 8.4),
    q('Q3 FY26', 'Oct–Dec 2025', 'अक्टूबर–दिसंबर 2025', 8.0, { en: 'Revised from 7.8', hi: '7.8 से संशोधित' }),
    q('Q4 FY26', 'Jan–Mar 2026', 'जनवरी–मार्च 2026', 8.6, { en: 'Revised from 7.8', hi: '7.8 से संशोधित' }),
    q('Q1 FY27', 'Apr–Jun 2026', 'अप्रैल–जून 2026', 7.8, { en: 'First estimate', hi: 'पहला अनुमान' }),
  ],
  meta: GDP_META,
}

export const GDP_ANNUAL: { rows: SeriesPoint[]; meta: RecordMeta } = {
  rows: [
    q('FY24', '2023–24', '2023–24', 7.2),
    q('FY25', '2024–25', '2024–25', 7.1),
    q('FY26', '2025–26', '2025–26', 7.7),
    { ...q('FY27', '2026–27', '2026–27', 7.1, { en: 'RBI projection', hi: 'आरबीआई का अनुमान' }), projected: true },
  ],
  meta: {
    cadence: 'annual',
    source: CITATIONS.gdpFy26,
    releasedAt: { date: '2026-05-01', precision: 'month' },
    nextReleaseDue: null,
  },
}

export const CPI_SERIES: { rows: SeriesPoint[]; meta: RecordMeta } = {
  rows: [
    q('2026-05', 'May 2026', 'मई 2026', 3.93),
    q('2026-06', 'Jun 2026', 'जून 2026', 4.38),
    q('2026-07', 'Jul 2026', 'जुलाई 2026', 4.45),
    q('2026-08', 'Aug 2026', 'अगस्त 2026', 4.82),
  ],
  meta: CPI_META,
}

export const UNEMPLOYMENT_SERIES: { rows: UnemploymentPoint[]; meta: RecordMeta } = {
  rows: [
    { key: '2026-06', label: { en: 'Jun 2026', hi: 'जून 2026' }, all: 5.5, urban: 6.6, rural: 5.0 },
    { key: '2026-07', label: { en: 'Jul 2026', hi: 'जुलाई 2026' }, all: 5.1, urban: 6.7, rural: 4.5 },
    { key: '2026-08', label: { en: 'Aug 2026', hi: 'अगस्त 2026' }, all: 5.0, urban: 6.8, rural: 4.1 },
  ],
  meta: PLFS_META,
}

export const UPI_SERIES: { rows: UpiPoint[]; meta: RecordMeta } = {
  rows: [
    { key: '2026-07', label: { en: 'Jul 2026', hi: 'जुलाई 2026' }, volume: 23.66, value: 29.88 },
    { key: '2026-08', label: { en: 'Aug 2026', hi: 'अगस्त 2026' }, volume: 24.51, value: 29.82 },
    { key: '2026-09', label: { en: 'Sep 2026', hi: 'सितंबर 2026' }, volume: 24.07, value: 29.37 },
  ],
  meta: UPI_META,
}

/** Baseline age structure (UNFPA 2025); replaced by World Bank shares when available. */
export const AGE_STRUCTURE_BASELINE: SeriesPoint[] = [
  q('0-14', '0–14 years', '0–14 वर्ष', 24),
  q('15-64', '15–64 years', '15–64 वर्ष', 68),
  q('65+', '65+ years', '65+ वर्ष', 7),
]

export const FERTILITY_BASELINE: SeriesPoint[] = [q('2025', '2025', '2025', 1.9)]
