import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useStableId } from '../common/ui'

/*
 * Recharts' own JS animation is off everywhere: it hides value labels until a
 * requestAnimationFrame loop finishes, which never happens in background tabs.
 * Entrances are a CSS clip-path reveal on `.chart-body` instead (see app.css),
 * which also replays when a chart is re-keyed (tab/state switches) and is
 * disabled by prefers-reduced-motion.
 */

export interface TooltipLine {
  name: string
  value: string
  color: string
}

interface TooltipArgs<T> {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: T }>
}

/** Tooltip in text tokens; the series colour appears only as a swatch beside the text. */
function makeTooltip<T>(describe: (datum: T) => { title: string; lines: TooltipLine[] }) {
  return function ChartTooltip({ active, payload }: TooltipArgs<T>) {
    const datum = payload?.[0]?.payload
    if (!active || !datum) return null
    const { title, lines } = describe(datum)
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-title">{title}</p>
        <ul>
          {lines.map((line) => (
            <li key={line.name}>
              <span className="swatch" style={{ background: line.color }} aria-hidden="true" />
              {line.name}
              <strong>{line.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}

const AXIS_TICK = { fontSize: 12, fill: 'var(--ink-3)' }

/** Round tick values ("4.0, 4.5, 5.0") covering every value, with a little headroom. */
export function niceScale(values: number[], targetTicks = 4): { domain: [number, number]; ticks: number[] } {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || Math.abs(max) || 1
  const raw = span / Math.max(targetTicks - 1, 1)
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude
  const lo = Math.floor((min - span * 0.05) / step) * step
  const hi = Math.ceil((max + span * 0.05) / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v / step) * step)
  return { domain: [ticks[0]!, ticks.at(-1)!], ticks: ticks.map((t) => Number(t.toPrecision(10))) }
}

// ---------------------------------------------------------------------------

export interface ColumnDatum {
  key: string
  /** Short axis label. */
  tick: string
  /** Full label for the tooltip. */
  label: string
  value: number
  valueText: string
  projected?: boolean
}

/** Columns from a zero baseline, value on each cap; projections are hatched (texture, not just colour). */
export function ColumnPlot({
  data,
  color,
  seriesName,
  height,
  title,
  desc,
}: {
  data: ColumnDatum[]
  color: string
  seriesName: string
  height: number
  title: string
  desc: string
}) {
  const hatch = useStableId('hatch')
  const Content = makeTooltip<ColumnDatum>((d) => ({
    title: d.label,
    lines: [{ name: seriesName, value: d.valueText, color }],
  }))
  return (
    <BarChart
      responsive
      style={{ width: '100%', height }}
      data={data}
      margin={{ top: 22, right: 4, bottom: 0, left: 4 }}
      title={title}
      desc={desc}
    >
      <defs>
        <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill={color} fillOpacity={0.18} />
          <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="2.5" />
        </pattern>
      </defs>
      <XAxis
        dataKey="tick"
        tickLine={false}
        axisLine={{ stroke: 'var(--axis)' }}
        interval={0}
        tick={AXIS_TICK}
        tickMargin={8}
      />
      <YAxis hide domain={[0, (max: number) => max * 1.12]} />
      <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<Content />} isAnimationActive={false} />
      <Bar dataKey="value" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
        {data.map((d) => (
          <Cell key={d.key} fill={d.projected ? `url(#${hatch})` : color} />
        ))}
        <LabelList dataKey="valueText" position="top" className="value-label" offset={6} />
      </Bar>
    </BarChart>
  )
}

// ---------------------------------------------------------------------------

export interface LineSeries {
  dataKey: string
  name: string
  color: string
}

export interface LineDatum {
  key: string
  tick: string
  label: string
  [series: string]: number | string
}

export interface Reference {
  y: number
  label: string
}

/** 2px lines, ringed markers, the last value labelled; reference lines are always inside the domain. */
export function LinePlot({
  data,
  series,
  format,
  references = [],
  height,
  title,
  desc,
  yTickFormat,
}: {
  data: LineDatum[]
  series: LineSeries[]
  format: (value: number) => string
  references?: Reference[]
  height: number
  title: string
  desc: string
  yTickFormat?: (value: number) => string
}) {
  const last = data.length - 1
  const values = data.flatMap((d) => series.map((s) => Number(d[s.dataKey]))).filter(Number.isFinite)
  const scale = niceScale([...values, ...references.map((r) => r.y)])
  const Content = makeTooltip<LineDatum>((d) => ({
    title: d.label,
    lines: series.map((s) => ({ name: s.name, value: format(Number(d[s.dataKey])), color: s.color })),
  }))
  return (
    <LineChart
      responsive
      style={{ width: '100%', height }}
      data={data}
      margin={{ top: 14, right: series.length > 1 ? 76 : 52, bottom: 0, left: 0 }}
      title={title}
      desc={desc}
    >
      <CartesianGrid vertical={false} stroke="var(--grid)" />
      <XAxis
        dataKey="tick"
        tickLine={false}
        axisLine={{ stroke: 'var(--axis)' }}
        tick={AXIS_TICK}
        tickMargin={8}
        minTickGap={12}
        padding={{ left: 12, right: 12 }}
      />
      <YAxis
        width={44}
        tickLine={false}
        axisLine={false}
        tick={AXIS_TICK}
        domain={scale.domain}
        ticks={scale.ticks}
        tickFormatter={yTickFormat ?? format}
      />
      <Tooltip cursor={{ stroke: 'var(--axis)' }} content={<Content />} isAnimationActive={false} />
      {references.map((ref) => (
        <ReferenceLine
          key={ref.label}
          y={ref.y}
          stroke="var(--ink-3)"
          strokeWidth={1}
          label={{ value: ref.label, position: 'insideTopRight', className: 'ref-label', offset: 6 }}
        />
      ))}
      {series.map((s) => (
        <Line
          key={s.dataKey}
          type="linear"
          dataKey={s.dataKey}
          name={s.name}
          stroke={s.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={{ r: 4, fill: s.color, stroke: 'var(--surface)', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: s.color, stroke: 'var(--surface)', strokeWidth: 2 }}
          isAnimationActive={false}
        >
          <LabelList
            dataKey={s.dataKey}
            content={(props) => {
              const { x, y, index, value } = props as { x?: number; y?: number; index?: number; value?: number }
              if (index !== last || x == null || y == null || typeof value !== 'number') return null
              return (
                <text x={x + 10} y={y + 4} className="value-label">
                  {series.length > 1 ? `${s.name} ${format(value)}` : format(value)}
                </text>
              )
            }}
          />
        </Line>
      ))}
    </LineChart>
  )
}

// ---------------------------------------------------------------------------

export interface HBarDatum {
  key: string
  label: string
  [series: string]: number | string | null
}

/** Horizontal bars with category labels on the axis; optional vertical marker (e.g. majority). */
export function HBarPlot({
  data,
  series,
  format,
  marker,
  title,
  desc,
  domainMax,
}: {
  data: HBarDatum[]
  series: LineSeries[]
  format: (value: number) => string
  marker?: { x: number; label: string }
  title: string
  desc: string
  domainMax?: number
}) {
  const rowHeight = series.length > 1 ? 44 : 32
  const height = data.length * rowHeight + 36
  const Content = makeTooltip<HBarDatum>((d) => ({
    title: d.label,
    lines: series.map((s) => ({
      name: s.name,
      value: typeof d[s.dataKey] === 'number' ? format(d[s.dataKey] as number) : '—',
      color: s.color,
    })),
  }))
  return (
    <BarChart
      responsive
      layout="vertical"
      style={{ width: '100%', height }}
      data={data}
      margin={{ top: marker ? 22 : 4, right: 48, bottom: 0, left: 0 }}
      barGap={2}
      title={title}
      desc={desc}
    >
      <XAxis type="number" hide domain={[0, domainMax ?? 'dataMax']} />
      <YAxis
        type="category"
        dataKey="label"
        width={108}
        tickLine={false}
        axisLine={{ stroke: 'var(--axis)' }}
        tick={{ ...AXIS_TICK, fill: 'var(--ink-2)' }}
        interval={0}
      />
      <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<Content />} isAnimationActive={false} />
      {marker && (
        <ReferenceLine
          x={marker.x}
          stroke="var(--ink)"
          strokeWidth={1.5}
          ifOverflow="extendDomain"
          label={{ value: marker.label, position: 'top', className: 'ref-label', offset: 8 }}
        />
      )}
      {series.map((s) => (
        <Bar
          key={s.dataKey}
          dataKey={s.dataKey}
          name={s.name}
          fill={s.color}
          maxBarSize={series.length > 1 ? 14 : 20}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey={s.dataKey}
            position="right"
            className="value-label"
            formatter={(value: unknown) => (typeof value === 'number' ? format(value) : '')}
          />
        </Bar>
      ))}
    </BarChart>
  )
}
