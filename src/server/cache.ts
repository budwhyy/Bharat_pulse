import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AlertView, AqiCity, SourceState, UpdateRecord } from '../domain/types'
import type { FxRow } from './adapters/indicators'
import type { WbSeries, WbSeriesKey } from './adapters/worldbank'
import type { NewsSource } from './sources'

export interface RbiObservation {
  repo: number
  sdf: number | null
  msf: number | null
  checkedAt: string
  /** When the current repo value was first seen by this server. */
  firstObservedAt: string
  /** The value before the most recent observed change, if any. */
  previous: number | null
}

export type WbCachedSeries = WbSeries & { checkedAt: string }

export interface DiscoveryState {
  lastRunAt: string | null
  lastError: string | null
  /** Pages and feeds fetched in the last scan. */
  checked: number
  added: number
  retired: number
  /** Feeds added by the scanner, fetched like any other source. */
  sources: Record<string, NewsSource>
}

export const emptyDiscovery = (): DiscoveryState => ({
  lastRunAt: null,
  lastError: null,
  checked: 0,
  added: 0,
  retired: 0,
  sources: {},
})

export interface CacheData {
  version: 1
  sources: Record<string, SourceState>
  updates: Record<string, UpdateRecord>
  rbi: RbiObservation | null
  worldBank: Partial<Record<WbSeriesKey, WbCachedSeries>>
  discovery: DiscoveryState
  fx: FxRow[]
  alerts: AlertView[]
  aqi: AqiCity[]
}

export function emptyCache(): CacheData {
  return { version: 1, sources: {}, updates: {}, rbi: null, worldBank: {}, discovery: emptyDiscovery(), fx: [], alerts: [], aqi: [] }
}

export interface CacheStore {
  load(): Promise<CacheData>
  save(data: CacheData): Promise<void>
}

function isCacheData(value: unknown): value is CacheData {
  const v = value as CacheData
  return Boolean(v) && v.version === 1 && typeof v.sources === 'object' && typeof v.updates === 'object'
}

/**
 * Durable JSON cache on local disk. Writes go to a temp file and are renamed
 * into place so a crash mid-write never leaves a truncated cache. Saves are
 * serialized. A corrupt file is set aside and the dashboard starts empty
 * rather than inventing values.
 */
export function fileStore(dir: string): CacheStore {
  const file = join(dir, 'cache.json')
  let queue: Promise<void> = Promise.resolve()
  return {
    async load() {
      let raw: string
      try {
        raw = await readFile(file, 'utf8')
      } catch {
        return emptyCache()
      }
      try {
        const parsed = JSON.parse(raw) as unknown
        if (isCacheData(parsed)) return { ...emptyCache(), ...parsed }
      } catch {
        // fall through
      }
      await rename(file, `${file}.corrupt-${Date.now()}`).catch(() => {})
      return emptyCache()
    },
    save(data) {
      queue = queue.then(async () => {
        await mkdir(dir, { recursive: true })
        const tmp = `${file}.${process.pid}.tmp`
        await writeFile(tmp, JSON.stringify(data), 'utf8')
        await rename(tmp, file)
      })
      return queue
    },
  }
}

export function memoryStore(initial: CacheData = emptyCache()): CacheStore & { saved: CacheData | null } {
  const store = {
    saved: null as CacheData | null,
    async load() {
      return structuredClone(initial)
    },
    async save(data: CacheData) {
      store.saved = structuredClone(data)
    },
  }
  return store
}
