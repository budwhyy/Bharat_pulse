const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  rupee: '₹',
}

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match
    }
    return NAMED[body.toLowerCase()] ?? match
  })
}

/** Strips markup and collapses whitespace. Entities are decoded after tags are removed. */
export function toPlainText(input: unknown): string {
  if (typeof input !== 'string') return ''
  const withoutTags = input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
  return decodeEntities(decodeEntities(withoutTags)).replace(/\s+/g, ' ').trim()
}

export const SUMMARY_MAX = 200

/**
 * Clamps a teaser to a short summary at a word boundary. Publisher feeds are
 * linked, never republished, so anything longer is cut.
 */
export function clampSummary(text: string, max = SUMMARY_MAX): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut
  return `${base.replace(/[\s,;:.–—-]+$/, '')}…`
}

/** Returns a summary only when it adds something beyond the headline. */
export function summarize(title: string, rawDescription: unknown): string | null {
  const plain = toPlainText(rawDescription)
  if (!plain) return null
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
  if (norm(plain) === norm(title) || norm(title).startsWith(norm(plain))) return null
  return clampSummary(plain)
}
