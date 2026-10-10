/**
 * Opt-in smoke test against the real sources: `npm run test:live`.
 * Skipped by default so the suite never depends on the network.
 */
import { describe, expect, it } from 'vitest'
import { emptyCache, memoryStore } from './cache'
import { httpFetcher } from './http'
import { DashboardService } from './service'
import { SOURCES, type SourceDef } from './sources'

// `npm run test:live` (any OS) or LIVE=1. npm exposes the running script's name.
const LIVE = process.env.LIVE === '1' || process.env.npm_lifecycle_event === 'test:live'

describe.runIf(LIVE)('live sources', () => {
  it('refreshes every source and reports what came back', async () => {
    const store = memoryStore(emptyCache())
    const service = new DashboardService({ store, fetcher: httpFetcher, log: (m) => console.log('[source]', m) })
    await service.refresh(SOURCES)
    const snap = await service.snapshot()

    for (const source of snap.sources) {
      const state = store.saved!.sources[source.id]
      console.log(source.id.padEnd(16), source.health.padEnd(8), String(state?.itemCount ?? 0).padStart(4), state?.lastError ?? '')
    }
    for (const lang of ['en', 'hi'] as const) {
      console.log(`\n${lang}:`)
      for (const u of snap.updates[lang]) {
        console.log(`  [${u.category}/${u.kind}] ${u.timeBasis === 'published' ? u.publishedAt : `first-seen ${u.firstSeenAt}`} ${u.sourceId}: ${u.title.slice(0, 90)}`)
      }
    }
    const pib = Object.values(store.saved!.updates).filter((u) => u.sourceId.startsWith('pib'))
    console.log(`\nPIB items with publish time: ${pib.filter((u) => u.publishedAt).length}/${pib.length}`)
    console.log('repo:', snap.kpis.repo.value, snap.kpis.repo.meta.provenance, '| population:', snap.kpis.population.value, snap.kpis.population.meta.provenance)
    console.log('age:', snap.datasets.ageStructure.rows.map((r) => `${r.key}=${r.value.toFixed(1)}`).join(' '), '| flfpr rows:', snap.datasets.femaleLfpr.rows.length)

    expect(snap.updates.en.length).toBe(5)
    expect(snap.updates.hi.length).toBe(5)

    const scan = await service.discover(true)
    const after = await service.snapshot()
    console.log(`
discovery: checked ${scan.checked}, added ${scan.added}`)
    for (const s of after.sources.filter((x) => x.discovered)) console.log('  +', s.name.en, s.lang)
    await service.refresh(service["allSources"]().filter((s: SourceDef) => s.type === "news" && Boolean(s.discovered)))
    const final = await service.snapshot()
    for (const s of final.sources.filter((x) => x.discovered)) console.log('  ', s.health.padEnd(6), s.name.en, s.lastError ?? '')
  }, 300_000)
})
