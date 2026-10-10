import { ArrowDownRight, ArrowUpRight, Eye, Info, Minus } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { RISKS, RISK_ASSESSED, type Risk, type RiskTrend } from '../../data/context'
import { useI18n } from '../../i18n/i18n'
import { ExternalLink } from '../common/ui'

type Level = 'low' | 'medium' | 'high' | 'critical'

export function riskLevel(score: number): Level {
  if (score >= 15) return 'critical'
  if (score >= 10) return 'high'
  if (score >= 5) return 'medium'
  return 'low'
}

const TREND_ICON: Record<RiskTrend, typeof ArrowUpRight> = {
  rising: ArrowUpRight,
  easing: ArrowDownRight,
  stable: Minus,
  watch: Eye,
}

/** Trend is carried by icon and text; colour only reinforces it. */
export function Trend({ trend }: { trend: RiskTrend }) {
  const { t } = useI18n()
  const Icon = TREND_ICON[trend]
  return (
    <span className={`trend trend-${trend}`}>
      <Icon aria-hidden="true" />
      {t(`risks.trend.${trend}`)}
    </span>
  )
}

function RiskMatrix({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  const { t, pick } = useI18n()
  const markers = useRef<Array<HTMLButtonElement | null>>([])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = RISKS.length - 1
    let next: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    if (next === null) return
    event.preventDefault()
    onSelect(next)
    markers.current[next]?.focus()
  }

  const cells = []
  for (let likelihood = 5; likelihood >= 1; likelihood--) {
    cells.push(
      <div key={`y${likelihood}`} className="matrix-axis" aria-hidden="true">
        {likelihood}
      </div>,
    )
    for (let impact = 1; impact <= 5; impact++) {
      const here = RISKS.map((risk, index) => ({ risk, index })).filter(
        ({ risk }) => risk.likelihood === likelihood && risk.impact === impact,
      )
      cells.push(
        <div key={`${likelihood}-${impact}`} className="matrix-cell" data-level={riskLevel(likelihood * impact)}>
          {here.map(({ risk, index }) => (
            <button
              key={risk.id}
              ref={(el) => {
                markers.current[index] = el
              }}
              type="button"
              className="risk-marker"
              aria-pressed={index === selected}
              tabIndex={index === selected ? 0 : -1}
              aria-label={t('risks.marker', {
                index: index + 1,
                name: pick(risk.name),
                likelihood: risk.likelihood,
                impact: risk.impact,
                score: risk.likelihood * risk.impact,
                trend: t(`risks.trend.${risk.trend}`),
              })}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {index + 1}
            </button>
          ))}
        </div>,
      )
    }
  }
  cells.push(<div key="corner" aria-hidden="true" />)
  for (let impact = 1; impact <= 5; impact++) {
    cells.push(
      <div key={`x${impact}`} className="matrix-axis" aria-hidden="true">
        {impact}
      </div>,
    )
  }

  return (
    <div className="card matrix-card">
      <div className="panel-head" style={{ marginBottom: 12 }}>
        <h2 id="matrix-heading">{t('risks.matrix.heading')}</h2>
        <p id="matrix-help">{t('risks.matrix.help')}</p>
      </div>
      <div
        className="matrix"
        role="group"
        aria-label={t('risks.matrix.label', { count: RISKS.length })}
        aria-describedby="matrix-help"
      >
        {cells}
      </div>
      <div className="matrix-labels" aria-hidden="true">
        <span>← {t('risks.impact')} →</span>
        <span>
          ↑ {t('risks.likelihood')} · {t('risks.scale')}
        </span>
      </div>
      <ul className="level-legend">
        {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
          <li key={level}>
            <span className="swatch" data-level={level} aria-hidden="true" />
            {t(`risks.level.${level}`)}
          </li>
        ))}
      </ul>
    </div>
  )
}

function RiskDetail({ risk, index }: { risk: Risk; index: number }) {
  const { t, pick } = useI18n()
  const score = risk.likelihood * risk.impact
  return (
    <div className="card risk-detail" aria-live="polite" aria-atomic="true">
      <p className="fine-print">{t('risks.selected')}</p>
      <div className="risk-detail-body" key={risk.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3>
          {index + 1}. {pick(risk.name)}
        </h3>
        <dl>
          <div>
            <dt>{t('risks.likelihood')}</dt>
            <dd>{risk.likelihood}/5</dd>
          </div>
          <div>
            <dt>{t('risks.impact')}</dt>
            <dd>{risk.impact}/5</dd>
          </div>
          <div>
            <dt>{t('risks.score')}</dt>
            <dd>
              {score} <span className="fine-print">({t(`risks.level.${riskLevel(score)}`)})</span>
            </dd>
          </div>
          <div>
            <dt>{t('risks.trend')}</dt>
            <dd style={{ fontSize: 14 }}>
              <Trend trend={risk.trend} />
            </dd>
          </div>
        </dl>
        <div>
          <p className="fine-print">{t('risks.why')}</p>
          <p>{pick(risk.why)}</p>
        </div>
        {risk.source && (
          <p className="fine-print">
            {t('common.source')}: <ExternalLink href={risk.source.url}>{risk.source.name}</ExternalLink>
          </p>
        )}
      </div>
    </div>
  )
}

function RiskRegister({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  const { t, pick } = useI18n()
  return (
    <section className="panel" aria-labelledby="register-heading">
      <div className="panel-head">
        <h2 id="register-heading">{t('risks.register.heading')}</h2>
      </div>
      <div
        className="table-scroll card"
        role="region"
        aria-label={`${t('risks.register.heading')} — ${t('chart.table')}`}
        tabIndex={0}
        style={{ marginTop: 0 }}
      >
        <table className="risk-table">
          <thead>
            <tr>
              <th scope="col">{t('risks.register.heading')}</th>
              <th scope="col" className="n">
                {t('risks.likelihood')}
              </th>
              <th scope="col" className="n">
                {t('risks.impact')}
              </th>
              <th scope="col" className="n">
                {t('risks.score')}
              </th>
              <th scope="col">{t('risks.trend')}</th>
            </tr>
          </thead>
          <tbody>
            {RISKS.map((risk, index) => {
              const score = risk.likelihood * risk.impact
              return (
                <tr key={risk.id} className={index === selected ? 'is-selected' : undefined}>
                  <th scope="row">
                    <button
                      type="button"
                      className="row-btn"
                      aria-pressed={index === selected}
                      onClick={() => onSelect(index)}
                    >
                      <span className="idx" aria-hidden="true">
                        {index + 1}
                      </span>
                      <span>{pick(risk.name)}</span>
                    </button>
                  </th>
                  <td className="n">{risk.likelihood}</td>
                  <td className="n">{risk.impact}</td>
                  <td className="n">
                    {score} <span className="fine-print">{t(`risks.level.${riskLevel(score)}`)}</span>
                  </td>
                  <td>
                    <Trend trend={risk.trend} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function RisksSection() {
  const { t, date } = useI18n()
  const [selected, setSelected] = useState(0)
  return (
    <>
      <div className="alert alert-info" role="note">
        <Info aria-hidden="true" />
        <div>
          <strong>{t('risks.banner.title')}</strong>
          {t('risks.banner.body', { date: date(`${RISK_ASSESSED}T12:00:00+05:30`) })}
        </div>
      </div>
      <section className="panel" aria-labelledby="matrix-heading">
        <div className="risk-layout">
          <RiskMatrix selected={selected} onSelect={setSelected} />
          <RiskDetail risk={RISKS[selected]!} index={selected} />
        </div>
      </section>
      <RiskRegister selected={selected} onSelect={setSelected} />
    </>
  )
}
