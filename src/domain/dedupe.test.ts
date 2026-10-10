import { describe, expect, it } from 'vitest'
import { canonicalUrl, dedupeKeys } from './canonical'
import { mergeUpdates, pruneUpdates } from './merge'
import type { NormalizedItem, UpdateRecord } from './types'

describe('canonicalUrl', () => {
  it.each([
    ['http://www.example.com/a/b/?utm_source=x&utm_medium=y#top', 'https://example.com/a/b'],
    ['https://example.com/a/b', 'https://example.com/a/b'],
    ['https://m.example.com/a/b/amp/', 'https://example.com/a/b'],
    ['https://www.example.com/story.amp.html', 'https://example.com/story.html'],
    ['https://www.bbc.com/hindi/articles/c1#0', 'https://bbc.com/hindi/articles/c1'],
    ['https://www.bbc.com/hindi/articles/c1?at_medium=RSS&at_campaign=rss', 'https://bbc.com/hindi/articles/c1'],
    ['https://example.com/s?b=2&a=1', 'https://example.com/s?a=1&b=2'],
    ['https://pib.gov.in/PressReleaseIframePage.aspx?PRID=2321854', 'pib:2321854'],
    ['https://www.pib.gov.in/PressReleasePage.aspx?PRID=2321854&reg=48&lang=2', 'pib:2321854'],
  ])('%s → %s', (input, expected) => {
    expect(canonicalUrl(input)).toBe(expected)
  })

  it('rejects non-web URLs', () => {
    expect(canonicalUrl('javascript:alert(1)')).toBeNull()
    expect(canonicalUrl('not a url')).toBeNull()
  })

  it('derives keys from both the link and a permalink GUID', () => {
    expect(dedupeKeys('bbc', 'https://www.bbc.com/news/x?at_medium=RSS', 'https://www.bbc.co.uk/news/x#0')).toEqual([
      'url:https://bbc.com/news/x',
      'url:https://bbc.co.uk/news/x',
      'guid:bbc:https://www.bbc.co.uk/news/x#0',
    ])
  })
})

const item = (over: Partial<NormalizedItem> & { keys: string[] }): NormalizedItem => ({
  sourceId: 'feed',
  lang: 'en',
  kind: 'reported',
  title: 'Title',
  summary: null,
  url: 'https://example.com/x',
  category: 'general',
  publishedAt: null,
  seq: 0,
  ...over,
})

describe('mergeUpdates (dedupe)', () => {
  const t1 = new Date('2026-10-11T00:00:00Z')
  const t2 = new Date('2026-10-11T00:10:00Z')

  it('collapses duplicates within one batch and across fetches by URL or GUID', () => {
    const first = mergeUpdates(
      {},
      [
        item({ keys: ['url:https://example.com/a', 'guid:feed:1'], title: 'A' }),
        item({ keys: ['url:https://example.com/a'], title: 'A again (same URL)' }),
        item({ keys: ['url:https://example.com/b', 'guid:feed:2'], title: 'B' }),
      ],
      t1,
    )
    expect(Object.keys(first.records)).toHaveLength(2)
    expect(first.added).toBe(2)

    // The same story returns with a changed link but the same GUID.
    const second = mergeUpdates(
      first.records,
      [item({ keys: ['url:https://example.com/a-updated', 'guid:feed:1'], title: 'A (edited)', publishedAt: '2026-10-10T23:00:00.000Z' })],
      t2,
    )
    expect(second.added).toBe(0)
    const records = Object.values(second.records)
    expect(records).toHaveLength(2)
    const a = records.find((r) => r.keys.includes('guid:feed:1'))!
    expect(a.title).toBe('A (edited)')
    expect(a.firstSeenAt).toBe(t1.toISOString())
    expect(a.publishedAt).toBe('2026-10-10T23:00:00.000Z')
    expect(a.timeBasis).toBe('published')
    expect(a.keys).toContain('url:https://example.com/a-updated')
  })

  it('stamps first-seen time on undated items only when the source was being watched', () => {
    const watched = Object.values(mergeUpdates({}, [item({ keys: ['url:https://example.com/c'] })], t1, true).records)[0]!
    expect(watched.firstSeenAt).toBe(t1.toISOString())
    expect(watched.timeBasis).toBe('first-seen')

    // First fetch of a source: an undated item could be hours old, so its time is unknown.
    const baseline = mergeUpdates({}, [item({ keys: ['url:https://example.com/d'] })], t1, false).records
    const record = Object.values(baseline)[0]!
    expect(record.timeBasis).toBe('unknown')

    // A later fetch that carries a publisher time upgrades it; one without keeps it unknown.
    const again = mergeUpdates(baseline, [item({ keys: ['url:https://example.com/d'] })], t2, true).records
    expect(Object.values(again)[0]!.timeBasis).toBe('unknown')
    const dated = mergeUpdates(baseline, [item({ keys: ['url:https://example.com/d'], publishedAt: '2026-10-10T20:00:00.000Z' })], t2).records
    expect(Object.values(dated)[0]!.timeBasis).toBe('published')
  })

  it('prunes old items but keeps each source’s newest as the last verified copy', () => {
    const now = new Date('2026-10-20T00:00:00Z')
    const old: Record<string, UpdateRecord> = {}
    for (let i = 0; i < 40; i++) {
      const id = `url:https://example.com/${i}`
      old[id] = {
        ...item({ keys: [id] }),
        id,
        firstSeenAt: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
        timeBasis: 'first-seen',
      }
    }
    const kept = pruneUpdates(old, now)
    expect(Object.keys(kept)).toHaveLength(30)
    expect(kept['url:https://example.com/39']).toBeDefined()
    expect(kept['url:https://example.com/0']).toBeUndefined()
  })
})
