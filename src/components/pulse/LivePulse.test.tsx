// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { NowContext } from '../common/hooks'
import { ClusterCard, DeltaChips, FreshnessStrip, IndiaStateMap, useLastVisit } from './LivePulse'
import { buildSnapshot } from '../../server/snapshot'
import { emptyCache } from '../../server/cache'
import type { ClusterView } from '../../domain/types'
const NOW = new Date('2026-10-11T06:00:00Z')
const wrap = (children: ReactNode) => <PreferencesProvider getStorage={() => null} getLanguages={() => ['en']}><NowContext.Provider value={NOW}>{children}</NowContext.Provider></PreferencesProvider>

describe('pulse interactions', () => {
  it('offers equivalent state selection through map shapes and the full-size dropdown', () => {
    const select = vi.fn()
    render(wrap(<IndiaStateMap counts={{ DL: 3 }} alerts={[]} selected="" onSelect={select} />))
    fireEvent.click(screen.getByRole('button', { name: 'Delhi: 3 stories in 3 hours' }))
    expect(select).toHaveBeenLastCalledWith('DL')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MH' } })
    expect(select).toHaveBeenLastCalledWith('MH')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Delhi: 3 stories in 3 hours' }), { key: 'Enter' })
    expect(select).toHaveBeenLastCalledWith('DL')
    expect(screen.getAllByRole('button')).toHaveLength(36)
    expect(document.querySelectorAll('path.state-shape')).toHaveLength(36)
    expect([...document.querySelectorAll('path.state-shape')].every((path) => (path.getAttribute('d')?.length ?? 0) > 0)).toBe(true)
  })
  it('opens source settings from freshness and reports pending sources honestly', () => {
    const open = vi.fn()
    render(wrap(<FreshnessStrip sources={[]} onOpenSources={open} />))
    fireEvent.click(screen.getByRole('button'))
    expect(open).toHaveBeenCalledOnce()
    expect(screen.getByText('Not yet updated')).toBeInTheDocument()
  })
  it('uses all cluster times for deltas, caps the lookback, and keeps missing indicators explicit', () => {
    const snapshot = buildSnapshot(emptyCache(), [], NOW, false)
    snapshot.pulse.clusterTimes.en = [NOW.getTime() - 1_000, NOW.getTime() - 4 * 3600_000]
    const { rerender } = render(wrap(<DeltaChips snapshot={snapshot} previous={null} />))
    expect(screen.getByText('1 new stories')).toBeInTheDocument()
    expect(screen.getByText('AQI unavailable · needs key')).toBeInTheDocument()
    rerender(wrap(<DeltaChips snapshot={snapshot} previous={NOW.getTime() - 48 * 3600_000} />))
    expect(screen.getByText('2 new stories')).toBeInTheDocument()
    expect(screen.getByText('Since your last visit · last 24 hours only')).toBeInTheDocument()
  })
  it('keeps publisher headlines and links inside native disclosure', () => {
    const cluster: ClusterView = { id: 'c', lang: 'en', headline: 'Original publisher headline', summary: null, category: 'policy', firstReportedAt: NOW.toISOString(), latestAt: NOW.toISOString(), independent: 1, verification: 'single', states: [], stale: true, outlets: [{ sourceId: 'a', name: { en: 'Publisher A', hi: 'ए' }, kind: 'reported', title: 'Original publisher headline', url: 'https://example.com/story', at: NOW.toISOString(), group: 0 }] }
    render(wrap(<ClusterCard cluster={cluster} />))
    const details = screen.getByText('Compare headlines').closest('details')!
    expect(details).not.toHaveAttribute('open')
    fireEvent.click(screen.getByText('Compare headlines'))
    expect(details).toHaveAttribute('open')
    expect(screen.getByRole('link', { name: /Publisher A/ })).toHaveAttribute('href', 'https://example.com/story')
    expect(screen.getByText(/Source unavailable/)).toBeInTheDocument()
  })
  it('survives denied localStorage without inventing a previous visit', () => {
    const getter = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Denied') })
    function Probe() { return <p>{useLastVisit() ?? 'first visit'}</p> }
    render(<Probe />)
    expect(screen.getByText('first visit')).toBeInTheDocument()
    getter.mockRestore()
  })
})
