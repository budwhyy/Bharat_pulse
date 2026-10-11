import { useEffect, useRef, useState } from 'react'
import { STATES, GRID_COLS, GRID_ROWS } from '../../domain/states'
import type { AlertView, ClusterView, DashboardSnapshot, SourceView } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'
import { safeStorage } from '../../preferences/storage'
import { useNow } from '../common/hooks'

export function useLastVisit(): number | null {
  const [previous, setPrevious] = useState<number | null>(null)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const storage = safeStorage()
    try {
      const value = Number(storage?.getItem('bharat-pulse:last-visit'))
      if (value > 0 && value <= Date.now()) setPrevious(value)
      storage?.setItem('bharat-pulse:last-visit', String(Date.now()))
    } catch { /* A private or blocked store simply uses the first-visit window. */ }
    const save = () => { try { storage?.setItem('bharat-pulse:last-visit', String(Date.now())) } catch { /* optional */ } }
    window.addEventListener('pagehide', save)
    return () => window.removeEventListener('pagehide', save)
  }, [])
  return previous
}

export function FreshnessStrip({ sources, onOpenSources }: { sources: SourceView[]; onOpenSources: () => void }) {
  const { t, age, dateTime } = useI18n()
  const now = useNow()
  const live = sources.filter((s) => s.health === 'ok').length
  const checked = sources.flatMap((s) => s.lastSuccessAt ? [s.lastSuccessAt] : []).sort().at(-1)
  return <button type="button" className="freshness-strip" data-partial={live < sources.length && live > 0} onClick={onOpenSources} title={checked ? dateTime(checked) : undefined}>
    <span>{checked ? t('status.updated', { time: age(checked, now) }) : t('status.never')}</span>
    <span> · {t('pulse.liveSources', { live, total: sources.length })} <span aria-hidden="true">↗</span></span>
  </button>
}

export function IndiaTileMap({ counts, alerts, selected, onSelect, pinnedAlerts = [] }: { counts: Record<string, number>; alerts: AlertView[]; selected: string; onSelect: (code: string) => void; pinnedAlerts?: AlertView[] }) {
  const { t, pick } = useI18n()
  const maximum = Math.max(1, ...Object.values(counts))
  return <section className="pulse-map" aria-labelledby="map-heading">
    <div className="pulse-map-heading"><h2 id="map-heading">{t('pulse.map')}</h2><span>{t('pulse.mapLegend')}</span></div>
    <div className="map-body"><div className="tile-grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 24px)` }}>
      {STATES.map((state) => {
        const count = counts[state.code] ?? 0
        const warning = alerts.some((a) => a.states.includes(state.code))
        const level = count === 0 ? 0 : Math.max(1, Math.ceil(count / maximum * 3))
        const label = `${pick(state.name)}: ${t('pulse.stateCount', { count })}${warning ? ` · ${t('pulse.officialAlert')}` : ''}`
        return <button key={state.code} type="button" className="state-tile" data-level={level} aria-label={label} title={label}
          aria-pressed={selected === state.code} onClick={() => onSelect(selected === state.code ? '' : state.code)}
          style={{ gridColumn: state.col + 1, gridRow: state.row + 1 }}>
          {state.code}{warning && <span className="map-alert-dot" aria-hidden="true">●</span>}
        </button>
      })}
    </div>
    <div className="map-controls"><label className="state-filter"><span className="sr-only">{t('pulse.stateFilter')}</span>
      <select value={selected} onChange={(e) => onSelect(e.target.value)}>
        <option value="">{t('pulse.allStates')}</option>
        {STATES.map((s) => <option key={s.code} value={s.code}>{pick(s.name)} · {counts[s.code] ?? 0}{alerts.some((a) => a.states.includes(s.code)) ? ` · ${t('pulse.officialAlert')}` : ''}</option>)}
      </select>
    </label>
      <p className="map-disclaimer">{t('pulse.cartogram')}</p>
      <AlertCard alerts={pinnedAlerts} />
    </div></div>
  </section>
}

export function DeltaChips({ snapshot, previous }: { snapshot: DashboardSnapshot; previous: number | null }) {
  const { t, lang, num, date } = useI18n()
  const now = useNow().getTime()
  const cutoff = previous === null ? now - 3 * 3600_000 : Math.max(previous, now - 24 * 3600_000)
  const stories = snapshot.pulse.clusterTimes[lang].filter((at) => at > cutoff && at <= now).length
  const alertSource = snapshot.sources.find((s) => s.id === 'ndma-sachet')
  const alerts = snapshot.alerts.filter((a) => Date.parse(a.at) > cutoff && Date.parse(a.at) <= now).length
  return <section className="pulse-delta" aria-label={t('pulse.changes')}>
    <p>{t(previous === null ? 'pulse.last3h' : now - previous > 24 * 3600_000 ? 'pulse.last24h' : 'pulse.since')}</p>
    <ul className="delta-chips">
      <li>{t('pulse.newStories', { count: stories })}</li>
      <li>{alertSource?.health === 'ok' ? t('pulse.alertCount', { count: alerts }) : t('pulse.alertsUnavailable')}</li>
      <li><a href="#pulse-indicators">{snapshot.aqi.cities.length ? `${t('pulse.aqiAvailable')} · ${t(`health.${snapshot.aqi.meta?.health ?? 'pending'}`)}` : t(snapshot.aqi.enabled ? 'pulse.aqiUnavailable' : snapshot.aqi.unavailableReason === 'needs-verification' ? 'pulse.aqiNeedsVerification' : 'pulse.aqiNeedsKey')}</a></li>
      <li><a href="#pulse-indicators">{snapshot.fx ? `${t('pulse.fxChip', { value: num(snapshot.fx.value, 2) })} · ${date(snapshot.fx.date)} IST${snapshot.fx.meta.health !== 'ok' ? ` · ${t(`health.${snapshot.fx.meta.health}`)}` : ''}` : t('pulse.fxUnavailable')}</a></li>
    </ul>
  </section>
}

