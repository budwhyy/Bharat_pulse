import { Move3d, RotateCcw } from 'lucide-react'
import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useI18n } from '../../i18n/i18n'

export interface HemicycleBloc {
  id: string
  label: string
  seats: number
  color: string
}

export interface Seat {
  x: number
  y: number
  angle: number
  row: number
}

const CX = 100
const CY = 100
const R_INNER = 34
const R_OUTER = 92

/**
 * Parliament-diagram layout: rows of a half-annulus, seats per row proportional
 * to the row's radius, then ordered left → right by angle so blocs fill wedges.
 */
export function layoutSeats(total: number): { seats: Seat[]; seatR: number } {
  let best: { rows: number; score: number } = { rows: 4, score: Infinity }
  for (let rows = 4; rows <= 16; rows++) {
    const gap = (R_OUTER - R_INNER) / (rows - 1)
    const radii = Array.from({ length: rows }, (_, i) => R_INNER + gap * i)
    const sum = radii.reduce((a, b) => a + b, 0)
    const outerSeats = (total * R_OUTER) / sum
    const spacing = (Math.PI * R_OUTER) / Math.max(outerSeats - 1, 1)
    const score = Math.abs(spacing - gap)
    if (score < best.score) best = { rows, score }
  }
  const rows = best.rows
  const gap = (R_OUTER - R_INNER) / (rows - 1)
  const radii = Array.from({ length: rows }, (_, i) => R_INNER + gap * i)
  const sum = radii.reduce((a, b) => a + b, 0)
  const perRow = radii.map((r) => Math.max(2, Math.round((total * r) / sum)))
  perRow[rows - 1]! += total - perRow.reduce((a, b) => a + b, 0)

  const seats: Seat[] = []
  radii.forEach((r, row) => {
    const n = perRow[row]!
    for (let k = 0; k < n; k++) {
      const angle = Math.PI - (k * Math.PI) / (n - 1)
      seats.push({ x: CX + r * Math.cos(angle), y: CY - r * Math.sin(angle), angle, row })
    }
  })
  // Left (π) to right (0); within the same angle, inner rows first.
  seats.sort((a, b) => b.angle - a.angle || a.row - b.row)
  const minSpacing = Math.min(...radii.map((r, i) => (Math.PI * r) / (perRow[i]! - 1)))
  return { seats, seatR: Math.min(gap, minSpacing) * 0.42 }
}

/** Stage + controls + legend; ChartCard reserves this height so nothing shifts on mount. */
export const HEMICYCLE_HEIGHT = 330

const TILT = { min: 0, max: 64, initial: 48 }
const SPIN = { min: -35, max: 35, initial: 0 }
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Interactive 3D hemicycle. Drag (or use the arrow keys on the chamber, or the
 * sliders) to tilt and turn it; choose a bloc in the legend to highlight its
 * seats; hover or tap a seat for its bloc. Seat-level detail is visual only —
 * the summary, legend and data table carry the same numbers as text.
 */
