import { compareNewest, sortTime } from './select'
import type { NormalizedItem, UpdateRecord } from './types'

export const RETENTION_DAYS = 3
/** Even after a long outage, keep this many of each source's newest items as the last verified copy. */
export const KEEP_PER_SOURCE = 30
/** Upper bound per source so the cache file stays small. */
export const MAX_PER_SOURCE = 120

export interface MergeResult {
  records: Record<string, UpdateRecord>
  added: number
}

/**
 * Merges freshly normalized items into the stored records. An item is a
 * duplicate when any of its keys (canonical URL, source GUID) is already known,
 * within the stored set or within the incoming batch. Duplicates keep their
 * original id and first-seen time; a publisher time arriving later is adopted.
 *
 * `watching` says whether the source was being followed closely before this
 * fetch. Only then does "first seen now" bound when an undated item appeared;
 * otherwise (first fetch, or after an outage) its time is recorded as unknown.
 */
export function mergeUpdates(
  stored: Record<string, UpdateRecord>,
  incoming: NormalizedItem[],
  now: Date,
  watching = true,
): MergeResult {
  const records: Record<string, UpdateRecord> = { ...stored }
  const byKey = new Map<string, string>()
  for (const record of Object.values(records)) for (const key of record.keys) byKey.set(key, record.id)

  let added = 0
  const nowIso = now.toISOString()
  for (const item of incoming) {
    if (item.keys.length === 0) continue
    const existingId = item.keys.map((k) => byKey.get(k)).find((id): id is string => Boolean(id))
    if (existingId) {
      const existing = records[existingId]!
      const keys = [...new Set([...existing.keys, ...item.keys])]
      const publishedAt = existing.publishedAt ?? item.publishedAt
      records[existingId] = {
        ...existing,
        keys,
        title: item.title || existing.title,
        summary: item.summary ?? existing.summary,
        category: item.category,
        publishedAt,
        timeBasis: publishedAt ? 'published' : existing.timeBasis,
        seq: Math.max(existing.seq, item.seq),
      }
      for (const key of keys) byKey.set(key, existingId)
      continue
    }
    const id = item.keys[0]!
    records[id] = {
      ...item,
      id,
      firstSeenAt: nowIso,
      timeBasis: item.publishedAt ? 'published' : watching ? 'first-seen' : 'unknown',
    }
    for (const key of item.keys) byKey.set(key, id)
    added += 1
  }
  return { records, added }
}

/**
 * Drops items older than the retention window (and beyond MAX_PER_SOURCE),
 * but never a source's newest KEEP_PER_SOURCE.
 */
export function pruneUpdates(records: Record<string, UpdateRecord>, now: Date): Record<string, UpdateRecord> {
  const cutoff = now.getTime() - RETENTION_DAYS * 86_400_000
  const bySource = new Map<string, UpdateRecord[]>()
  for (const record of Object.values(records)) {
    const list = bySource.get(record.sourceId) ?? []
    list.push(record)
    bySource.set(record.sourceId, list)
  }
  const kept: Record<string, UpdateRecord> = {}
  for (const list of bySource.values()) {
    list.sort(compareNewest)
    list.forEach((record, index) => {
      if (index < KEEP_PER_SOURCE || (index < MAX_PER_SOURCE && sortTime(record) >= cutoff)) {
        kept[record.id] = record
      }
    })
  }
  return kept
}
