import { describe, expect, it } from 'vitest'
import { SUMMARY_MAX } from '../../domain/text'
import type { NewsSource } from '../sources'
import { assertFeedLanguage, normalizeFeedItems } from './news'
import { parsePibRelease } from './pib'
import { parseRbiRates } from './rbi'
import { parseFeed } from './rss'
import { parseWorldBank } from './worldbank'

const NOW = new Date('2026-10-11T06:00:00Z')

const source = (over: Partial<NewsSource> = {}): NewsSource => ({
  id: 'test-feed',
  type: 'news',
  kind: 'reported',
  lang: 'en',
  name: { en: 'Test', hi: 'टेस्ट' },
  homepage: 'https://example.thehindu.com/',
  url: 'https://example.thehindu.com/feed',
  refreshMinutes: 10,
  ...over,
})

const LONG = 'The committee met for a second day. '.repeat(30)

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>Feed</title>
  <item>
    <title><![CDATA[RBI raises repo rate by 25 bps &amp; signals more]]></title>
    <link>https://www.example.com/economy/rbi-raises-repo/?utm_source=rss</link>
    <guid isPermaLink="false">article-1</guid>
    <pubDate>Sun, 11 Oct 2026 10:30:00 +0530</pubDate>
    <description><![CDATA[<p>The <b>Monetary Policy Committee</b> voted&nbsp;5–1.</p>]]></description>
    <content:encoded><![CDATA[<p>FULL ARTICLE TEXT THAT MUST NEVER BE USED</p>]]></content:encoded>
  </item>
  <item>
    <title>Flood alert issued for Assam districts</title>
    <link>https://www.example.com/india/flood-alert</link>
    <pubDate>Sun, 11 Oct 2026 23:59:00 +0530</pubDate>
    <description>${LONG}</description>
  </item>
  <item>
    <title>   </title>
    <link>https://www.example.com/india/untitled</link>
  </item>
  <item>
    <title>No link here</title>
  </item>
