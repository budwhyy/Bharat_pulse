import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { sortTime } from '../../domain/select'
import type { UpdateView } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'
import { useNow } from '../common/hooks'
import { CATEGORY_ICON } from './LatestUpdates'

const MIN_WINDOW_H = 6
const MAX_WINDOW_H = 48
const NODE = 26
const LANE = 30
const MAX_LANES = 3
const EDGE = 16

/** Ticks every second after mount; before that the snapshot's time is used so server and client match. */
function useClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(() => setWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

/**
 * Clock-driven axis above the feed. "Now" is the right edge (IST, ticking) and
 * each update sits at its real publish time, so markers drift left as time
 * passes. Markers that would collide stack into lanes above the line. Hovering
 * a marker highlights its story below, and the reverse. Decorative for
 * assistive tech: the list carries the same content.
 */
export function LiveAxis({
  items,
  newIds,
  activeId,
  onActivate,
  onSelect,
}: {
  items: UpdateView[]
  newIds: ReadonlySet<string>
  activeId: string | null
  onActivate: (id: string | null) => void
  onSelect: (id: string) => void
}) {
  const { t, time, lang, pick } = useI18n()
  const snapshotNow = useNow()
  const clockNow = useClock()
  const now = clockNow ?? snapshotNow
  const nowMs = now.getTime()
  const [trackRef, width] = useWidth<HTMLDivElement>()

  const dated = items.filter((i) => i.timeBasis !== 'unknown')
  const oldest = Math.min(nowMs - MIN_WINDOW_H * 3600_000, ...dated.map(sortTime))
  const windowMs = Math.min(MAX_WINDOW_H * 3600_000, nowMs - oldest)
  const start = nowMs - windowMs
  const span = Math.max(width - EDGE * 2, 1)
  const xOf = (ms: number) => EDGE + Math.max(0, Math.min(1, (ms - start) / windowMs)) * span

  // Lane assignment, oldest first: the lowest lane whose last marker is far enough left.
  const placed = [...dated]
    .sort((a, b) => sortTime(a) - sortTime(b))
    .reduce<{ item: UpdateView; x: number; lane: number }[]>((acc, item) => {
      const x = xOf(sortTime(item))
      let lane = 0
      while (lane < MAX_LANES - 1 && acc.some((p) => p.lane === lane && x - p.x < NODE + 4)) lane++
      acc.push({ item, x, lane })
      return acc
    }, [])
  const lanes = Math.max(1, ...placed.map((p) => p.lane + 1))
  const newestX = placed.length ? Math.max(...placed.map((p) => p.x)) : EDGE

  // Hour ticks on the hour (IST); labels thin out to avoid touching each other or "now".
  const stepH = windowMs > 24 * 3600_000 ? 6 : windowMs > 12 * 3600_000 ? 3 : 1
  const istOffset = 330 * 60_000
  const firstTick = Math.ceil((start + istOffset) / (stepH * 3600_000)) * stepH * 3600_000 - istOffset
  const ticks: { ms: number; x: number; label: boolean }[] = []
  let lastLabelX = -Infinity
  for (let ms = firstTick; ms < nowMs; ms += stepH * 3600_000) {
    const x = xOf(ms)
    const label = x - lastLabelX > 64 && x < EDGE + span - 48
    if (label) lastLabelX = x
    ticks.push({ ms, x, label })
  }

  const clock =
    clockNow === null
      ? ''
      : new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Kolkata',
        }).format(now)
  const hours = Math.round(windowMs / 3600_000)
  const active = placed.find((p) => p.item.id === activeId)

  return (
    <div className="live-axis" aria-hidden="true">
      <div className="live-axis-head">
        <span>{t('updates.axis.window', { hours })}</span>
        <span className="live-clock">
          <span className="live-clock-dot" />
          {t('status.live')}
          {clock && <span className="num"> · {clock} IST</span>}
        </span>
      </div>
      <div ref={trackRef} className="live-track" style={{ height: lanes * LANE + 40 }}>
        {width > 0 && (
          <>
            <span className="live-line" style={{ left: EDGE, width: span }} />
            <span className="live-flow" style={{ left: newestX, width: Math.max(0, EDGE + span - newestX) }} />
            {ticks.map((tick) => (
              <span key={tick.ms} className="live-tick" style={{ left: tick.x }}>
                {tick.label && <span>{time(new Date(tick.ms).toISOString()).replace(/ IST$/, '')}</span>}
              </span>
            ))}
            {placed.map(({ item, x, lane }) => {
              const Icon = CATEGORY_ICON[item.category]
              const isActive = item.id === activeId
              return (
                <button
                  key={item.id}
                  type="button"
                  tabIndex={-1}
                  className={`live-node ${item.kind === 'official' ? 'is-official' : ''} ${newIds.has(item.id) ? 'is-new' : ''} ${isActive ? 'is-active' : ''}`}
                  style={{ left: x, bottom: 30 + lane * LANE, ['--stem' as string]: `${lane * LANE + 8}px` }}
                  onMouseEnter={() => onActivate(item.id)}
                  onMouseLeave={() => onActivate(null)}
                  onClick={() => onSelect(item.id)}
                >
                  <Icon />
                </button>
              )
            })}
            <span className="live-now" style={{ left: EDGE + span }}>
              <span className="live-now-dot" />
            </span>
            {active && (
              <span
                className={`live-tip ${active.x > width * 0.6 ? 'is-left' : active.x < width * 0.25 ? 'is-right' : ''}`}
                style={{ left: active.x, bottom: 30 + active.lane * LANE + NODE + 6 }}
              >
                <strong>{time(new Date(sortTime(active.item)).toISOString())}</strong> {pick(active.item.sourceName)}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
