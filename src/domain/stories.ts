import { tagStates } from './states'
import { sortTime } from './select'
import type { Category, Lang, Localized, UpdateKind, UpdateRecord } from './types'

export type Verification = 'official' | 'multi' | 'single' | 'opinion'

export interface ClusterOutlet {
  sourceId: string
  name: Localized
  kind: UpdateKind
  title: string
  url: string
  at: string
  /** Outlets sharing a group published near-identical copy (wire/syndication) and count once. */
  group: number
}

export interface StoryCluster {
  id: string
  lang: Lang
  /** The earliest report's own headline: not rewritten. */
  headline: string
  summary: string | null
  category: Category
  firstReportedAt: string
  latestAt: string
  outlets: ClusterOutlet[]
  independent: number
  verification: Verification
  states: string[]
  score: number
}

// ---------------------------------------------------------------------------
// Similarity

const STOP_EN = new Set(
  'the a an and or but of to in on at for with from by as is are was were be been it its this that these those after before over under into amid says said say will would may might could can has have had not no new more most than then also about against between during up down out off just now how why what who when where which while their his her our your they them he she we you i'.split(
    ' ',
  ),
)
const STOP_HI = new Set('के की का को में से पर है हैं था थे थी और या एक यह वह इस उस जो कि भी ने तो लिए साथ बाद पहले अब कल आज क्या क्यों कैसे कौन'.split(' '))

export function tokens(title: string, lang: Lang): Set<string> {
  const stop = lang === 'hi' ? STOP_HI : STOP_EN
  const out = new Set<string>()
  for (const raw of title.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u)) {
    if (!raw || stop.has(raw)) continue
    if (/^\d+$/.test(raw) && raw.length < 2) continue
    if (raw.length < 3 && !/^\p{N}+$/u.test(raw) && lang === 'en') continue
    out.add(raw)
  }
  return out
}

function overlap(a: Set<string>, b: Set<string>): { shared: number; jaccard: number; coeff: number } {
  let shared = 0
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  for (const t of small) if (large.has(t)) shared++
  const union = a.size + b.size - shared
  return { shared, jaccard: union ? shared / union : 0, coeff: small.size ? shared / small.size : 0 }
}

/** Same event: enough distinctive words in common, relative to both headlines. */
export function sameStory(a: Set<string>, b: Set<string>): boolean {
  const { shared, jaccard, coeff } = overlap(a, b)
  return shared >= 3 && jaccard >= 0.3 && coeff >= 0.5
}

/** Near-identical copy: wire/syndicated text rather than independent reporting. */
export function nearDuplicate(a: Set<string>, b: Set<string>): boolean {
  return overlap(a, b).jaccard >= 0.85
}

const WIRE = /\b(PTI|ANI|IANS|UNI|Reuters|AFP|Press Trust of India)\b/

// ---------------------------------------------------------------------------
// Clustering

const WINDOW_MS = 36 * 3600_000
export const CLUSTER_HORIZON_HOURS = 24

class UnionFind {
  private parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]!]!
      i = this.parent[i]!
    }
    return i
  }
  union(a: number, b: number) {
    this.parent[this.find(a)] = this.find(b)
  }
}

const OPINION_PATH = /\/(opinion|opinions|editorial|editorials|columns?|blogs?|views|analysis-opinion)\//i

function atOf(record: UpdateRecord): number {
  return sortTime(record)
}

export interface ClusterInput {
  record: UpdateRecord
  name: Localized
  outletId?: string
}

/**
 * Groups reports of the same event across outlets (within one language: no
 * translation is attempted). Pure and deterministic: same records → same
 * clusters. Items from the same outlet never inflate the count.
 */
