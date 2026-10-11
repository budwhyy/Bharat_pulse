import { describe, expect, it } from 'vitest'
import { cpcbUrl, fbilUrl, parseCpcb, parseFbil, parseIstStamp, parseSachet } from './indicators'

const NOW = new Date('2026-10-11T06:00:00Z')
const fbil = (date: string, rate: unknown, pair = 'INR / 1 USD') => ({ processRunDate: `${date} 00:00:00`, subProdName: pair, displayTime: `${date} 13:00:00`, rate })
const rss = (titles: string[]) => `<rss><channel>${titles.map((title, i) => `<item><title>${title}</title><link>https://sachet.ndma.gov.in/${i}</link><guid>${i}</guid><pubDate>Sun, 11 Oct 2026 05:00:00 GMT</pubDate><author>IMD Chennai</author><category>Met</category></item>`).join('')}</channel></rss>`
const station = (name: string, pm: unknown, at = '11-10-2026 11:00:00') => ['PM10', 'NO2', 'SO2'].map((pollutant_id, i) => ({ station: name, city: 'Delhi', last_update: at, pollutant_id, pollutant_avg: i ? '40' : pm }))

describe('FBIL reference parser', () => {
  it('uses ISO dates in IST and filters, orders and deduplicates business days', () => {
    const url = new URL(fbilUrl(new Date('2026-10-10T20:00:00Z')))
    expect(url.searchParams.get('toDate')).toBe('2026-10-11')
    expect(url.searchParams.get('fromDate')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const rows = parseFbil(JSON.stringify([fbil('2026-10-09', 92), fbil('2026-10-08', 91), fbil('2026-10-09', 92), fbil('2026-10-09', 88, 'INR / 1 EUR'), fbil('2026-10-12', 93), fbil('bad', 94), fbil('2026-10-10', null)]), NOW)
    expect(rows.map((r) => [r.date, r.value])).toEqual([['2026-10-08', 91], ['2026-10-09', 92]])
  })
  it('fails closed on malformed and empty payloads', () => {
    expect(() => parseFbil('{}', NOW)).toThrow()
    expect(() => parseFbil('[]', NOW)).toThrow()
  })
})
describe('SACHET parser', () => {
  it('keeps severe EN/HI alerts, not routine nowcasts; tags authority locations', () => {
    const rows = parseSachet(rss(['Light to moderate rain at isolated places', 'Very heavy rain at isolated places in Kerala', 'उत्तर प्रदेश में बाढ़ की चेतावनी', 'Orange alert in Delhi', 'Thunderstorm and light rain']), NOW)
    expect(rows).toHaveLength(3)
    expect(rows.find((a) => a.title.includes('Kerala'))?.states).toEqual(expect.arrayContaining(['KL', 'TN']))
    expect(rows.some((a) => a.states.includes('UP'))).toBe(true)
  })
  it('drops expired, future and unsafe-link alerts, allows empty official feeds', () => {
    expect(parseSachet(rss(['Severe flood']).replace('11 Oct 2026', '08 Oct 2026'), NOW)).toEqual([])
    expect(parseSachet(rss(['Severe flood']).replace('11 Oct 2026', '12 Oct 2026'), NOW)).toEqual([])
    expect(parseSachet(rss(['Severe flood']).replace('https://sachet.ndma.gov.in/0', 'javascript:alert(1)'), NOW)).toEqual([])
    expect(parseSachet('<rss><channel/></rss>', NOW)).toEqual([])
    expect(() => parseSachet('<html>error</html>', NOW)).toThrow()
  })
})
describe('CPCB fixture parser', () => {
  it('parses timestamps explicitly in IST and rejects invalid calendar dates', () => {
    expect(parseIstStamp('11-10-2026 11:00:00')).toBe('2026-10-11T05:30:00.000Z')
    expect(parseIstStamp('31-02-2026 11:00:00')).toBeNull()
  })
  it('averages valid stations without mixing observation times or duplicate pollutants', () => {
    const rows = [...station('A', 50), ...station('B', 100), ...station('Missing', 'NA'), ...station('Old', 400, '08-10-2026 11:00:00'), ...station('Future', 500, '12-10-2026 11:00:00')]
    expect(parseCpcb(JSON.stringify({ records: rows }), 'Delhi', NOW)).toMatchObject({ city: 'Delhi', aqi: 75, band: 'satisfactory', stations: 2, at: '2026-10-11T05:30:00.000Z' })
    const mixed = station('Mixed', 50)
    mixed[0]!.last_update = '11-10-2026 10:00:00'
    expect(() => parseCpcb(JSON.stringify({ records: mixed }), 'Delhi', NOW)).toThrow()
  })
  it('rejects truncated responses and keeps credentials in the request only', () => {
    expect(() => parseCpcb(JSON.stringify({ total: 1000, records: station('A', 50) }), 'Delhi', NOW)).toThrow('Incomplete')
    const url = new URL(cpcbUrl('test key', 'Delhi'))
    expect(url.searchParams.get('api-key')).toBe('test key')
    expect(url.searchParams.get('filters[city]')).toBe('Delhi')
  })
})