export function ClusterCard({ cluster }: { cluster: ClusterView }) {
  const { t, pick, dateTime } = useI18n()
  const first = cluster.outlets[0]!
  const copies = cluster.outlets.length - cluster.independent
  return <article className="cluster-card" lang={cluster.lang}>
    <div className="cluster-eyebrow"><span>{t(`category.${cluster.category}`)}</span><span>{t(`pulse.verify.${cluster.verification}`)}</span></div>
    <h3><a href={first.url} target="_blank" rel="noopener noreferrer">{cluster.headline}<span className="sr-only"> ({t('updates.newTab')})</span></a></h3>
    <div className="coverage-bar">
      <span>{t('pulse.outlets', { count: cluster.outlets.length })}</span><span>{t(cluster.lang === 'en' ? 'pulse.english' : 'pulse.hindi')}</span>
      {copies > 0 && <span>{t('pulse.collapsed', { count: copies })}</span>}
      {cluster.outlets.length === 1 && <span>{t('pulse.singleOutlet')}</span>}
    </div>
    <p className="cluster-time">{t('pulse.earliest')} <time dateTime={cluster.firstReportedAt}>{dateTime(cluster.firstReportedAt)}</time>{cluster.stale && <span className="pulse-stale"> · {t('updates.staleItem')}</span>}</p>
    <details><summary>{t('pulse.compare')}</summary><ul className="headline-comparison">
      {cluster.outlets.map((outlet) => <li key={outlet.sourceId}><a href={outlet.url} target="_blank" rel="noopener noreferrer"><strong>{pick(outlet.name)}</strong> — {outlet.title}<span className="sr-only"> ({t('updates.newTab')})</span></a><small>{dateTime(outlet.at)} · {t('pulse.copyGroup', { count: outlet.group + 1 })}</small></li>)}
    </ul></details>
  </article>
}

export function AlertCard({ alerts }: { alerts: AlertView[] }) {
  const { t, dateTime } = useI18n()
  if (!alerts.length) return null
  return <aside className="official-alerts" aria-label={t('pulse.officialAlert')}><details>
    <summary>{t('pulse.officialAlert')} · {alerts.length}{alerts.some((a) => a.stale) ? ` · ${t('health.stale')}` : ''}</summary>
    <ul>{alerts.map((a) => <li key={a.id}><a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a><p>{a.authority} · {dateTime(a.at)}</p></li>)}</ul>
  </details></aside>
}

export function PulseIndicators({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { t, num, date, dateTime } = useI18n()
  const { fx, aqi } = snapshot
  return <section className="panel pulse-indicators" id="pulse-indicators" aria-labelledby="pulse-indicators-heading">
    <h2 id="pulse-indicators-heading">{t('pulse.indicators')}</h2>
    <div className="pulse-indicator-grid">
      <article className="card"><h3>{t('pulse.fxTitle')}</h3>
        {fx ? <><p className="reference-value">₹{num(fx.value, 4)} <span>{t('pulse.perUsd')}</span></p><p>{date(fx.date)} · {t('cadence.daily')} · IST</p>
          <p>{t('pulse.previous', { value: fx.previous === null ? '—' : num(fx.previous, 4) })}</p>
          <p>{t('pulse.checked', { time: fx.meta.checkedAt ? dateTime(fx.meta.checkedAt) : '—' })} · {t(`health.${fx.meta.health}`)}</p>
          <details><summary>{t('pulse.rateHistory')}</summary><table><caption>{t('pulse.fxTitle')}</caption><thead><tr><th scope="col">{t('pulse.businessDay')}</th><th scope="col">{t('pulse.perUsd')}</th></tr></thead><tbody>{fx.series.map((p) => <tr key={p.date}><th scope="row">{date(p.date)} IST</th><td>{num(p.value, 4)}</td></tr>)}</tbody></table></details>
          <a href={fx.meta.source.url} target="_blank" rel="noopener noreferrer">{fx.meta.source.name}</a></> : <p>{t('pulse.fxUnavailable')}</p>}
      </article>
      <article className="card"><h3>{t('pulse.aqiTitle')}</h3><p>{t('pulse.aqiDerived')}</p>
        {aqi.cities.length ? <><ul>{aqi.cities.map((c) => <li key={c.city}><strong>{t(`pulse.city.${c.city as 'Delhi' | 'Mumbai' | 'Kolkata' | 'Bengaluru'}`)} {num(c.aqi)}</strong> · {t(`pulse.band.${c.band}`)}<p>{dateTime(c.at)} · {t('pulse.stations', { count: c.stations })}</p></li>)}</ul><p>{t(`health.${aqi.meta?.health ?? 'pending'}`)}</p></> : <><p>{t(aqi.enabled ? 'pulse.aqiUnavailable' : aqi.unavailableReason === 'needs-verification' ? 'pulse.aqiNeedsVerification' : 'pulse.aqiNeedsKey')}</p><p>{t('pulse.aqiGate')}</p></>}
      </article>
    </div>
  </section>
}
