import type { Category, Lang, Localized, UpdateKind } from '../domain/types'

interface BaseSource {
  id: string
  name: Localized
  homepage: string
  lang: Lang
  kind: UpdateKind
  /** How often the server re-checks this source. */
  refreshMinutes: number
}

export interface NewsSource extends BaseSource {
  type: 'news'
  url: string
  defaultCategory?: Category
  /** Offset applied to feed dates that carry no zone (e.g. RBI's IST stamps). */
  defaultOffset?: string
  /**
   * PIB: the feed carries no dates, so release pages are read for "Posted On".
   * Its English feed needs `reg=3`; without it PIB silently serves Hindi.
   */
  pib?: boolean
  /** Needs a session cookie carried across redirects. */
  cookies?: boolean
}

export interface IndicatorSource extends BaseSource {
  type: 'indicator'
  adapter: 'rbi-rates' | 'world-bank'
  url: string
}

export type SourceDef = NewsSource | IndicatorSource

export const NEWS_REFRESH_MINUTES = 10

/**
 * Initial source mix. Reported feeds are headline/teaser feeds; items always
 * link back to the publisher and only a clamped teaser is kept.
 */
export const SOURCES: SourceDef[] = [
  {
    id: 'pib-en',
    type: 'news',
    kind: 'official',
    lang: 'en',
    name: { en: 'PIB', hi: 'पीआईबी' },
    homepage: 'https://pib.gov.in/',
    url: 'https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3&reg=3',
    refreshMinutes: NEWS_REFRESH_MINUTES,
    defaultCategory: 'policy',
    pib: true,
    cookies: true,
  },
  {
    id: 'pib-hi',
    type: 'news',
    kind: 'official',
    lang: 'hi',
    name: { en: 'PIB Hindi', hi: 'पीआईबी' },
    homepage: 'https://pib.gov.in/',
    url: 'https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=2&Regid=3&reg=3',
    refreshMinutes: NEWS_REFRESH_MINUTES,
    defaultCategory: 'policy',
    pib: true,
    cookies: true,
  },
  {
    id: 'rbi-press',
    type: 'news',
    kind: 'official',
    lang: 'en',
    name: { en: 'Reserve Bank of India', hi: 'भारतीय रिज़र्व बैंक' },
    homepage: 'https://www.rbi.org.in/',
    url: 'https://www.rbi.org.in/pressreleases_rss.xml',
    refreshMinutes: NEWS_REFRESH_MINUTES,
    defaultCategory: 'economy',
    defaultOffset: '+0530',
  },
  {
    id: 'the-hindu',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'The Hindu', hi: 'द हिंदू' },
    homepage: 'https://www.thehindu.com/',
    url: 'https://www.thehindu.com/news/national/feeder/default.rss',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'hindustan-times',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'Hindustan Times', hi: 'हिंदुस्तान टाइम्स' },
    homepage: 'https://www.hindustantimes.com/',
    url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'bbc-india',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'BBC News', hi: 'बीबीसी न्यूज़' },
    homepage: 'https://www.bbc.com/news/world/asia/india',
    url: 'https://feeds.bbci.co.uk/news/world/asia/india/rss.xml',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'mint-economy',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'Mint', hi: 'मिंट' },
    homepage: 'https://www.livemint.com/economy',
    url: 'https://www.livemint.com/rss/economy',
    refreshMinutes: NEWS_REFRESH_MINUTES,
    defaultCategory: 'economy',
  },
  {
    id: 'bbc-hindi',
    type: 'news',
    kind: 'reported',
    lang: 'hi',
    name: { en: 'BBC Hindi', hi: 'बीबीसी हिंदी' },
    homepage: 'https://www.bbc.com/hindi',
    url: 'https://feeds.bbci.co.uk/hindi/rss.xml',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'amar-ujala',
    type: 'news',
    kind: 'reported',
    lang: 'hi',
    name: { en: 'Amar Ujala', hi: 'अमर उजाला' },
    homepage: 'https://www.amarujala.com/india-news',
    url: 'https://www.amarujala.com/rss/india-news.xml',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'live-hindustan',
    type: 'news',
    kind: 'reported',
    lang: 'hi',
    name: { en: 'Live Hindustan', hi: 'लाइव हिन्दुस्तान' },
    homepage: 'https://www.livehindustan.com/national',
    url: 'https://api.livehindustan.com/feeds/rss/national/rssfeed.xml',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'rbi-rates',
    type: 'indicator',
    adapter: 'rbi-rates',
    kind: 'official',
    lang: 'en',
    name: { en: 'RBI policy rates', hi: 'आरबीआई नीतिगत दरें' },
    homepage: 'https://www.rbi.org.in/',
    url: 'https://www.rbi.org.in/',
    // Rates change a handful of times a year; four checks a day is plenty.
    refreshMinutes: 6 * 60,
  },
  {
    id: 'world-bank',
    type: 'indicator',
    adapter: 'world-bank',
    kind: 'official',
    lang: 'en',
    name: { en: 'World Bank WDI', hi: 'विश्व बैंक डब्ल्यूडीआई' },
    homepage: 'https://data.worldbank.org/country/india',
    url: 'https://api.worldbank.org/v2/country/IND/indicator/',
    refreshMinutes: 24 * 60,
  },
]

/** Hosts the server may contact, including redirect targets. */
export const ALLOWED_HOSTS = [
  'pib.gov.in',
  'rbi.org.in',
  'thehindu.com',
  'hindustantimes.com',
  'bbci.co.uk',
  'livemint.com',
  'amarujala.com',
  'livehindustan.com',
  'worldbank.org',
]
