import { parsePibDate } from '../../domain/dates'
import { decodeEntities, summarize, toPlainText } from '../../domain/text'

export interface PibRelease {
  publishedAt: string | null
  summary: string | null
}

/**
 * Reads a PIB release page for its "Posted On" stamp (IST) and the official
 * og:description. Both English ("Posted On:") and Hindi ("प्रविष्टि तिथि:")
 * pages use the same date format inside #PrDateTime.
 */
export function parsePibRelease(html: string, title: string, now: Date): PibRelease {
  const block = /id=["']PrDateTime["'][^>]*>([\s\S]*?)<\/div>/i.exec(html)?.[1] ?? ''
  const publishedAt = parsePibDate(toPlainText(block), now)
  const og = /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1]
  return { publishedAt, summary: og ? summarize(title, decodeEntities(og)) : null }
}