</channel></rss>`

describe('parseFeed + normalizeFeedItems', () => {
  it('normalizes titles, strips markup from teasers and ignores full-content fields', () => {
    const items = normalizeFeedItems(parseFeed(RSS), source(), NOW)
    expect(items).toHaveLength(2)
    const [rbi] = items
    expect(rbi!.title).toBe('RBI raises repo rate by 25 bps & signals more')
    expect(rbi!.summary).toBe('The Monetary Policy Committee voted 5–1.')
    expect(JSON.stringify(items)).not.toContain('FULL ARTICLE')
    expect(rbi!.publishedAt).toBe('2026-10-11T05:00:00.000Z')
    expect(rbi!.category).toBe('economy')
    expect(rbi!.keys).toContain('url:https://example.com/economy/rbi-raises-repo')
    expect(rbi!.keys).toContain('guid:test-feed:article-1')
  })

  it('clamps long teasers and rejects future publish times', () => {
    const [, flood] = normalizeFeedItems(parseFeed(RSS), source(), NOW)
    expect(flood!.summary!.length).toBeLessThanOrEqual(SUMMARY_MAX + 1)
    expect(flood!.summary!.endsWith('…')).toBe(true)
    // 23:59 IST is ~12h after NOW: implausible, so no publisher time is kept.
    expect(flood!.publishedAt).toBeNull()
    expect(flood!.category).toBe('risk')
  })

  it('reads zone-less dates in the source offset (RBI publishes IST)', () => {
    const xml = `<rss><channel><item><title>Press release</title><link>https://www.rbi.org.in/a?prid=1</link>
      <pubDate>Sat, 10 Oct 2026 01:25:00</pubDate></item></channel></rss>`
    const [item] = normalizeFeedItems(parseFeed(xml), source({ defaultOffset: '+0530' }), NOW)
    expect(item!.publishedAt).toBe('2026-10-09T19:55:00.000Z')
  })

  it('handles Hindi feeds and drops teasers that only repeat the headline', () => {
    const xml = `<rss><channel><item>
      <title>संसद में विधेयक पेश</title>
      <link>https://www.example.com/hi/1</link>
      <description>   संसद में विधेयक पेश   </description>
    </item></channel></rss>`
    const [item] = normalizeFeedItems(parseFeed(xml), source({ lang: 'hi' }), NOW)
    expect(item!.lang).toBe('hi')
    expect(item!.summary).toBeNull()
    expect(item!.publishedAt).toBeNull()
    expect(['politics', 'policy']).toContain(item!.category)
  })

  it('orders PIB items by release id because the feed has no dates', () => {
    const xml = `<rss><channel>
      <item><title>Release A</title><link>https://pib.gov.in/PressReleaseIframePage.aspx?PRID=2321826</link></item>
      <item><title>Release B</title><link>https://pib.gov.in/PressReleaseIframePage.aspx?PRID=2321854</link></item>
    </channel></rss>`
    const items = normalizeFeedItems(parseFeed(xml), source({ pib: true, kind: 'official', defaultCategory: 'policy' }), NOW)
    expect(items.map((i) => i.seq)).toEqual([2321826, 2321854])
    expect(items[0]!.keys[0]).toBe('url:pib:2321826')
    expect(items[0]!.kind).toBe('official')
    expect(items[0]!.category).toBe('policy')
  })

  it('parses Atom feeds', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom item</title>
      <link rel="alternate" href="https://example.com/atom/1"/><id>tag:1</id>
      <updated>2026-10-11T04:00:00Z</updated><summary>Short summary</summary></entry></feed>`
    const [item] = normalizeFeedItems(parseFeed(xml), source(), NOW)
    expect(item!.url).toBe('https://example.com/atom/1')
    expect(item!.publishedAt).toBe('2026-10-11T04:00:00.000Z')
  })

  it('rejects a feed that serves the wrong language', () => {
    const hindi = [{ title: 'संसद में विधेयक पेश' }, { title: 'आरबीआई ने रेपो दर बढ़ाई' }, { title: 'UPI update' }]
    expect(() => assertFeedLanguage(hindi, 'en')).toThrow(/expected English/)
    expect(() => assertFeedLanguage(hindi, 'hi')).not.toThrow()
    expect(() => assertFeedLanguage([{ title: 'Budget session begins' }], 'hi')).toThrow()
  })

  it('throws on documents that are not feeds', () => {
    expect(() => parseFeed('<html><body>Access denied</body></html>')).toThrow()
  })
})

describe('official indicator adapters', () => {
  it('reads the PIB release time and official summary', () => {
    const html = `<div id="PrDateTime" class="ReleaseDateSubHeaddateTime"> Posted On: 10 OCT 2026 11:08PM by PIB Delhi </div>
      <meta property="og:description" content="The delegation, led by IIM Sambalpur, met the President." />`
    const release = parsePibRelease(html, 'Delegation meets the President', NOW)
    expect(release.publishedAt).toBe('2026-10-10T17:38:00.000Z')
    expect(release.summary).toBe('The delegation, led by IIM Sambalpur, met the President.')
  })

  it('reads RBI policy rates and fails loudly when the box is missing', () => {
    const html = `<table><tr><th> Policy Repo Rate </th><td> : 5.50% </td></tr>
      <tr><th> Standing Deposit Facility Rate </th><td> : 5.25% </td></tr>
      <tr><th> Marginal Standing Facility Rate </th><td> : 5.75% </td></tr></table>`
    expect(parseRbiRates(html)).toEqual({ repo: 5.5, sdf: 5.25, msf: 5.75 })
    expect(() => parseRbiRates('<html>maintenance</html>')).toThrow(/repo/i)
  })

  it('parses World Bank series ascending and skips empty years', () => {
    const json = JSON.stringify([
      { page: 1, lastupdated: '2026-10-08' },
      [
        { date: '2025', value: 1463865525 },
        { date: '2026', value: null },
        { date: '2024', value: 1450935791 },
      ],
    ])
    expect(parseWorldBank(json)).toEqual({
      lastUpdated: '2026-10-08',
      points: [
        { year: '2024', value: 1450935791 },
        { year: '2025', value: 1463865525 },
      ],
    })
    expect(() => parseWorldBank(JSON.stringify([{ message: [{ value: 'Invalid' }] }]))).toThrow(/Invalid/)
  })
})
