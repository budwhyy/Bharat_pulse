import { describe, expect, it } from 'vitest'
import { STATES, tagStates } from './states'
import { clusterStories, rankClusters, scoreCluster, tokens, type ClusterInput } from './stories'
import type { Lang, UpdateKind, UpdateRecord } from './types'

const NOW = new Date('2026-10-11T06:00:00Z')
let n = 0

function item(
  sourceId: string,
  title: string,
  hoursAgo: number,
  over: Partial<UpdateRecord> & { lang?: Lang; kind?: UpdateKind } = {},
): ClusterInput {
  n += 1
  const at = new Date(NOW.getTime() - hoursAgo * 3600_000).toISOString()
  return {
    name: { en: sourceId, hi: sourceId },
    record: {
      id: `r${n}`,
      keys: [`r${n}`],
      sourceId,
      lang: 'en',
      kind: 'reported',
      title,
      summary: null,
      url: `https://${sourceId}.example/${n}`,
      category: 'politics',
      publishedAt: at,
      firstSeenAt: at,
      timeBasis: 'published',
      seq: n,
      ...over,
    },
  }
}

describe('tagStates', () => {
  it('finds states by name or city, in English and Hindi', () => {
    expect(tagStates('Magnitude 4.2 earthquake jolts Uttarakhand, epicenter in Uttarkashi')).toEqual(['UK'])
    expect(tagStates('Thiruvananthapuram zoo animals row')).toEqual(['KL'])
    expect(tagStates('अहमदाबाद में खुले नाले में गिरी बच्ची')).toEqual(['GJ'])
    expect(tagStates('उत्तर प्रदेश के रायबरेली ज़िले में बाढ़')).toEqual(['UP'])
    expect(tagStates('Internet suspended near Jantar Mantar in Delhi')).toEqual(['DL'])
  })
  it('does not tag national or foreign stories, or words that merely contain a name', () => {
    expect(tagStates('Parliament passes bill')).toEqual([])
    expect(tagStates('Goal! Goalkeeper saves in Goa-style match')).toEqual(['GA'])
    expect(tagStates('Strategy for Bengaluru-based goalposts')).toEqual(['KA'])
    expect(tagStates('Leah and Pune? no — Leh is in Ladakh')).toEqual(expect.arrayContaining(['LA']))
    expect(tagStates('Bihari cuisine festival')).toEqual([])
  })
  it('has a collision-free tile grid', () => {
    const cells = STATES.map((s) => `${s.col},${s.row}`)
    expect(new Set(cells).size).toBe(STATES.length)
    expect(new Set(STATES.map((s) => s.code)).size).toBe(STATES.length)
  })
})

