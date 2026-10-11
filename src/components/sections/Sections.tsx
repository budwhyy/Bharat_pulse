import { TIMELINE } from '../../data/context'
import { useState } from 'react'
import { tagStates } from '../../domain/states'
import { ClusterCard, DeltaChips, FreshnessStrip, IndiaStateMap, PulseIndicators } from '../pulse/LivePulse'
import { useNow } from '../common/hooks'
import type { DashboardSnapshot, Lang } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'
import {
  AgeStructureCard,
  CpiCard,
  FemaleLfprCard,
  FertilityCard,
  GdpCard,
  OverviewCharts,
  PopulationCard,
  UnemploymentCard,
  UpiCard,
} from '../charts/IndicatorCharts'
import { PolicyTracker } from '../economy/PolicyTracker'
import { KpiStrip } from '../kpi/KpiStrip'
import { PoliticsSection } from '../politics/Politics'
import { RisksSection } from '../risks/Risks'
import { EventList, Timeline } from '../timeline/Timeline'
import { LatestUpdates } from '../updates/LatestUpdates'

export const SECTIONS = ['overview', 'politics', 'economy', 'society', 'risks'] as const
export type Section = (typeof SECTIONS)[number]

export function isSection(value: unknown): value is Section {
  return typeof value === 'string' && (SECTIONS as readonly string[]).includes(value)
}

interface SectionProps {
  snapshot: DashboardSnapshot
  lang: Lang
  onRefresh: () => void
  onOpenSources: () => void
  previousVisit: number | null
}

function ChartGrid({ children, headingId }: { children: React.ReactNode; headingId: string }) {
  const { t } = useI18n()
  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-head">
        <h2 id={headingId}>{t('chart.grid')}</h2>
      </div>
      <div className="chart-grid">{children}</div>
    </section>
  )
}

function Overview({ snapshot, lang, onRefresh, onOpenSources, previousVisit }: SectionProps) {
  const [state, setState] = useState('')
  const { t } = useI18n()
  const now = useNow().getTime()
  const clusters = snapshot.pulse.clusters[lang].filter((c) => !state || c.states.includes(state))
  const alerts = snapshot.alerts.filter((a) => (!state || a.states.includes(state)) && now - Date.parse(a.at) < 6 * 3600_000)
  const updates = snapshot.updates[lang].filter((u) => !state || tagStates(u.title, u.summary).includes(state))
  return (
    <>
      <div className="live-pulse">
        <FreshnessStrip sources={snapshot.sources} onOpenSources={onOpenSources} />
        <IndiaStateMap counts={snapshot.pulse.stateCounts[lang]} alerts={snapshot.alerts} selected={state} onSelect={setState} pinnedAlerts={alerts} />
        <DeltaChips snapshot={snapshot} previous={previousVisit} />
        <section className="cluster-stream" aria-labelledby="pulse-heading">
          <h2 className="sr-only" id="pulse-heading">{t('pulse.stories')}</h2>
          {clusters.length ? clusters.map((c) => <ClusterCard key={c.id} cluster={c} />) : <div className="cluster-card"><h3>{t('pulse.empty')}</h3><p>{t('pulse.emptyHint')}</p><button className="btn" onClick={onOpenSources}>{t('footer.sources')}</button></div>}
        </section>
      </div>
      <LatestUpdates items={updates} refreshing={snapshot.refreshing} onRefresh={onRefresh} />
      <PulseIndicators snapshot={snapshot} />
      <KpiStrip kpis={snapshot.kpis} headingId="kpi-heading" />
      <ChartGrid headingId="charts-heading">
        <OverviewCharts datasets={snapshot.datasets} repo={snapshot.kpis.repo} />
      </ChartGrid>
      <Timeline />
    </>
  )
}

function Economy({ snapshot }: SectionProps) {
  const { datasets, kpis } = snapshot
  return (
    <>
      <KpiStrip kpis={kpis} ids={['gdp', 'cpi', 'wpi', 'repo', 'unemployment', 'upi']} headingId="kpi-heading" />
      <ChartGrid headingId="charts-heading">
        <GdpCard quarterly={datasets.gdpQuarterly} annual={datasets.gdpAnnual} />
        <CpiCard cpi={datasets.cpi} repo={kpis.repo} />
        <UnemploymentCard set={datasets.unemployment} />
        <UpiCard set={datasets.upi} />
      </ChartGrid>
      <PolicyTracker />
    </>
  )
}

function Society({ snapshot }: SectionProps) {
  const { t } = useI18n()
  const { datasets, kpis } = snapshot
  const context = TIMELINE.filter((e) => e.area === 'society' || e.area === 'policy').sort((a, b) =>
    b.date.localeCompare(a.date),
  )
  return (
    <>
      <KpiStrip kpis={kpis} ids={['population', 'flfpr', 'unemployment', 'upi']} headingId="kpi-heading" />
      <ChartGrid headingId="charts-heading">
        <PopulationCard set={datasets.population} />
        <AgeStructureCard set={datasets.ageStructure} />
        <FertilityCard set={datasets.fertility} />
        <FemaleLfprCard set={datasets.femaleLfpr} />
        <UnemploymentCard set={datasets.unemployment} />
        <UpiCard set={datasets.upi} />
      </ChartGrid>
      <section className="panel" aria-labelledby="context-heading">
        <div className="panel-head">
          <h2 id="context-heading">{t('society.context.heading')}</h2>
          <p>{t('society.context.intro')}</p>
        </div>
        <div className="card" style={{ padding: '0 16px' }}>
          <EventList events={context} />
        </div>
      </section>
    </>
  )
}

export function SectionContent({ section, ...props }: SectionProps & { section: Section }) {
  switch (section) {
    case 'overview':
      return <Overview {...props} />
    case 'politics':
      return <PoliticsSection />
    case 'economy':
      return <Economy {...props} />
    case 'society':
      return <Society {...props} />
    case 'risks':
      return <RisksSection />
  }
}