export function Hemicycle({
  blocs,
  total,
  majority,
  label,
}: {
  blocs: HemicycleBloc[]
  total: number
  majority: number
  label: string
}) {
  const { t, num } = useI18n()
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const { seats, seatR } = useMemo(() => layoutSeats(total), [total])
  const [tilt, setTilt] = useState(TILT.initial)
  const [spin, setSpin] = useState(SPIN.initial)
  const [focus, setFocus] = useState<string | null>(null)
  const [hover, setHover] = useState<{ bloc: HemicycleBloc; seat: number } | null>(null)
  const drag = useRef<{ x: number; y: number; tilt: number; spin: number } | null>(null)

  // Seat index → bloc, in left-to-right order.
  const owner = useMemo(() => {
    const list: HemicycleBloc[] = []
    for (const bloc of blocs) for (let i = 0; i < bloc.seats; i++) list.push(bloc)
    return list
  }, [blocs])

  // Radial majority line between seat (majority-1) and seat majority.
  const a = seats[majority - 1]?.angle ?? Math.PI / 2
  const b = seats[majority]?.angle ?? a
  const majorityAngle = (a + b) / 2
  const line = (r: number) => ({ x: CX + r * Math.cos(majorityAngle), y: CY - r * Math.sin(majorityAngle) })
  const lineIn = line(R_INNER - 6)
  const lineOut = line(R_OUTER + 5)

  const seatAt = (target: EventTarget) => {
    const raw = (target as Element).getAttribute?.('data-seat')
    const index = raw == null ? NaN : Number(raw)
    return Number.isFinite(index) && owner[index] ? { bloc: owner[index]!, seat: index + 1 } : null
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, tilt, spin }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    // Below a few pixels it's a tap or hover, not a drag.
    if (start && Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) > 4) {
      setSpin(clamp(start.spin + (e.clientX - start.x) * 0.25, SPIN.min, SPIN.max))
      setTilt(clamp(start.tilt - (e.clientY - start.y) * 0.3, TILT.min, TILT.max))
      return
    }
    if (!start) setHover(seatAt(e.target))
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    drag.current = null
    // A tap on a seat shows its bloc (touch screens have no hover).
    if (start && Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) <= 4) setHover(seatAt(e.target))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 4
    if (e.key === 'ArrowLeft') setSpin((s) => clamp(s - step, SPIN.min, SPIN.max))
    else if (e.key === 'ArrowRight') setSpin((s) => clamp(s + step, SPIN.min, SPIN.max))
    else if (e.key === 'ArrowUp') setTilt((v) => clamp(v + step, TILT.min, TILT.max))
    else if (e.key === 'ArrowDown') setTilt((v) => clamp(v - step, TILT.min, TILT.max))
    else if (e.key === 'Home') {
      setTilt(TILT.initial)
      setSpin(SPIN.initial)
    } else return
    e.preventDefault()
  }

  const shown = hover?.bloc ?? blocs.find((bl) => bl.id === focus) ?? null

  return (
    <div className="hemi">
      <div className="hemi-wrap">
      <div
        className="hemi-stage"
        role="img"
        tabIndex={0}
        aria-label={`${label} ${t('politics.hemi.keys')}`}
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
        <div className="hemi-plane" style={{ transform: `rotateX(${tilt}deg) rotateZ(${spin}deg)` }}>
          <svg viewBox="0 0 200 112" aria-hidden="true">
            <defs>
              <radialGradient id={`floor-${id}`} cx="50%" cy="100%" r="80%">
                <stop offset="0%" stopColor="var(--surface-3)" />
                <stop offset="100%" stopColor="var(--surface)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path
              d={`M ${CX - R_OUTER - 6} ${CY} A ${R_OUTER + 6} ${R_OUTER + 6} 0 0 1 ${CX + R_OUTER + 6} ${CY} Z`}
              fill={`url(#floor-${id})`}
            />
            {/* Speaker's dais and the well of the house */}
            <path d={`M ${CX - 24} ${CY} A 24 24 0 0 1 ${CX + 24} ${CY} Z`} className="hemi-well" />
            <rect x={CX - 7} y={CY - 9} width="14" height="7" rx="1.5" className="hemi-dais" />
            <g className="hemi-seats">
              {seats.map((seat, i) => {
                const bloc = owner[i]
                if (!bloc) return null
                const dim = focus !== null && bloc.id !== focus
                return (
                  <g key={i} opacity={dim ? 0.18 : 1}>
                    <circle cx={seat.x} cy={seat.y + seatR * 0.7} r={seatR} fill={bloc.color} />
                    <circle cx={seat.x} cy={seat.y + seatR * 0.7} r={seatR} fill="#000" opacity="0.38" />
                    <circle data-seat={i} cx={seat.x} cy={seat.y} r={seatR} fill={bloc.color} className="hemi-seat" />
                  </g>
                )
              })}
            </g>
            <line x1={lineIn.x} y1={lineIn.y} x2={lineOut.x} y2={lineOut.y} className="hemi-majority" />
          </svg>
        </div>
        <p className="hemi-badge" aria-hidden="true">
          {t('politics.seats.majority', { count: majority })}
        </p>
        {shown && (
          <p className="hemi-tip" aria-hidden="true">
            <span className="swatch" style={{ background: shown.color }} />
            <strong>{shown.label}</strong> {shown.seats} · {num((shown.seats / total) * 100, 0)}%
            {hover && <span className="hemi-tip-sub"> · {t('politics.hemi.seat', { seat: hover.seat, total })}</span>}
          </p>
        )}
        <p className="hemi-hint" aria-hidden="true">
          <Move3d aria-hidden="true" />
          {t('politics.hemi.drag')}
        </p>
      </div>
      {(
        <button
          type="button"
          className="hemi-reset"
          aria-label={t('politics.hemi.reset')}
          onClick={() => {
            setTilt(TILT.initial)
            setSpin(SPIN.initial)
          }}
        >
          <RotateCcw aria-hidden="true" />
          <span>{t('politics.hemi.resetShort')}</span>
        </button>
      )}
      </div>

      <ul className="strip-legend hemi-legend" aria-label={t('politics.hemi.highlight')}>
        {blocs.map((bloc) => (
          <li key={bloc.id}>
            <button
              type="button"
              className="hemi-bloc"
              aria-pressed={focus === bloc.id}
              onClick={() => setFocus((f) => (f === bloc.id ? null : bloc.id))}
              onMouseEnter={() => setHover(null)}
            >
              <span className="swatch" style={{ background: bloc.color }} aria-hidden="true" />
              <span>{bloc.label}</span>
              <strong className="num">
                {bloc.seats} · {num((bloc.seats / total) * 100, 0)}%
              </strong>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
