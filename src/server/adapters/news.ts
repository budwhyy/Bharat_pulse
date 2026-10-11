import { categorize, isRoundup } from '../../domain/categorize'
import { dedupeKeys } from '../../domain/canonical'
import { parseFeedDate } from '../../domain/dates'
import { summarize, toPlainText } from '../../domain/text'
import type { NormalizedItem } from '../../domain/types'
import type { NewsSource } from '../sources'
import type { RawFeedItem } from './rss'

const DEVANAGARI = /[ऀ-ॿ]/

/**
 * Guards against a feed serving the wrong language (PIB does this when its
 * session parameters are off): most headlines must be in the declared script.
 */
export function assertFeedLanguage(items: Pick<NormalizedItem, 'title'>[], lang: 'en' | 'hi'): void {
  if (items.length === 0) return
  const devanagari = items.filter((item) => DEVANAGARI.test(item.title)).length / items.length
  if (lang === 'en' ? devanagari > 0.5 : devanagari < 0.5) {
    throw new Error(`Feed language mismatch: expected ${lang === 'en' ? 'English' : 'Hindi'} headlines`)
  }
}

/** Release id from a PIB link, used to order PIB items whose feed carries no time. */
export function pibReleaseId(url: string): number {
  const match = /[?&]PRID=(\d+)/i.exec(url)
  return match ? Number(match[1]) : 0
}

/**
 * Normalizes raw feed items into stable records: plain-text title, clamped
 * teaser, validated publisher time, deterministic category, dedupe keys.
 * Items without a title or a usable link are dropped.
 */
export function normalizeFeedItems(raw: RawFeedItem[], source: NewsSource, now: Date): NormalizedItem[] {
  const items: NormalizedItem[] = []
  const total = raw.length
  raw.forEach((entry, index) => {
    const title = toPlainText(entry.title)
    const url = entry.link
    if (!title || !/^https?:\/\//i.test(url) || isRoundup(title)) return
    const keys = dedupeKeys(source.id, url, entry.guid)
    if (keys.length === 0) return
    const summary = summarize(title, entry.description)
    items.push({
      keys,
      sourceId: source.id,
      lang: source.lang,
      kind: source.kind,
      title,
      summary,
      url,
      category: categorize({ title, summary, lang: source.lang, defaultCategory: source.defaultCategory }),
      publishedAt: parseFeedDate(entry.pubDate, now, source.defaultOffset),
      // Feeds list newest first; PIB ids grow with each release.
      seq: source.pib ? pibReleaseId(url) : total - index,
    })
  })
  return items
}
