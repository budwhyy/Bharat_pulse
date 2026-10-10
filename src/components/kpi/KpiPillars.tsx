import { RotateCcw } from 'lucide-react'
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import type { Comparison, Kpi } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'

const VIEW = { tilt: 16, turn: -26 }
const TILT = { min: -5, max: 55 }
const TURN = { min: -75, max: 75 }
const MAX_H = 60
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface Pillar {
  key: string
  label: string
  value: number
  kind: Comparison['kind'] | 'headline'
}

const COLOR: Record<Pillar['kind'], string> = {
  headline: 'var(--accent)',
  component: 'var(--series-1)',
  previous: 'var(--series-neutral)',
  target: 'var(--ink-2)',
}

/**
 * The headline value as a 3D block beside its real reference points (previous
 * period, components); a target is a dashed line. Drag, or use the arrow keys,
 * to turn and tilt; reset appears once the view has moved. Values are printed
 * flat underneath so they stay legible at any angle.
 */
export function KpiPillars({ kpi, format }: { kpi: Kpi; format: (v: number) => string }) {
  const { t, pick } = useI18n()
  const [view, setView] = useState(VIEW)
  const [hover, setHover] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; tilt: number; turn: number } | null>(null)
  if (kpi.value == null) return null

  const pillars: Pillar[] = [
    { key: 'now', label: t('kpi.pillars.now'), value: kpi.value, kind: 'headline' },
    ...kpi.comparisons
      .filter((c) => c.kind !== 'target')
      .map((c, i) => ({ key: `c${i}`, label: pick(c.label), value: c.value, kind: c.kind })),
  ]
  const targets = kpi.comparisons.filter((c) => c.kind === 'target')
  const max = Math.max(...pillars.map((p) => p.value), ...targets.map((c) => c.value)) || 1
  const height = (v: number) => Math.max(4, (v / max) * MAX_H)
  const slot = 100 / pillars.length
  const moved = view.tilt !== VIEW.tilt || view.turn !== VIEW.turn

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, ...view }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) + Math.abs(dy) < 4) return
    setView({
      turn: clamp(start.turn + dx * 0.5, TURN.min, TURN.max),
      tilt: clamp(start.tilt - dy * 0.4, TILT.min, TILT.max),
    })
  }
  const endDrag = () => {
    drag.current = null
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 15 : 5
    if (e.key === 'ArrowLeft') setView((v) => ({ ...v, turn: clamp(v.turn - step, TURN.min, TURN.max) }))
    else if (e.key === 'ArrowRight') setView((v) => ({ ...v, turn: clamp(v.turn + step, TURN.min, TURN.max) }))
    else if (e.key === 'ArrowUp') setView((v) => ({ ...v, tilt: clamp(v.tilt + step, TILT.min, TILT.max) }))
    else if (e.key === 'ArrowDown') setView((v) => ({ ...v, tilt: clamp(v.tilt - step, TILT.min, TILT.max) }))
    else if (e.key === 'Home') setView(VIEW)
    else return
    e.preventDefault()
  }

  const describe = [
    `${t(`kpi.${kpi.id}`)}: ${format(kpi.value)} (${pick(kpi.period)})`,
    ...kpi.comparisons.map((c) => `${pick(c.label)} ${format(c.value)}`),
  ].join('; ')

  return (
    <div className="pillars">
      <div
        className="pillars-stage"
        role="img"
        tabIndex={0}
        aria-label={`${describe}. ${t('kpi.pillars.keys')}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          endDrag()
          setHover(null)
        }}
        onKeyDown={onKeyDown}
      >
        <div className="pillars-scene" style={{ transform: `rotateX(${view.tilt}deg) rotateY(${view.turn}deg)` }}>
          <div className="pillars-floor" />
          {targets.map((c) => (
            <div key={c.label.en} className="pillars-target" style={{ bottom: height(c.value) }} />
          ))}
          {pillars.map((p, i) => (
            <div
              key={p.key}
              className={`cuboid ${hover && hover !== p.key ? 'is-dim' : ''}`}
              style={
                {
                  left: `calc(${slot * (i + 0.5)}% - var(--w) / 2)`,
                  '--h': `${height(p.value)}px`,
                  '--c': COLOR[p.kind],
                  animationDelay: `${i * 90}ms`,
                } as CSSProperties
              }
              onPointerEnter={() => setHover(p.key)}
              onPointerLeave={() => setHover(null)}
            >
              <span className="face front" />
              <span className="face back" />
              <span className="face left" />
              <span className="face right" />
              <span className="face top" />
            </div>
          ))}
        </div>
      </div>
      {moved && (
        <button type="button" className="pillars-reset" aria-label={t('politics.hemi.reset')} onClick={() => setView(VIEW)}>
          <RotateCcw aria-hidden="true" />
        </button>
      )}
      <ul className="pillars-values" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${pillars.length}, 1fr)` }}>
        {pillars.map((p) => (
          <li key={p.key} className={`${p.kind === 'headline' ? 'is-now' : ''} ${hover === p.key ? 'is-hover' : ''}`}>
            <strong className="num">{format(p.value)}</strong>
            <span>{p.label}</span>
          </li>
        ))}
      </ul>
      {targets.length > 0 && (
        <p className="pillars-legend" aria-hidden="true">
          {targets.map((c) => (
            <span key={c.label.en}>
              <span className="pillars-legend-line" />
              {pick(c.label)} {format(c.value)}
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
