import { aqiBand, BREAKPOINTS, stationAqi, type Pollutant } from '../../domain/aqi'
import { tagStates } from '../../domain/states'
import type { AlertView, AqiCity } from '../../domain/types'
import { parseFeed } from './rss'

export interface FxRow { date: string; value: number; displayTime: string | null }
export function fbilUrl(now: Date): string {
  const date = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  return `https://www.fbil.org.in/wasdm/refrates/fetchfiltered?fromDate=${date(new Date(now.getTime() - 45 * 86400_000))}&toDate=${date(now)}&authenticated=false`
}
export function parseFbil(text: string, now: Date): FxRow[] {
  const rows: unknown = JSON.parse(text)
  if (!Array.isArray(rows)) throw new Error('Invalid FBIL response')
  const byDate = new Map<string, FxRow>()
  for (const row of rows) {
    if (row?.subProdName !== 'INR / 1 USD') continue
    const date = typeof row.processRunDate === 'string' ? row.processRunDate.slice(0, 10) : ''
    const value = Number(row.rate)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || Date.parse(date) > now.getTime() || !Number.isFinite(value) || value <= 0) continue
    byDate.set(date, { date, value, displayTime: typeof row.displayTime === 'string' ? row.displayTime : null })
  }
  const result = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  if (!result.length) throw new Error('FBIL returned no USD reference rates')
  return result
}

const SEVERE = /very heavy|extremely heavy|cyclon|tsunami|earthquake|flood|landslide|cloudburst|heat\s*wave|cold\s*wave|dense fog|hail|severe|(?:red|orange)\s*alert|अति.*भारी|बहुत भारी|अत्यधिक.*वर्षा|चक्रवात|सुनामी|भूकंप|बाढ़|भूस्खलन|बादल फट|लू(?:\s|$)|शीत\s*लहर|घना कोहरा|ओलावृष्टि|गंभीर|(?:रेड|ऑरेंज|लाल|नारंगी)\s*(?:अलर्ट|चेतावनी)/i
export function parseSachet(xml: string, now: Date): AlertView[] {
  const items = parseFeed(xml)
  const alerts = new Map<string, AlertView>()
  for (const item of items) {
    const at = Date.parse(item.pubDate ?? '')
    if (!SEVERE.test(item.title) || !Number.isFinite(at) || at > now.getTime() || now.getTime() - at > 48 * 3600_000) continue
    let url: URL
    try { url = new URL(item.link) } catch { continue }
    if (!['https:', 'http:'].includes(url.protocol)) continue
    const id = item.guid ?? item.link
    alerts.set(id, { id, title: item.title, category: item.category ?? '', authority: item.author ?? 'NDMA SACHET', at: new Date(at).toISOString(), states: tagStates(item.title, item.author), url: url.href })
  }
  return [...alerts.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60)
}

export const AQI_CITIES = ['Delhi', 'Mumbai', 'Kolkata', 'Bengaluru'] as const
export const CPCB_RESOURCE = 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69'
export function cpcbUrl(key: string, city: string, offset = 0): string {
  const url = new URL(CPCB_RESOURCE)
  url.search = new URLSearchParams({ 'api-key': key, format: 'json', limit: '500', offset: String(offset), 'filters[city]': city }).toString()
  return url.href
}

export function parseIstStamp(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const [, day, month, year, hour, minute, second] = match
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  const local = new Date(ms + 330 * 60_000).toISOString()
  if (local.slice(0, 19) !== iso.slice(0, 19)) return null
  return new Date(ms).toISOString()
}

/** The resource supplies pollutant averages. City values are derived station means,
 * not an official city bulletin. Never combine different observation times.
 */
export function parseCpcb(text: string, city: string, now: Date): AqiCity {
  const body = JSON.parse(text)
  if (!Array.isArray(body.records)) throw new Error('Invalid CPCB response')
  if (Number(body.total) > body.records.length) throw new Error('Incomplete CPCB response')
  const stations = new Map<string, { at: string; values: Partial<Record<Pollutant, number>> }>()
  for (const row of body.records) {
    if (row.city !== city || typeof row.station !== 'string') continue
    const at = parseIstStamp(row.last_update)
    if (!at || Date.parse(at) > now.getTime() || now.getTime() - Date.parse(at) > 24 * 3600_000) continue
    const pollutant = String(row.pollutant_id).toUpperCase().replace('O3', 'OZONE') as Pollutant
    if (!(pollutant in BREAKPOINTS) || row.pollutant_avg == null || String(row.pollutant_avg).trim() === '') continue
    const value = Number(row.pollutant_avg)
    if (!Number.isFinite(value) || value < 0) continue
    const key = `${row.station}|${at}`
    const station = stations.get(key) ?? { at, values: {} }
    station.values[pollutant] = value
    stations.set(key, station)
  }
  const latest = new Map<string, { at: string; aqi: number }>()
  for (const [key, station] of stations) {
    const aqi = stationAqi(station.values)
    const name = key.split('|')[0]!
    if (aqi !== null && (!latest.has(name) || station.at > latest.get(name)!.at)) latest.set(name, { at: station.at, aqi })
  }
  const valid = [...latest.values()]
  if (!valid.length) throw new Error(`No valid station observations for ${city}`)
  const aqi = Math.round(valid.reduce((sum, s) => sum + s.aqi, 0) / valid.length)
  return { city, aqi, band: aqiBand(aqi), stations: valid.length, at: valid.map((s) => s.at).sort()[0]! }
}