export function clusterStories(inputs: ClusterInput[], now: Date): StoryCluster[] {
  const cutoff = now.getTime() - CLUSTER_HORIZON_HOURS * 3600_000
  const items = inputs.filter((i) => i.record.timeBasis !== 'unknown' && atOf(i.record) >= cutoff && atOf(i.record) <= now.getTime())
  const result: StoryCluster[] = []

  for (const lang of ['en', 'hi'] as const) {
    const list = items.filter((i) => i.record.lang === lang).sort((a, b) => atOf(a.record) - atOf(b.record) || a.record.id.localeCompare(b.record.id))
    const toks = list.map((i) => tokens(i.record.title, lang))
    const uf = new UnionFind(list.length)

    // Inverted index over tokens keeps this near-linear: only items sharing a token are compared.
    const index = new Map<string, number[]>()
    list.forEach((_, i) => {
      const seen = new Set<number>()
      for (const t of toks[i]!) {
        for (const j of index.get(t) ?? []) {
          if (seen.has(j)) continue
          seen.add(j)
          if (atOf(list[i]!.record) - atOf(list[j]!.record) > WINDOW_MS) continue
          if (sameStory(toks[i]!, toks[j]!)) uf.union(i, j)
        }
        const bucket = index.get(t)
        if (bucket) bucket.push(i)
        else index.set(t, [i])
      }
    })

    const groups = new Map<number, number[]>()
    list.forEach((_, i) => {
      const root = uf.find(i)
      const g = groups.get(root)
      if (g) g.push(i)
      else groups.set(root, [i])
    })

    for (const members of groups.values()) {
      // One entry per outlet (its earliest report of this story), oldest first.
      const perOutlet = new Map<string, number>()
      for (const i of members) {
        const outlet = list[i]!.outletId ?? list[i]!.record.sourceId
        if (!perOutlet.has(outlet)) perOutlet.set(outlet, i)
      }
      const picked = [...perOutlet.values()]

      // Collapse near-identical copy into groups.
      const groupOf: number[] = []
      let groupCount = 0
      const textOf = (idx: number) => `${list[idx]!.record.author ?? ''} ${list[idx]!.record.title} ${list[idx]!.record.summary ?? ''}`
      picked.forEach((idx, n) => {
        const agency = WIRE.exec(textOf(idx))?.[1]
        let g = -1
        for (let m = 0; m < n; m++) {
          const other = picked[m]!
          // Near-identical text, or both credit the same wire agency for the same event.
          if (nearDuplicate(toks[idx]!, toks[other]!) || (agency && agency === WIRE.exec(textOf(other))?.[1])) {
            g = groupOf[m]!
            break
          }
        }
        groupOf.push(g === -1 ? groupCount++ : g)
      })

      const outlets: ClusterOutlet[] = picked.map((idx, n) => ({
        sourceId: list[idx]!.record.sourceId,
        name: list[idx]!.name,
        kind: list[idx]!.record.kind,
        title: list[idx]!.record.title,
        url: list[idx]!.record.url,
        at: new Date(atOf(list[idx]!.record)).toISOString(),
        group: groupOf[n]!,
      }))

      const first = list[picked[0]!]!.record
      const official = outlets.some((o) => o.kind === 'official')
      const opinion = picked.every((idx) => OPINION_PATH.test(list[idx]!.record.url))
      const independent = new Set(outlets.map((o) => o.group)).size
      const verification: Verification = opinion ? 'opinion' : official ? 'official' : independent >= 2 ? 'multi' : 'single'

      const states = [...new Set(picked.flatMap((idx) => tagStates(list[idx]!.record.title, list[idx]!.record.summary)))]
      const latest = Math.max(...members.map((i) => atOf(list[i]!.record)))
      const best = picked.map((idx) => list[idx]!.record).find((r) => r.summary) ?? first
      const categories = picked.map((idx) => list[idx]!.record.category).filter((c) => c !== 'general')
      const category = mode(categories) ?? first.category

      result.push({
        id: `c-${first.id}`,
        lang,
        headline: first.title,
        summary: best.summary,
        category,
        firstReportedAt: outlets[0]!.at,
        latestAt: new Date(latest).toISOString(),
        outlets,
        independent,
        verification,
        states,
        score: 0,
      })
    }
  }
  return result.map((c) => ({ ...c, score: scoreCluster(c, now) }))
}

function mode<T>(list: T[]): T | null {
  const counts = new Map<T, number>()
  for (const x of list) counts.set(x, (counts.get(x) ?? 0) + 1)
  let best: T | null = null
  let n = 0
  for (const [k, v] of counts) if (v > n) [best, n] = [k, v]
  return best
}

/** Recency half-life of a cluster's rank, in hours. */
export const RECENCY_HALF_LIFE_H = 6

/**
 * The published ranking formula (see /methodology):
 *   score = recencyDecay × ln(1 + independentOutlets) × languageSpread
 * recencyDecay halves every 6 h from the latest report; independentOutlets
 * counts near-identical wire copy once; languageSpread is the number of
 * languages the story appears in (1 today: clusters are built per language).
 * No clicks, shares or engagement signals are used.
 */
export function scoreCluster(cluster: Pick<StoryCluster, 'latestAt' | 'independent'>, now: Date, languageSpread = 1): number {
  const ageH = Math.max(0, (now.getTime() - Date.parse(cluster.latestAt)) / 3600_000)
  const recencyDecay = 0.5 ** (ageH / RECENCY_HALF_LIFE_H)
  return recencyDecay * Math.log(1 + cluster.independent) * languageSpread
}

/** Official-source stories are pinned first, then by score. */
export function rankClusters(clusters: StoryCluster[]): StoryCluster[] {
  const pinned = (c: StoryCluster) => (c.verification === 'official' ? 1 : 0)
  return [...clusters].sort((a, b) => b.score - a.score || Date.parse(b.latestAt) - Date.parse(a.latestAt) || a.id.localeCompare(b.id))
    // Pinning only lifts official stories that are themselves recent (score above a floor), so a stale release can't sit on top.
    .sort((a, b) => (pinned(b) && b.score > 0.35 ? 1 : 0) - (pinned(a) && a.score > 0.35 ? 1 : 0))
}
