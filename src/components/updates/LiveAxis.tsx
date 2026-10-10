import { useEffect, useState } from 'react'
import { sortTime } from '../../domain/select'
import type { UpdateView } from '../../domain/types'
import { useI18n } from '../../i18n/i18n'
import { useNow } from '../common/hooks'
import { CATEGORY_ICON } from './LatestUpdates'

const MIN_WINDOW_H = 6
const MAX_WINDOW_H = 48

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

/**
 * Clock-driven time axis above the feed. The right edge is the current moment
 * (IST, ticking); each update sits at its real publish time, so the markers
 * drift left as time passes. Decorative: the list below carries the content.
 */
export function LiveAxis({ items, newIds }: { items: UpdateView[]; newIds: ReadonlySet<string> }) {
  const { t, time, lang } = useI18n()
  const snapshotNow = useNow()
  const clockNow = useClock()
  const now = clockNow ?? snapshotNow
  const nowMs = now.getTime()
  const dated = items.filter((i) => i.timeBasis !== 'unknown')
  const oldest = Math.min(nowMs - MIN_WINDOW_H * 3600_000, ...dated.map(sortTime))
  const windowMs = Math.min(MAX_WINDOW_H * 3600_000, nowMs - oldest)
  const start = nowMs - windowMs
  const pct = (ms: number) => Math.max(0, Math.min(100, ((ms - start) / windowMs) * 100))

  // Hour ticks on the hour, in IST.
  const ticks: number[] = []
  const stepH = windowMs > 24 * 3600_000 ? 6 : windowMs > 12 * 3600_000 ? 3 : 1
  const istOffset = 330 * 60_000
  const firstTick = Math.ceil((start + istOffset) / (stepH * 3600_000)) * stepH * 3600_000 - istOffset
  for (let ms = firstTick; ms < nowMs; ms += stepH * 3600_000) ticks.push(ms)

  const clock = clockNow === null ? '' : new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(now)

  return (
    <div className="live-axis" aria-hidden="true">
      <div className="live-axis-track">
        {ticks.map((ms) => (
          <span key={ms} className="live-tick" style={{ left: `${pct(ms)}%` }}>
            <span>{time(new Date(ms).toISOString()).replace(/ IST$/, '')}</span>
          </span>
        ))}
        {dated.map((item, index) => {
          const Icon = CATEGORY_ICON[item.category]
          return (
            <span
              key={item.id}
              className={`live-node ${item.kind === 'official' ? 'is-official' : ''} ${newIds.has(item.id) ? 'is-new' : ''}`}
              style={{ left: `${pct(sortTime(item))}%`, zIndex: 10 - index }}
              title={item.title}
            >
              <Icon />
            </span>
          )
        })}
        <span className="live-now">
          <span className="live-now-dot" />
          <span className="live-now-label">
            {t('status.live')} · {clock} IST
          </span>
        </span>
      </div>
    </div>
  )
}