describe('clusterStories', () => {
  it('groups reports of the same event across outlets and counts each outlet once', () => {
    const clusters = clusterStories(
      [
        item('hindu', 'Mass detention of Delhi protesters draws scrutiny from legal experts', 2),
        item('ht', 'Legal experts scrutinise mass detention of Delhi protesters', 1.5),
        item('toi', 'Delhi protesters mass detention: legal experts raise concerns', 1),
        item('hindu', 'Mass detention of Delhi protesters: second report from same outlet', 0.5),
        item('mint', 'Economic think tank says govt should withdraw proposed UPI charges', 1),
      ],
      NOW,
    )
    expect(clusters).toHaveLength(2)
    const detention = clusters.find((c) => c.headline.startsWith('Mass detention of Delhi'))!
    expect(detention.outlets.map((o) => o.sourceId)).toEqual(['hindu', 'ht', 'toi'])
    expect(detention.independent).toBe(3)
    expect(detention.verification).toBe('multi')
    expect(detention.states).toEqual(['DL'])
    // The earliest report's own headline, untouched.
    expect(detention.headline).toBe('Mass detention of Delhi protesters draws scrutiny from legal experts')
    expect(clusters.find((c) => c.headline.startsWith('Economic'))!.verification).toBe('single')
  })

  it('collapses near-identical syndicated copy into one independent voice', () => {
    const t = 'RBI raises repo rate by 25 basis points to 5.50 per cent citing inflation risks'
    const clusters = clusterStories(
      [item('a', t, 3), item('b', t, 2.9), item('c', `${t}.`, 2.8), item('d', 'RBI hikes repo rate 25 bps to 5.50%, signals more tightening if inflation persists', 2)],
      NOW,
    )
    expect(clusters).toHaveLength(1)
    expect(clusters[0]!.outlets).toHaveLength(4)
    expect(clusters[0]!.independent).toBe(2)
  })

  it('treats outlets crediting the same wire agency as one voice', () => {
    const clusters = clusterStories(
      [
        { ...item('a', 'Canadian trade delegation heads to India to firm up ties', 3), record: { ...item('a', 'Canadian trade delegation heads to India to firm up ties', 3).record, summary: 'Led by a minister, the mission is the largest in 30 years, PTI reported.' } },
        { ...item('b', 'Canada sends 300-member trade delegation to India as ties firm up', 2.5), record: { ...item('b', 'Canada sends 300-member trade delegation to India as ties firm up', 2.5).record, summary: 'The mission is the largest in 30 years: PTI.' } },
      ],
      NOW,
    )
    expect(clusters[0]!.independent).toBe(1)
  })

  it('marks official-source stories and keeps languages apart', () => {
    const clusters = clusterStories(
      [
        item('pib', 'Cabinet approves new scheme for drone manufacturing in India', 2, { kind: 'official' }),
        item('hindu', 'Cabinet approves scheme for drone manufacturing across India', 1),
        item('bhaskar', 'कैबिनेट ने ड्रोन निर्माण के लिए नई योजना को मंजूरी दी', 1, { lang: 'hi' }),
      ],
      NOW,
    )
    expect(clusters).toHaveLength(2)
    expect(clusters.find((c) => c.lang === 'en')!.verification).toBe('official')
    expect(clusters.find((c) => c.lang === 'hi')!.verification).toBe('single')
  })

  it('does not merge unrelated stories that share a few common words', () => {
    const clusters = clusterStories(
      [item('a', 'Parliament passes election reform bill amid opposition protest', 2), item('b', 'Opposition protest over fuel price hike in Kerala', 2)],
      NOW,
    )
    expect(clusters).toHaveLength(2)
  })

  it('ignores items older than 24 hours and items with unknown time', () => {
    const clusters = clusterStories(
      [item('a', 'Old story about monsoon rainfall deficit in northern states', 30), item('b', 'Undated story about the new labour codes taking effect', 1, { timeBasis: 'unknown', publishedAt: null })],
      NOW,
    )
    expect(clusters).toHaveLength(0)
  })

  it('flags opinion pieces', () => {
    const clusters = clusterStories([item('a', 'Why the delimitation debate matters for southern states', 2, { url: 'https://a.example/opinion/why-it-matters' })], NOW)
    expect(clusters[0]!.verification).toBe('opinion')
  })
  it('uses explicit feed bylines for wire collapse and excludes future reports', () => {
    const reports = [
      item('a', 'Canadian trade delegation heads to India to firm up ties', 3, { author: 'PTI' }),
      item('b', 'Canada sends 300-member trade delegation to India as ties firm up', 2.5, { author: 'PTI' }),
      item('future', 'A completely different election reform headline', -1),
    ]
    const clusters = clusterStories(reports, NOW)
    expect(clusters).toHaveLength(1)
    expect(clusters[0]!.independent).toBe(1)
    expect(clusterStories([...reports].reverse(), NOW)).toEqual(clusters)
  })
})

describe('ranking', () => {
  it('follows the published formula: recency × ln(1 + independent outlets)', () => {
    const fresh = scoreCluster({ latestAt: NOW.toISOString(), independent: 3 }, NOW)
    expect(fresh).toBeCloseTo(Math.log(4), 6)
    const sixHours = scoreCluster({ latestAt: new Date(NOW.getTime() - 6 * 3600_000).toISOString(), independent: 3 }, NOW)
    expect(sixHours).toBeCloseTo(Math.log(4) / 2, 6)
    expect(scoreCluster({ latestAt: NOW.toISOString(), independent: 1 }, NOW)).toBeLessThan(fresh)
  })

  it('ranks wider, fresher coverage first and pins recent official stories', () => {
    const clusters = clusterStories(
      [
        item('a', 'Flood alert issued for Assam districts as rivers rise sharply', 1),
        item('b', 'Assam flood alert: rivers rise sharply, districts warned', 1),
        item('c', 'Flood alert for Assam districts as rivers rise', 1),
        item('pib', 'Cabinet approves new scheme for drone manufacturing in India', 1, { kind: 'official' }),
        item('d', 'Quiet local story about a school reopening after the festival break', 1),
      ],
      NOW,
    )
    const ranked = rankClusters(clusters)
    expect(ranked[0]!.verification).toBe('official')
    expect(ranked[1]!.independent).toBe(3)
    expect(ranked.at(-1)!.independent).toBe(1)
  })
})

describe('tokens', () => {
  it('drops stopwords and short English words but keeps numbers and Devanagari', () => {
    expect([...tokens('The RBI raises repo to 5.50 in a hike', 'en')].sort()).toEqual(['50', 'hike', 'raises', 'rbi', 'repo'].sort())
    expect(tokens('आरबीआई ने रेपो दर बढ़ाई', 'hi').has('रेपो')).toBe(true)
    expect(tokens('आरबीआई ने रेपो दर बढ़ाई', 'hi').has('ने')).toBe(false)
  })
})
