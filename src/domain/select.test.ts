import { describe, expect, it } from 'vitest'
import { selectLatest } from './select'
import type { Category, Lang, UpdateRecord } from './types'

let n = 0
function rec(category: Category, minutesAgo: number, lang: Lang = 'en', over: Partial<UpdateRecord> = {}): UpdateRecord {
  n += 1
  const at = new Date(Date.UTC(2026, 9, 11, 12, 0) - minutesAgo * 60_000).toISOString()
  return {
    id: `id-${n}`,
    keys: [`id-${n}`],
    sourceId: 'feed',
    lang,
    kind: 'reported',
    title: `${category} ${minutesAgo}`,
    summary: null,
    url: `https://example.com/${n}`,
    category,
    publishedAt: at,
    firstSeenAt: at,
    timeBasis: 'published',
    seq: 0,
    ...over,
  }
}

const titles = (records: { record: UpdateRecord }[]) => records.map((r) => r.record.title)

describe('selectLatest — newest five, balanced', () => {
  it('returns exactly five, one per category, newest first', () => {
    const records = [
      rec('politics', 1),
      rec('politics', 2),
      rec('politics', 3),
      rec('economy', 30),
      rec('policy', 60),
      rec('society', 90),
      rec('risk', 120),
      rec('politics', 4),
    ]
    const picked = selectLatest(records, 'en')
    expect(picked).toHaveLength(5)
    expect(titles(picked)).toEqual(['politics 1', 'economy 30', 'policy 60', 'society 90', 'risk 120'])
    expect(picked.every((p) => !p.languageFallback)).toBe(true)
  })

  it('fills missing categories with the newest remaining items', () => {
    const records = [rec('politics', 1), rec('politics', 2), rec('economy', 3), rec('general', 4), rec('politics', 5), rec('politics', 6)]
    expect(titles(selectLatest(records, 'en'))).toEqual(['politics 1', 'politics 2', 'economy 3', 'general 4', 'politics 5'])
  })

  it('does not let a stale category item displace much newer news', () => {
    const records = [rec('politics', 1), rec('economy', 2), rec('policy', 3), rec('society', 4), rec('politics', 5), rec('risk', 60 * 72)]
    const picked = titles(selectLatest(records, 'en'))
    expect(picked).not.toContain(`risk ${60 * 72}`)
    expect(picked).toHaveLength(5)
  })

  it('breaks equal times by source sequence (e.g. PIB release id)', () => {
    const same = { publishedAt: null, timeBasis: 'first-seen' as const, firstSeenAt: '2026-10-11T12:00:00.000Z' }
    const records = [rec('policy', 0, 'en', { ...same, seq: 10, title: 'older id' }), rec('policy', 0, 'en', { ...same, seq: 11, title: 'newer id' })]
    expect(titles(selectLatest(records, 'en', 2))).toEqual(['newer id', 'older id'])
  })

  it('prefers a mix of publishers: at most two per source while others qualify', () => {
    const records = [
      rec('politics', 1, 'en', { sourceId: 'hindu' }),
      rec('society', 2, 'en', { sourceId: 'hindu' }),
      rec('policy', 3, 'en', { sourceId: 'hindu' }),
      rec('risk', 4, 'en', { sourceId: 'hindu' }),
      rec('economy', 5, 'en', { sourceId: 'mint' }),
      rec('society', 45, 'en', { sourceId: 'ht' }),
      rec('risk', 50, 'en', { sourceId: 'bbc' }),
    ]
    const picked = selectLatest(records, 'en')
    expect(picked.filter((p) => p.record.sourceId === 'hindu')).toHaveLength(2)
    expect(titles(picked)).toEqual(['politics 1', 'policy 3', 'economy 5', 'society 45', 'risk 50'])
  })

  it('lets category balance win over the source cap when only one source covers a category', () => {
    const records = [
      rec('politics', 1, 'en', { sourceId: 'hindu' }),
      rec('policy', 2, 'en', { sourceId: 'hindu' }),
      rec('society', 3, 'en', { sourceId: 'hindu' }),
      rec('economy', 4, 'en', { sourceId: 'mint' }),
      rec('risk', 5, 'en', { sourceId: 'bbc' }),
    ]
    expect(titles(selectLatest(records, 'en'))).toEqual(['politics 1', 'policy 2', 'society 3', 'economy 4', 'risk 5'])
  })

  it('ranks items of unknown time below dated items', () => {
    const records = [
      rec('policy', 0, 'en', { timeBasis: 'unknown', publishedAt: null, title: 'undated' }),
      rec('policy', 300, 'en', { title: 'dated, 5h ago' }),
    ]
    expect(titles(selectLatest(records, 'en', 2))).toEqual(['dated, 5h ago', 'undated'])
  })

  it('fills from the other language and flags it rather than translating', () => {
    const records = [rec('politics', 1, 'hi'), rec('economy', 2, 'hi'), rec('policy', 3, 'en'), rec('risk', 4, 'en'), rec('society', 5, 'en')]
    const picked = selectLatest(records, 'hi')
    expect(picked).toHaveLength(5)
    expect(picked.filter((p) => p.languageFallback).map((p) => p.record.lang)).toEqual(['en', 'en', 'en'])
    expect(picked.filter((p) => !p.languageFallback).map((p) => p.record.lang)).toEqual(['hi', 'hi'])
  })

  it('returns fewer than five only when fewer exist', () => {
    expect(selectLatest([rec('risk', 1)], 'en')).toHaveLength(1)
    expect(selectLatest([], 'en')).toEqual([])
  })
})
