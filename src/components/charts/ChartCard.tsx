import { BarChart3 } from 'lucide-react'
import { Suspense, type ReactNode } from 'react'
import type { DataMeta } from '../../domain/types'
import { useI18n, type I18n } from '../../i18n/i18n'
import { useMounted } from '../common/hooks'
import { DataFlags, DataTable, EmptyState, ExternalLink, ProvenanceTag, useStableId } from '../common/ui'

export function releasedText(meta: DataMeta, i18n: I18n): string | null {
  if (!meta.releasedAt) return null
  return meta.releasedAt.precision === 'observed'
    ? i18n.t('kpi.observed', { date: i18n.date(meta.releasedAt.date) })
    : i18n.release(meta.releasedAt)
}

export function checkedText(meta: DataMeta, i18n: I18n): string | null {
  if (!meta.checkedAt) return null
  return meta.provenance === 'release-record'
    ? i18n.t('kpi.checkedManual', { date: i18n.date(meta.checkedAt) })
    : i18n.dateTime(meta.checkedAt)
}

/** Source, release date and last-checked date — kept separate so periodic data never reads as real-time. */
export function ChartMeta({ meta }: { meta: DataMeta }) {
  const i18n = useI18n()
  const released = releasedText(meta, i18n)
  const checked = checkedText(meta, i18n)
  return (
    <div className="chart-meta">
      <ProvenanceTag provenance={meta.provenance} />
      <span>
        {i18n.t('common.source')}: <ExternalLink href={meta.source.url}>{meta.source.name}</ExternalLink>
      </span>
      {released && (
        <span>
          {i18n.t('kpi.released')}: {released}
        </span>
      )}
      {checked && (
        <span>
          {i18n.t('kpi.checked')}: {checked}
        </span>
      )}
      <DataFlags meta={meta} />
    </div>
  )
}

/**
 * Every chart is a figure with a heading, a plain-language summary, a data
 * table and its provenance. The plot itself mounts after hydration (it measures
 * the DOM), behind a skeleton of the same height so nothing shifts.
 */
export function ChartCard({
  title,
  subtitle,
  controls,
  legend,
  height,
  empty,
  summary,
  table,
  meta,
  panel,
  children,
}: {
  title: string
  subtitle?: string
  controls?: ReactNode
  legend?: ReactNode
  height: number
  empty?: boolean
  summary: string
  table: ReactNode
  meta?: DataMeta
  /** Wraps the changing content in a tabpanel when the card has tabs. */
  panel?: { id: string; labelledBy: string }
  children: ReactNode
}) {
  const { t } = useI18n()
  const mounted = useMounted()
  const titleId = useStableId('chart-title')
  const summaryId = useStableId('chart-summary')

  const skeleton = <div className="skeleton" style={{ height }} role="img" aria-label={t('chart.loading')} />
  const content = (
    <>
      {legend}
      <div className="chart-body" style={{ height }}>
        {empty ? (
          <EmptyState title={t('chart.noData')} hint={t('chart.noDataHint')} icon={<BarChart3 aria-hidden="true" />} />
        ) : mounted ? (
          <Suspense fallback={skeleton}>{children}</Suspense>
        ) : (
          skeleton
        )}
      </div>
      {!empty && (
        <p id={summaryId} className="chart-summary">
          {summary}
        </p>
      )}
      {!empty && <DataTable label={title}>{table}</DataTable>}
    </>
  )

  return (
    <figure className="card chart-card" aria-labelledby={titleId} aria-describedby={empty ? undefined : summaryId}>
      <figcaption className="chart-head">
        <div>
          <h3 id={titleId}>{title}</h3>
          {subtitle && <p className="chart-sub">{subtitle}</p>}
        </div>
        {controls}
      </figcaption>
      {panel ? (
        <div role="tabpanel" id={panel.id} aria-labelledby={panel.labelledBy} className="tabpanel">
          {content}
        </div>
      ) : (
        content
      )}
      {meta && <ChartMeta meta={meta} />}
    </figure>
  )
}

export function Legend({ items }: { items: { label: string; color: string; kind?: 'box' | 'line' | 'hatch' }[] }) {
  return (
    <ul className="legend">
      {items.map((item) => (
        <li key={item.label}>
          <span
            aria-hidden="true"
            className={`swatch ${item.kind === 'line' ? 'swatch-line' : ''} ${item.kind === 'hatch' ? 'swatch-hatch' : ''}`}
            style={item.kind === 'hatch' ? { color: item.color } : { background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
