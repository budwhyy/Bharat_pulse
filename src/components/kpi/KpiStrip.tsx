import { KPI_ORDER, type Kpi, type KpiId, type Unit } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'
import { checkedText, releasedText } from '../charts/ChartCard'
import { DataFlags, ExternalLink, ProvenanceTag } from '../common/ui'
import { KpiPillars } from './KpiPillars'

function unitText(unit: Unit, t: ReturnType<typeof useI18n>['t']): string {
  if (unit === 'percent') return '%'
  return t(unit === 'billion-transactions' ? 'kpi.unit.bnTransactions' : 'kpi.unit.bnPeople')
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  const i18n = useI18n()
  const { t, pick, num } = i18n
  const released = releasedText(kpi.meta, i18n)
  const checked = checkedText(kpi.meta, i18n)
  const labelId = `kpi-${kpi.id}`
  return (
    <li className="card kpi" aria-labelledby={labelId}>
      <h3 id={labelId} className="kpi-label">
        {t(`kpi.${kpi.id}`)}
      </h3>
      <p className="kpi-value">
        {kpi.value == null ? (
          <span>{t('kpi.unavailable')}</span>
        ) : (
          <>
            <span>{num(kpi.value, kpi.decimals)}</span>
            <span className="kpi-unit">{unitText(kpi.unit, t)}</span>
          </>
        )}
      </p>
      {kpi.note && <p className="kpi-note">{pick(kpi.note)}</p>}
      <KpiPillars kpi={kpi} format={(v) => `${num(v, kpi.decimals)}${kpi.unit === 'percent' ? '%' : ''}`} />
      <p className="kpi-period">
        {pick(kpi.period)} · {t(`cadence.${kpi.meta.cadence}`)}
      </p>
      <div className="kpi-flags">
        <ProvenanceTag provenance={kpi.meta.provenance} />
        <DataFlags meta={kpi.meta} />
      </div>
      <dl className="kpi-meta">
        <dt>{t('kpi.released')}</dt>
        <dd>{released ?? '—'}</dd>
        <dt>{t('kpi.checked')}</dt>
        <dd>{checked ?? '—'}</dd>
        <dt>{t('common.source')}</dt>
        <dd>
          <ExternalLink href={kpi.meta.source.url}>{kpi.meta.source.name}</ExternalLink>
        </dd>
      </dl>
    </li>
  )
}

export function KpiStrip({ kpis, ids = KPI_ORDER, headingId }: { kpis: Record<KpiId, Kpi>; ids?: readonly KpiId[]; headingId: string }) {
  const { t } = useI18n()
  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-head">
        <h2 id={headingId}>{t('kpi.heading')}</h2>
      </div>
      <ul className="kpi-grid">
        {ids.map((id) => (
          <KpiTile key={id} kpi={kpis[id]} />
        ))}
      </ul>
    </section>
  )
}
