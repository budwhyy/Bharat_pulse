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
  /** Added by the discovery scanner rather than the fixed registry. */
  discovered?: boolean
  publisherId?: string
  discoveredAt?: string
}

export interface IndicatorSource extends BaseSource {
  type: 'indicator'
  adapter: 'rbi-rates' | 'world-bank' | 'fbil-rates' | 'ndma-sachet' | 'cpcb-aqi'
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
    id: 'rbi-notifications',
    type: 'news',
    kind: 'official',
    lang: 'en',
    name: { en: 'RBI notifications', hi: 'आरबीआई अधिसूचनाएँ' },
    homepage: 'https://www.rbi.org.in/',
    url: 'https://www.rbi.org.in/notifications_rss.xml',
    refreshMinutes: NEWS_REFRESH_MINUTES,
    defaultCategory: 'policy',
    defaultOffset: '+0530',
  },
  {
    id: 'sebi',
    type: 'news',
    kind: 'official',
    lang: 'en',
    name: { en: 'SEBI', hi: 'सेबी' },
    homepage: 'https://www.sebi.gov.in/',
    url: 'https://www.sebi.gov.in/sebirss.xml',
    refreshMinutes: NEWS_REFRESH_MINUTES,
    defaultCategory: 'economy',
    defaultOffset: '+0530',
  },
  {
    id: 'indian-express',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'The Indian Express', hi: 'द इंडियन एक्सप्रेस' },
    homepage: 'https://indianexpress.com/section/india/',
    url: 'https://indianexpress.com/section/india/feed/',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'times-of-india',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'The Times of India', hi: 'द टाइम्स ऑफ़ इंडिया' },
    homepage: 'https://timesofindia.indiatimes.com/india',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'ndtv',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'NDTV', hi: 'एनडीटीवी' },
    homepage: 'https://www.ndtv.com/india',
    url: 'https://feeds.feedburner.com/ndtvnews-india-news',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'et-politics',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'The Economic Times', hi: 'द इकनॉमिक टाइम्स' },
    homepage: 'https://economictimes.indiatimes.com/news/politics-and-nation',
    url: 'https://economictimes.indiatimes.com/news/politics-and-nation/rssfeeds/1052732854.cms',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'business-standard',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'Business Standard', hi: 'बिज़नेस स्टैंडर्ड' },
    homepage: 'https://www.business-standard.com/economy',
    url: 'https://www.business-standard.com/rss/economy-102.rss',
    refreshMinutes: NEWS_REFRESH_MINUTES,
    defaultCategory: 'economy',
  },
  {
    id: 'scroll',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'Scroll', hi: 'स्क्रॉल' },
    homepage: 'https://scroll.in/',
    url: 'https://feeds.feedburner.com/ScrollinArticles.rss',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'news18',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'News18', hi: 'न्यूज़18' },
    homepage: 'https://www.news18.com/india/',
    url: 'https://www.news18.com/commonfeeds/v1/eng/rss/india.xml',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'firstpost',
    type: 'news',
    kind: 'reported',
    lang: 'en',
    name: { en: 'Firstpost', hi: 'फ़र्स्टपोस्ट' },
    homepage: 'https://www.firstpost.com/india/',
    url: 'https://www.firstpost.com/commonfeeds/v1/mfp/rss/india.xml',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'dainik-bhaskar',
    type: 'news',
    kind: 'reported',
    lang: 'hi',
    name: { en: 'Dainik Bhaskar', hi: 'दैनिक भास्कर' },
    homepage: 'https://www.bhaskar.com/national/',
    url: 'https://www.bhaskar.com/rss-v1--category-1061.xml',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'ndtv-india',
    type: 'news',
    kind: 'reported',
    lang: 'hi',
    name: { en: 'NDTV India', hi: 'एनडीटीवी इंडिया' },
    homepage: 'https://ndtv.in/',
    url: 'https://feeds.feedburner.com/ndtvkhabar-india',
    refreshMinutes: NEWS_REFRESH_MINUTES,
  },
  {
    id: 'zee-news-hindi',
    type: 'news',
    kind: 'reported',
    lang: 'hi',
    name: { en: 'Zee News Hindi', hi: 'ज़ी न्यूज़' },
    homepage: 'https://zeenews.india.com/hindi/india',
    url: 'https://zeenews.india.com/hindi/india.xml',
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

/** Hosts the server may contact, including redirect targets and discovery seeds. */
export const ALLOWED_HOSTS = [
  'fbil.org.in',
  'sachet.ndma.gov.in',
  'api.data.gov.in',
  'pib.gov.in',
  'rbi.org.in',
  'sebi.gov.in',
  'thehindu.com',
  'hindustantimes.com',
  'indianexpress.com',
  'indiatimes.com',
  'ndtv.com',
  'ndtv.in',
  'feedburner.com',
  'business-standard.com',
  'scroll.in',
  'news18.com',
  'firstpost.com',
  'bbci.co.uk',
  'livemint.com',
  'amarujala.com',
  'livehindustan.com',
  'bhaskar.com',
  'aajtak.in',
  'india.com',
  'worldbank.org',
]

export const PULSE_SOURCES: IndicatorSource[] = [
  { id: 'fbil-rates', type: 'indicator', adapter: 'fbil-rates', kind: 'official', lang: 'en', name: { en: 'FBIL reference rate', hi: 'एफबीआईएल संदर्भ दर' }, homepage: 'https://www.fbil.org.in/', url: 'https://www.fbil.org.in/wasdm/refrates/fetchfiltered', refreshMinutes: 24 * 60 },
  { id: 'ndma-sachet', type: 'indicator', adapter: 'ndma-sachet', kind: 'official', lang: 'en', name: { en: 'NDMA SACHET alerts', hi: 'एनडीएमए सचेत चेतावनियाँ' }, homepage: 'https://sachet.ndma.gov.in/', url: 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml', refreshMinutes: 15 },
  { id: 'cpcb-aqi', type: 'indicator', adapter: 'cpcb-aqi', kind: 'official', lang: 'en', name: { en: 'CPCB air quality', hi: 'सीपीसीबी वायु गुणवत्ता' }, homepage: 'https://www.data.gov.in/resource/real-time-air-quality-index-various-locations', url: 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69', refreshMinutes: 60 },
]

/** Called on the server only. Keys never enter source definitions or snapshots. */
export function configuredSources(aqiEnabled: boolean): SourceDef[] {
  return [...SOURCES, ...PULSE_SOURCES.filter((s) => s.adapter !== 'cpcb-aqi' || aqiEnabled)]
}
