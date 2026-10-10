import type { Category, Lang, Localized, UpdateKind } from '../domain/types'

/** A host a publisher's feeds may live on; `pathPrefix` narrows shared hosts like FeedBurner. */
export interface HostRule {
  host: string
  pathPrefix?: string
}

/**
 * A vetted publisher the discovery scanner may explore. Discovery never leaves
 * this list: it only finds new *feeds* from these publishers, never new
 * publishers, so everything shown still comes from a reviewed outlet.
 */
export interface Publisher {
  id: string
  name: Localized
  lang: Lang
  kind: UpdateKind
  hosts: HostRule[]
  /** Pages to start crawling from: RSS directories, homepages. */
  seeds: string[]
  defaultCategory?: Category
  defaultOffset?: string
}

export const PUBLISHERS: Publisher[] = [
  { id: 'the-hindu', lang: 'en', kind: 'reported', name: { en: 'The Hindu', hi: 'द हिंदू' }, hosts: [{ host: 'thehindu.com' }], seeds: ['https://www.thehindu.com/rssfeeds/'] },
  { id: 'hindustan-times', lang: 'en', kind: 'reported', name: { en: 'Hindustan Times', hi: 'हिंदुस्तान टाइम्स' }, hosts: [{ host: 'hindustantimes.com' }], seeds: ['https://www.hindustantimes.com/rss'] },
  { id: 'indian-express', lang: 'en', kind: 'reported', name: { en: 'The Indian Express', hi: 'द इंडियन एक्सप्रेस' }, hosts: [{ host: 'indianexpress.com' }], seeds: ['https://indianexpress.com/rss/'] },
  { id: 'times-of-india', lang: 'en', kind: 'reported', name: { en: 'The Times of India', hi: 'द टाइम्स ऑफ़ इंडिया' }, hosts: [{ host: 'timesofindia.indiatimes.com' }], seeds: ['https://timesofindia.indiatimes.com/rss.cms'] },
  { id: 'economic-times', lang: 'en', kind: 'reported', name: { en: 'The Economic Times', hi: 'द इकनॉमिक टाइम्स' }, hosts: [{ host: 'economictimes.indiatimes.com' }], seeds: ['https://economictimes.indiatimes.com/rss.cms'], defaultCategory: 'economy' },
  { id: 'mint', lang: 'en', kind: 'reported', name: { en: 'Mint', hi: 'मिंट' }, hosts: [{ host: 'livemint.com' }], seeds: ['https://www.livemint.com/rss'], defaultCategory: 'economy' },
  { id: 'business-standard', lang: 'en', kind: 'reported', name: { en: 'Business Standard', hi: 'बिज़नेस स्टैंडर्ड' }, hosts: [{ host: 'business-standard.com' }], seeds: ['https://www.business-standard.com/rss-feeds/listing'], defaultCategory: 'economy' },
  { id: 'news18', lang: 'en', kind: 'reported', name: { en: 'News18', hi: 'न्यूज़18' }, hosts: [{ host: 'news18.com' }], seeds: ['https://www.news18.com/rss/'] },
  { id: 'firstpost', lang: 'en', kind: 'reported', name: { en: 'Firstpost', hi: 'फ़र्स्टपोस्ट' }, hosts: [{ host: 'firstpost.com' }], seeds: ['https://www.firstpost.com/rss/'] },
  { id: 'ndtv', lang: 'en', kind: 'reported', name: { en: 'NDTV', hi: 'एनडीटीवी' }, hosts: [{ host: 'ndtv.com' }, { host: 'feeds.feedburner.com', pathPrefix: '/ndtvnews' }], seeds: ['https://www.ndtv.com/rss'] },
  { id: 'scroll', lang: 'en', kind: 'reported', name: { en: 'Scroll', hi: 'स्क्रॉल' }, hosts: [{ host: 'scroll.in' }, { host: 'feeds.feedburner.com', pathPrefix: '/Scrollin' }], seeds: ['https://scroll.in/'] },
  { id: 'amar-ujala', lang: 'hi', kind: 'reported', name: { en: 'Amar Ujala', hi: 'अमर उजाला' }, hosts: [{ host: 'amarujala.com' }], seeds: ['https://www.amarujala.com/rss'] },
  { id: 'live-hindustan', lang: 'hi', kind: 'reported', name: { en: 'Live Hindustan', hi: 'लाइव हिन्दुस्तान' }, hosts: [{ host: 'livehindustan.com' }], seeds: ['https://www.livehindustan.com/rss'] },
  { id: 'dainik-bhaskar', lang: 'hi', kind: 'reported', name: { en: 'Dainik Bhaskar', hi: 'दैनिक भास्कर' }, hosts: [{ host: 'bhaskar.com' }], seeds: ['https://www.bhaskar.com/rss'] },
  { id: 'aaj-tak', lang: 'hi', kind: 'reported', name: { en: 'Aaj Tak', hi: 'आज तक' }, hosts: [{ host: 'aajtak.in' }], seeds: ['https://www.aajtak.in/rss'] },
  { id: 'ndtv-india', lang: 'hi', kind: 'reported', name: { en: 'NDTV India', hi: 'एनडीटीवी इंडिया' }, hosts: [{ host: 'ndtv.in' }, { host: 'feeds.feedburner.com', pathPrefix: '/ndtvkhabar' }], seeds: ['https://www.ndtv.com/rss'] },
  { id: 'rbi', lang: 'en', kind: 'official', name: { en: 'Reserve Bank of India', hi: 'भारतीय रिज़र्व बैंक' }, hosts: [{ host: 'rbi.org.in' }], seeds: ['https://www.rbi.org.in/Scripts/rss.aspx'], defaultCategory: 'economy', defaultOffset: '+0530' },
  { id: 'sebi', lang: 'en', kind: 'official', name: { en: 'SEBI', hi: 'सेबी' }, hosts: [{ host: 'sebi.gov.in' }], seeds: ['https://www.sebi.gov.in/rss.html'], defaultCategory: 'economy', defaultOffset: '+0530' },
]

export function matchesPublisher(raw: string, publisher: Publisher): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  const host = url.hostname.toLowerCase()
  return publisher.hosts.some(
    (rule) =>
      (host === rule.host || host.endsWith(`.${rule.host}`)) &&
      (!rule.pathPrefix || url.pathname.startsWith(rule.pathPrefix)),
  )
}
