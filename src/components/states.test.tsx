// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { KPI_RECORDS } from '../data/briefing'
import type { Kpi, UpdateView } from '../domain/types'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { NowContext } from './common/hooks'
import { KpiStrip } from './kpi/KpiStrip'
import { LatestUpdates } from './updates/LatestUpdates'

const NOW = new Date('2026-10-11T06:00:00Z')

function wrap(children: ReactNode, now = NOW, storage: Record<string, string> = {}) {
  const store = new Map(Object.entries(storage))
  const fake = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } as Storage
  return (
    <PreferencesProvider getStorage={() => fake} getLanguages={() => ['en']}>
      <NowContext.Provider value={now}>{children}</NowContext.Provider>
    </PreferencesProvider>
  )
}

const base: UpdateView = {
  id: 'a',
  keys: ['a'],
  sourceId: 'pib-en',
  lang: 'en',
  kind: 'official',
  title: 'Cabinet approves scheme',
  summary: 'Short official summary.',
  url: 'https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1',
  category: 'policy',
  publishedAt: '2026-10-11T05:30:00.000Z',
  firstSeenAt: '2026-10-11T05:31:00.000Z',
  timeBasis: 'published',
  seq: 1,
  sourceName: { en: 'PIB', hi: 'पीआईबी' },
  stale: false,
  languageFallback: false,
}

describe('Latest updates states', () => {
  it('distinguishes official and reported items and links to the original in a new tab', () => {
    const items: UpdateView[] = [
      base,
      { ...base, id: 'b', kind: 'reported', sourceName: { en: 'The Hindu', hi: 'द हिंदू' }, title: 'Reported story', url: 'https://www.thehindu.com/x' },
    ]
    render(wrap(<LatestUpdates items={items} refreshing={false} onRefresh={() => {}} />))
    const list = screen.getAllByRole('listitem')
    expect(list).toHaveLength(2)
    expect(within(list[0]!).getByText('Official')).toBeInTheDocument()
    expect(within(list[1]!).getByText('Reported')).toBeInTheDocument()
    const link = within(list[1]!).getByRole('link', { name: /Reported story.*Read at The Hindu.*new tab/ })
    expect(link).toHaveAttribute('href', 'https://www.thehindu.com/x')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    // Timestamp with zone and a freshness label.
    expect(within(list[0]!).getByText(/11:00 am IST/)).toBeInTheDocument()
    expect(within(list[0]!).getByText(/30 min ago/)).toBeInTheDocument()
  })

  it('labels stale copies, language fallbacks, first-seen and unknown times', () => {
    const items: UpdateView[] = [
      { ...base, id: 's', stale: true },
      { ...base, id: 'f', lang: 'hi', title: 'हिंदी शीर्षक', languageFallback: true },
      { ...base, id: 'u', timeBasis: 'unknown', publishedAt: null },
      { ...base, id: 'o', publishedAt: '2026-10-09T05:30:00.000Z' },
    ]
    render(wrap(<LatestUpdates items={items} refreshing={false} onRefresh={() => {}} />))
    expect(screen.getByText('Source unavailable — last verified copy')).toBeInTheDocument()
    expect(screen.getByText(/In Hindi — no English item/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /हिंदी शीर्षक/ })).toHaveAttribute('lang', 'hi')
    expect(screen.getByText(/Time not stated/)).toBeInTheDocument()
    expect(screen.getByText('Over a day old')).toBeInTheDocument()
  })

  it('shows a skeleton while the first fetch runs, then an empty state with retry', () => {
    const onRefresh = vi.fn()
    const { rerender } = render(wrap(<LatestUpdates items={[]} refreshing onRefresh={onRefresh} />))
    expect(screen.getByRole('status', { name: 'Loading latest updates' })).toBeInTheDocument()
    rerender(wrap(<LatestUpdates items={[]} refreshing={false} onRefresh={onRefresh} />))
    expect(screen.getByText('No updates yet')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(onRefresh).toHaveBeenCalled()
  })
})

function kpis(overrides: Partial<Record<keyof typeof KPI_RECORDS, Partial<Kpi['meta']>>> = {}) {
  return Object.fromEntries(
    Object.values(KPI_RECORDS).map((r) => [
      r.id,
      {
        ...r,
        meta: {
          provenance: 'release-record',
          cadence: r.meta.cadence,
          source: r.meta.source,
          releasedAt: r.meta.releasedAt,
          checkedAt: '2026-10-11',
          nextReleaseDue: r.meta.nextReleaseDue,
          health: 'ok',
          ...overrides[r.id],
        },
      },
    ]),
  ) as Record<keyof typeof KPI_RECORDS, Kpi>
}

describe('KPI freshness flags', () => {
  it('keeps "data released" and "last checked" separate', () => {
    render(wrap(<KpiStrip kpis={kpis()} ids={['cpi']} headingId="k" />))
    const tile = screen.getByRole('listitem')
    expect(within(tile).getByText('Data released').nextSibling).toHaveTextContent('Sept 2026')
    expect(within(tile).getByText('Last checked').nextSibling).toHaveTextContent('11 Oct 2026 (manual)')
    expect(within(tile).getByText('Release record')).toBeInTheDocument()
    expect(within(tile).queryByText('Newer release likely out')).toBeNull()
  })

  it('warns once a newer official release is due', () => {
    render(wrap(<KpiStrip kpis={kpis()} ids={['cpi']} headingId="k" />, new Date('2026-10-20T06:00:00Z')))
    expect(screen.getByText('Newer release likely out')).toBeInTheDocument()
  })

  it('marks a live indicator whose source failed as an error, still showing its last value', () => {
    const data = kpis({ repo: { provenance: 'official-live', health: 'error', checkedAt: '2026-10-10T06:00:00.000Z' } })
    render(wrap(<KpiStrip kpis={data} ids={['repo']} headingId="k" />))
    const tile = screen.getByRole('listitem')
    expect(within(tile).getByText('5.50')).toBeInTheDocument()
    expect(within(tile).getByText('Error')).toBeInTheDocument()
    expect(within(tile).getByText('Official · live check')).toBeInTheDocument()
  })
})
