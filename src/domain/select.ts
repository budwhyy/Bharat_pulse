import { BALANCED_CATEGORIES, type Lang, type UpdateRecord } from './types'

export const FEED_SIZE = 5
/** A category representative must be this close to the newest item to earn a balanced slot. */
export const BALANCE_WINDOW_HOURS = 48
/** Prefer a mix of publishers: at most this many items per source, unless nothing else qualifies. */
export const MAX_PER_SOURCE_IN_FEED = 2
/** Items whose time is unknown rank below anything dated within this many days. */
const UNKNOWN_TIME_PENALTY_MS = 30 * 86_400_000

export function sortTime(item: Pick<UpdateRecord, 'publishedAt' | 'firstSeenAt' | 'timeBasis'>): number {
  if (item.timeBasis === 'published' && item.publishedAt) return Date.parse(item.publishedAt)
  const seen = Date.parse(item.firstSeenAt)
  return item.timeBasis === 'unknown' ? seen - UNKNOWN_TIME_PENALTY_MS : seen
}

/** Newest first; equal times fall back to the source's own sequence, then id for stability. */
export function compareNewest(a: UpdateRecord, b: UpdateRecord): number {
  return sortTime(b) - sortTime(a) || b.seq - a.seq || a.id.localeCompare(b.id)
}

function balancedPick(pool: UpdateRecord[], size: number): UpdateRecord[] {
  const sorted = [...pool].sort(compareNewest)
  if (sorted.length === 0) return []
  const windowStart = sortTime(sorted[0]!) - BALANCE_WINDOW_HOURS * 3600_000
  const chosen = new Set<UpdateRecord>()
  const perSource = new Map<string, number>()
  const take = (item: UpdateRecord) => {
    chosen.add(item)
    perSource.set(item.sourceId, (perSource.get(item.sourceId) ?? 0) + 1)
  }
  const underCap = (item: UpdateRecord) => (perSource.get(item.sourceId) ?? 0) < MAX_PER_SOURCE_IN_FEED
  const represented = (category: string) => [...chosen].some((item) => item.category === category)

  // 1. One slot per category: its newest item inside the window — first honouring
  //    the per-source cap, then without it for categories still missing.
  for (const capped of [true, false]) {
    for (const category of BALANCED_CATEGORIES) {
      if (chosen.size >= size || represented(category)) continue
      const candidate = sorted.find(
        (item) =>
          !chosen.has(item) &&
          item.category === category &&
          sortTime(item) >= windowStart &&
          (!capped || underCap(item)),
      )
      if (candidate) take(candidate)
    }
  }
  // 2. Remaining slots: newest items overall, again preferring publisher variety.
  for (const capped of [true, false]) {
    for (const item of sorted) {
      if (chosen.size >= size) break
      if (!chosen.has(item) && (!capped || underCap(item))) take(item)
    }
  }
  return [...chosen].sort(compareNewest)
}

export interface SelectedUpdate {
  record: UpdateRecord
  languageFallback: boolean
}

/**
 * The five newest updates for a language, balanced across politics, economy,
 * policy, society and major risks. When the language has too few items, the
 * gap is filled from the other language and flagged instead of translated.
 */
export function selectLatest(records: UpdateRecord[], lang: Lang, size = FEED_SIZE): SelectedUpdate[] {
  const own = balancedPick(
    records.filter((r) => r.lang === lang),
    size,
  )
  const picked: SelectedUpdate[] = own.map((record) => ({ record, languageFallback: false }))
  if (picked.length < size) {
    const others = balancedPick(
      records.filter((r) => r.lang !== lang),
      size - picked.length,
    )
    picked.push(...others.map((record) => ({ record, languageFallback: true })))
  }
  return picked.sort((a, b) => compareNewest(a.record, b.record))
}
