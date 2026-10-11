import { describe, expect, it, vi } from 'vitest'
vi.mock('node:fs/promises', () => ({ readFile: vi.fn(), rename: vi.fn(), mkdir: vi.fn(), writeFile: vi.fn() }))
import { readFile } from 'node:fs/promises'
import { emptyCache, fileStore } from './cache'

describe('cache migration', () => {
  it('loads pre-Pulse caches without losing verified news or indicator values', async () => {
    const { fx: _fx, alerts: _alerts, aqi: _aqi, ...old } = emptyCache()
    old.rbi = { repo: 5.5, sdf: 5.25, msf: 5.75, checkedAt: '2026-10-11T05:00:00Z', firstObservedAt: '2026-10-07T05:00:00Z', previous: null }
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(old))
    const loaded = await fileStore('unused-fixture-path').load()
    expect(loaded.rbi).toEqual(old.rbi)
    expect(loaded.fx).toEqual([])
    expect(loaded.alerts).toEqual([])
    expect(loaded.aqi).toEqual([])
  })
})
