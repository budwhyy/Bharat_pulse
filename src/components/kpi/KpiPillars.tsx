import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Comparison, Kpi } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'

const W = 160
const H = 70
const BASE = 62
const DEPTH = 7
const TILT = { min: 0, max: 60, initial: 40 }
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface Pillar {
  key: string
  label: string
  value: number
  headline: boolean
  kind: Comparison['kind'] | 'headline'
}

/**
 * Small 3D pillar chart for a headline indicator: the current value beside its
 * real reference points (previous period, components); a target is a dashed
 * line. Drag or use the arrow keys to tilt; hover or tap a pillar for its
 * value. The tile's text carries the same numbers.
 */
export function KpiPillars({ kpi, format }: { kpi: Kpi; format: (v: number) => string }) {
  const { t, pick } = useI18n()
  const [tilt, setTilt] = useState(TILT.initial)
  const [hover, setHover] = useState<Pillar | null>(null)
  const drag = useRef<{ y: number; tilt: number } | null>(null)
  if (kpi.value == null) return null

  const pillars: Pillar[] = [
    { key: 'now', label: pick(kpi.period), value: kpi.value, headline: true, kind: 'headline' },
    ...kpi.comparisons
      .filter((c) => c.kind !== 'target')
      .map((c, i) => ({ key: `c${i}`, label: pick(c.label), value: c.value, headline: false, kind: c.kind })),
  ]
  const targets = kpi.comparisons.filter((c) => c.kind === 'target')
  const max = Math.max(...pillars.map((p) => p.value), ...targets.map((c) => c.value)) || 1
  // Bars start at zero; a floor of 10% keeps tiny values visible.
  const scaleY = (v: number) => BASE - Math.max(4, (v / max) * (BASE - 14))
  const slot = W / pillars.length
  const barW = Math.min(34, slot * 0.5)

  const pillarAt = (target: EventTarget) => {
    const key = (target as Element).getAttribute?.('data-pillar')
    return pillars.find((p) => p.key === key) ?? null
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { y: e.clientY, tilt }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    if (start && Math.abs(e.clientY - start.y) > 4) {
      setTilt(clamp(start.tilt - (e.clientY - start.y) * 0.4, TILT.min, TILT.max))
      return
    }
    if (!start) setHover(pillarAt(e.target))
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    drag.current = null
    if (start && Math.abs(e.clientY - start.y) <= 4) setHover(pillarAt(e.target))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp') setTilt((v) => clamp(v + 5, TILT.min, TILT.max))
    else if (e.key === 'ArrowDown') setTilt((v) => clamp(v - 5, TILT.min, TILT.max))
    else if (e.key === 'Home') setTilt(TILT.initial)
    else return
    e.preventDefault()
  }

  const describe = [
    `${t(`kpi.${kpi.id}`)}: ${format(kpi.value)} (${pick(kpi.period)})`,
    ...kpi.comparisons.map((c) => `${pick(c.label)} ${format(c.value)}`),
  ].join('; ')

  return (
    <div
      className="pillars"
      role="img"
      tabIndex={0}
      aria-label={`${describe}. ${t('kpi.pillars.keys')}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      onPointerLeave={() => {
        drag.current = null
        setHover(null)
      }}
      onKeyDown={onKeyDown}
    >
      <div className="pillars-plane" style={{ transform: `rotateX(${tilt}deg)` }}>
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <rect x="0" y={BASE} width={W} height={DEPTH + 4} rx="2" className="pillars-floor" />
          {targets.map((c) => (
            <g key={c.label.en}>
              <line x1="4" x2={W - 4} y1={scaleY(c.value)} y2={scaleY(c.value)} className="pillars-target" />
              <text x={W - 4} y={scaleY(c.value) - 2} textAnchor="end" className="pillars-target-label">
                {pick(c.label)} {format(c.value)}
              </text>
            </g>
          ))}
          {pillars.map((p, i) => {
            const x = slot * i + (slot - barW) / 2
            const y = scaleY(p.value)
            const fill = p.headline ? 'var(--accent)' : p.kind === 'component' ? 'var(--series-1)' : 'var(--series-neutral)'
            const dim = hover && hover !== p
            return (
              <g key={p.key} opacity={dim ? 0.45 : 1} data-pillar={p.key}>
                {/* side (extrusion), then front face */}
                <path
                  d={`M${x + barW},${y} l${DEPTH},-${DEPTH} v${BASE - y} l-${DEPTH},${DEPTH} z`}
                  fill={fill}
                  data-pillar={p.key}
                />
                <path
                  d={`M${x + barW},${y} l${DEPTH},-${DEPTH} v${BASE - y} l-${DEPTH},${DEPTH} z`}
                  fill="#000"
                  opacity="0.35"
                  data-pillar={p.key}
                />
                <path d={`M${x},${y} l${DEPTH},-${DEPTH} h${barW} l-${DEPTH},${DEPTH} z`} fill={fill} data-pillar={p.key} />
                <path d={`M${x},${y} l${DEPTH},-${DEPTH} h${barW} l-${DEPTH},${DEPTH} z`} fill="#fff" opacity="0.28" data-pillar={p.key} />
                <rect x={x} y={y} width={barW} height={BASE - y} fill={fill} className="pillar-face" data-pillar={p.key} />
              </g>
            )
          })}
        </svg>
      </div>
      <ul className="pillars-labels" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${pillars.length}, 1fr)` }}>
        {pillars.map((p) => (
          <li key={p.key} className={p.headline ? 'is-now' : undefined}>
            {p.headline ? t('kpi.pillars.now') : p.label}
          </li>
        ))}
      </ul>
      {hover && (
        <p className="pillars-tip" aria-hidden="true">
          <strong>{format(hover.value)}</strong> {hover.label}
        </p>
      )}
    </div>
  )
}
