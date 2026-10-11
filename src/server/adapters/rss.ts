import { XMLParser } from 'fast-xml-parser'
import { toPlainText } from '../../domain/text'

export interface RawFeedItem {
  title: string
  link: string
  guid: string | null
  pubDate: string | null
  /** Publisher teaser only; full-content fields (content:encoded) are never read. */
  description: string | null
  author: string | null
  category: string | null
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  isArray: (name) => name === 'item' || name === 'entry',
})

function text(node: unknown): string | null {
  if (node == null) return null
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node === 'object' && '#text' in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)['#text'])
  }
  return null
}

function atomLink(node: unknown): string | null {
  const links = Array.isArray(node) ? node : [node]
  for (const link of links) {
    if (link && typeof link === 'object') {
      const rec = link as Record<string, unknown>
      if (!rec['@_rel'] || rec['@_rel'] === 'alternate') return text(rec['@_href'])
    }
  }
  return null
}

/** Parses RSS 2.0 or Atom into raw items. Throws if the document is not a feed. */
export function parseFeed(xml: string): RawFeedItem[] {
  return parseFeedDocument(xml).items
}

/** Like parseFeed, plus the channel title (used to name discovered feeds). */
export function parseFeedDocument(xml: string): { title: string | null; items: RawFeedItem[] } {
  const doc = parser.parse(xml.replace(/^﻿/, '')) as Record<string, any>
  const isRss = typeof doc?.rss === 'object' && doc.rss !== null && 'channel' in doc.rss
  const isAtom = doc != null && 'feed' in doc
  if (!isRss && !isAtom) throw new Error('Not an RSS or Atom feed')
  const rssItems: any[] | undefined = doc.rss?.channel?.item
  const atomEntries: any[] | undefined = doc.feed?.entry

  const title = toPlainText(text(doc.rss?.channel?.title) ?? text(doc.feed?.title) ?? '') || null
  if (rssItems) {
    return { title, items: rssItems.map((item) => ({
      title: toPlainText(text(item.title) ?? ''),
      link: (text(item.link) ?? '').trim(),
      guid: text(item.guid)?.trim() || null,
      pubDate: text(item.pubDate) ?? text(item['dc:date']) ?? null,
      description: text(item.description),
      author: text(item.author) ?? text(item['dc:creator']) ?? null,
      category: text(Array.isArray(item.category) ? item.category[0] : item.category),
    })) }
  }
  return { title, items: (atomEntries ?? []).map((entry) => ({
    title: toPlainText(text(entry.title) ?? ''),
    link: (atomLink(entry.link) ?? '').trim(),
    guid: text(entry.id)?.trim() || null,
    pubDate: text(entry.published) ?? text(entry.updated) ?? null,
    description: text(entry.summary),
    author: null,
    category: null,
  })) }
}
