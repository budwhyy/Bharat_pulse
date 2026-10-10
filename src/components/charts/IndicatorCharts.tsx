import { useState } from 'react'
import type { Dataset, Datasets, Kpi, SeriesPoint, UnemploymentPoint, UpiPoint } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'
import { SegmentedTabs, useStableId } from '../common/ui'
import { ChartCard, Legend } from './ChartCard'
import { ColumnPlot, LinePlot } from './lazyPlots'
import type { ColumnDatum, LineDatum } from './plots'
import { ShareStrip } from './ShareStrip'

const S1 = 'var(--series-1)'
const S2 = 'var(--series-2)'
const S3 = 'var(--series-3)'

function SeriesTable({ rows, valueHeader, format }: { rows: SeriesPoint[]; valueHeader: string; format: (v: number) => string }) {
  const { t, pick } = useI18n()
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">{t('chart.period')}</th>
          <th scope="col" className="n">
            {valueHeader}
          </th>
          {rows.some((r) => r.note) && <th scope="col">{t('chart.note')}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">
              {row.key !== pick(row.label) ? `${row.key} · ${pick(row.label)}` : row.key}
            </th>
            <td className="n">{format(row.value)}</td>
            {rows.some((r) => r.note) && <td>{row.note ? pick(row.note) : ''}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------

export function GdpCard({ quarterly, annual }: { quarterly: Dataset<SeriesPoint>; annual: Dataset<SeriesPoint> }) {
  const { t, pick, num } = useI18n()
  const [view, setView] = useState<'quarterly' | 'annual'>('quarterly')
  const idBase = useStableId('gdp')
  const set = view === 'quarterly' ? quarterly : annual
  const pct = (v: number) => `${num(v, 1)}%`
  const data: ColumnDatum[] = set.rows.map((r) => ({
    key: r.key,
    tick: view === 'annual' && r.projected ? `${r.key}*` : r.key,
    label: `${r.key} · ${pick(r.label)}${r.projected ? ` (${t('chart.projected')})` : ''}`,
    value: r.value,
    valueText: pct(r.value),
    projected: r.projected,
  }))

  let summary = ''
  const rows = set.rows
  if (view === 'quarterly' && rows.length >= 2) {
    const last = rows.at(-1)!
    const prev = rows.at(-2)!
    const max = rows.reduce((a, b) => (b.value > a.value ? b : a))
    summary = t('chart.gdp.summary.quarterly', {
      last: num(last.value, 1),
      lastLabel: last.key,
      prev: num(prev.value, 1),
      prevLabel: prev.key,
      max: num(max.value, 1),
      maxLabel: max.key,
    })
  } else if (view === 'annual') {
    const actual = rows.filter((r) => !r.projected).at(-1)
    const proj = rows.find((r) => r.projected)
    if (actual && proj) {
      summary = t('chart.gdp.summary.annual', {
        last: num(actual.value, 1),
        lastLabel: actual.key,
        proj: num(proj.value, 1),
        projLabel: proj.key,
      })
    }
  }

  return (
    <ChartCard
      title={t('chart.gdp.title')}
      subtitle={t(view === 'quarterly' ? 'chart.gdp.sub.quarterly' : 'chart.gdp.sub.annual')}
      controls={
        <SegmentedTabs
          idBase={idBase}
          label={t('chart.gdp.title')}
          selected={view}
          onSelect={setView}
          items={[
            { key: 'quarterly', label: t('chart.gdp.quarterly') },
            { key: 'annual', label: t('chart.gdp.annual') },
          ]}
        />
      }
      panel={{ id: `${idBase}-panel`, labelledBy: `${idBase}-tab-${view}` }}
      legend={
        view === 'annual' ? (
          <Legend
            items={[
              { label: t('chart.gdp.annual'), color: S1 },
              { label: t('chart.projected'), color: S1, kind: 'hatch' },
            ]}
          />
        ) : undefined
      }
      height={220}
      empty={rows.length === 0}
      summary={summary}
      meta={set.meta}
      table={<SeriesTable rows={rows} valueHeader={t('chart.gdp.title')} format={pct} />}
    >
      <ColumnPlot
        key={view}
        data={data}
        color={S1}
        seriesName={t('chart.gdp.title')}
        height={220}
        title={t('chart.gdp.title')}
        desc={summary}
      />
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------

export function CpiCard({ cpi, repo }: { cpi: Dataset<SeriesPoint>; repo: Kpi }) {
  const { t, pick, num } = useI18n()
  const pct = (v: number) => `${num(v, 2)}%`
  const data: LineDatum[] = cpi.rows.map((r) => ({ key: r.key, tick: pick(r.label).split(' ')[0]!, label: pick(r.label), cpi: r.value }))
  const first = cpi.rows[0]
  const last = cpi.rows.at(-1)
  const summary =
    first && last
      ? t('chart.cpi.summary', {
          first: num(first.value, 2),
          firstLabel: pick(first.label),
          last: num(last.value, 2),
          lastLabel: pick(last.label),
          repo: repo.value == null ? '—' : num(repo.value, 2),
        })
      : ''
  const references = [{ y: 4, label: t('chart.cpi.target') }]
  if (repo.value != null) references.push({ y: repo.value, label: t('chart.cpi.repo', { value: num(repo.value, 2) }) })
  return (
    <ChartCard
      title={t('chart.cpi.title')}
      subtitle={t('chart.cpi.sub')}
      height={220}
      empty={cpi.rows.length === 0}
      summary={summary}
      meta={cpi.meta}
      table={<SeriesTable rows={cpi.rows} valueHeader={t('chart.cpi.title')} format={pct} />}
    >
      <LinePlot
        data={data}
        series={[{ dataKey: 'cpi', name: t('chart.cpi.title'), color: S1 }]}
        format={pct}
        yTickFormat={(v) => `${num(v, 1)}%`}
        references={references}
        height={220}
        title={t('chart.cpi.title')}
        desc={summary}
      />
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------

export function UnemploymentCard({ set }: { set: Dataset<UnemploymentPoint> }) {
  const { t, pick, num } = useI18n()
  const pct = (v: number) => `${num(v, 1)}%`
  const series = [
    { dataKey: 'urban', name: t('chart.ur.urban'), color: S2 },
    { dataKey: 'all', name: t('chart.ur.all'), color: S1 },
    { dataKey: 'rural', name: t('chart.ur.rural'), color: S3 },
  ]
  const data: LineDatum[] = set.rows.map((r) => ({
    key: r.key,
    tick: pick(r.label).split(' ')[0]!,
    label: pick(r.label),
    all: r.all,
    urban: r.urban,
    rural: r.rural,
  }))
  const last = set.rows.at(-1)
  const summary = last
    ? t('chart.ur.summary', { lastLabel: pick(last.label), all: num(last.all, 1), urban: num(last.urban, 1), rural: num(last.rural, 1) })
    : ''
  return (
    <ChartCard
      title={t('chart.ur.title')}
      subtitle={t('chart.ur.sub')}
      legend={<Legend items={series.map((s) => ({ label: s.name, color: s.color, kind: 'line' as const }))} />}
      height={220}
      empty={set.rows.length === 0}
      summary={summary}
      meta={set.meta}
      table={
        <table>
          <thead>
            <tr>
              <th scope="col">{t('chart.period')}</th>
              {series.map((s) => (
                <th key={s.dataKey} scope="col" className="n">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {set.rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{pick(r.label)}</th>
                <td className="n">{pct(r.urban)}</td>
                <td className="n">{pct(r.all)}</td>
                <td className="n">{pct(r.rural)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <LinePlot data={data} series={series} format={pct} height={220} title={t('chart.ur.title')} desc={summary} />
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------

export function UpiCard({ set }: { set: Dataset<UpiPoint> }) {
  const { t, pick, num } = useI18n()
  const data: ColumnDatum[] = set.rows.map((r) => ({
    key: r.key,
    tick: pick(r.label).split(' ')[0]!,
    label: pick(r.label),
    value: r.volume,
    valueText: num(r.volume, 2),
  }))
  const last = set.rows.at(-1)
  const summary = last ? t('chart.upi.summary', { last: num(last.volume, 2), value: num(last.value, 2), lastLabel: pick(last.label) }) : ''
  return (
    <ChartCard
      title={t('chart.upi.title')}
      subtitle={t('chart.upi.sub')}
      height={200}
      empty={set.rows.length === 0}
      summary={summary}
      meta={set.meta}
      table={
        <table>
          <thead>
            <tr>
              <th scope="col">{t('chart.period')}</th>
              <th scope="col" className="n">
                {t('chart.upi.volume')}
              </th>
              <th scope="col" className="n">
                {t('chart.upi.value')}
              </th>
            </tr>
          </thead>
          <tbody>
            {set.rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{pick(r.label)}</th>
                <td className="n">{num(r.volume, 2)}</td>
                <td className="n">{num(r.value, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ColumnPlot data={data} color={S1} seriesName={t('chart.upi.volume')} height={200} title={t('chart.upi.title')} desc={summary} />
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------

function AnnualLineCard({
  set,
  title,
  subtitle,
  decimals,
  unit,
  summary,
  references,
}: {
  set: Dataset<SeriesPoint>
  title: string
  subtitle: string
  decimals: number
  unit: string
  summary: string
  references?: { y: number; label: string }[]
}) {
  const { num } = useI18n()
  const format = (v: number) => `${num(v, decimals)}${unit}`
  const data: LineDatum[] = set.rows.map((r) => ({ key: r.key, tick: r.key, label: r.key, value: r.value }))
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      height={200}
      empty={set.rows.length < 2}
      summary={summary}
      meta={set.meta}
      table={<SeriesTable rows={set.rows} valueHeader={title} format={format} />}
    >
      <LinePlot
        data={data}
        series={[{ dataKey: 'value', name: title, color: S1 }]}
        format={format}
        yTickFormat={(v) => `${num(v, decimals > 2 ? 2 : decimals)}${unit}`}
        references={references}
        height={200}
        title={title}
        desc={summary}
      />
    </ChartCard>
  )
}

function firstLast(rows: SeriesPoint[]) {
  return { first: rows[0], last: rows.at(-1) }
}

export function PopulationCard({ set }: { set: Dataset<SeriesPoint> }) {
  const { t, num } = useI18n()
  const { first, last } = firstLast(set.rows)
  const summary =
    first && last
      ? t('chart.pop.summary', { last: num(last.value, 3), lastLabel: last.key, first: num(first.value, 3), firstLabel: first.key })
      : ''
  return <AnnualLineCard set={set} title={t('chart.pop.title')} subtitle={t('chart.pop.sub')} decimals={3} unit="" summary={summary} />
}

export function FemaleLfprCard({ set }: { set: Dataset<SeriesPoint> }) {
  const { t, num } = useI18n()
  const { first, last } = firstLast(set.rows)
  const summary =
    first && last
      ? t('chart.flfpr.summary', { last: num(last.value, 1), lastLabel: last.key, first: num(first.value, 1), firstLabel: first.key })
      : ''
  return <AnnualLineCard set={set} title={t('chart.flfpr.title')} subtitle={t('chart.flfpr.sub')} decimals={1} unit="%" summary={summary} />
}

export function FertilityCard({ set }: { set: Dataset<SeriesPoint> }) {
  const { t, num } = useI18n()
  const last = set.rows.at(-1)
  const summary = last ? t('chart.fert.summary', { last: num(last.value, 2), lastLabel: last.key }) : ''
  return (
    <AnnualLineCard
      set={set}
      title={t('chart.fert.title')}
      subtitle={t('chart.fert.sub')}
      decimals={2}
      unit=""
      summary={summary}
      references={[{ y: 2.1, label: t('chart.fert.replacement') }]}
    />
  )
}

export function AgeStructureCard({ set }: { set: Dataset<SeriesPoint> }) {
  const { t, pick, num } = useI18n()
  const colors = [S1, S2, S3]
  const [young, working, old] = set.rows
  const summary =
    young && working && old
      ? t('chart.age.summary', { young: num(young.value, 1), working: num(working.value, 1), old: num(old.value, 1) })
      : ''
  const total = set.rows.reduce((sum, r) => sum + r.value, 0)
  return (
    <ChartCard
      title={t('chart.age.title')}
      subtitle={t('chart.age.sub')}
      height={150}
      empty={set.rows.length === 0}
      summary={summary}
      meta={set.meta}
      table={
        <table>
          <thead>
            <tr>
              <th scope="col">{t('chart.age.group')}</th>
              <th scope="col" className="n">
                {t('chart.age.share')}
              </th>
            </tr>
          </thead>
          <tbody>
            {set.rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{pick(r.label)}</th>
                <td className="n">{num(r.value, 1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ShareStrip
        label={summary}
        total={total}
        segments={set.rows.map((r, i) => ({
          key: r.key,
          label: pick(r.label),
          value: r.value,
          color: colors[i] ?? 'var(--series-neutral)',
          detail: `${num(r.value, 1)}%`,
        }))}
      />
    </ChartCard>
  )
}

export function OverviewCharts({ datasets, repo }: { datasets: Datasets; repo: Kpi }) {
  return (
    <>
      <GdpCard quarterly={datasets.gdpQuarterly} annual={datasets.gdpAnnual} />
      <CpiCard cpi={datasets.cpi} repo={repo} />
      <UnemploymentCard set={datasets.unemployment} />
      <UpiCard set={datasets.upi} />
      <PopulationCard set={datasets.population} />
    </>
  )
}
